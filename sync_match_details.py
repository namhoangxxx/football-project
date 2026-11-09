import os
import requests
import time
from datetime import datetime
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://pgwrrhvijrjcszihswnm.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_secret_Ev9Fpxq-vhV_ntr5Z5VE0A_7XldegTm")
API_FOOTBALL_KEY = "f8640e0e945a8b02c168ea70013f9d2f"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
headers_af = {'x-apisports-key': API_FOOTBALL_KEY}

def fetch_api_football(url: str):
    """ Hàm fetch API-Football an toàn với cơ chế xử lý Rate Limit """
    try:
        res = requests.get(url, headers=headers_af, timeout=10)
        if res.status_code == 200:
            data = res.json()
            if data.get('errors') and ('rateLimit' in data['errors'] or 'requests' in str(data['errors'])):
                print("  ⏳ Dính Rate Limit API-Football! Đang tạm dừng 20 giây...")
                time.sleep(20)
                return None
            return data.get('response', [])
        elif res.status_code == 429:
            print("  ⏳ Dính HTTP 429! Tạm dừng 20s...")
            time.sleep(20)
    except Exception as e:
        print(f"  ⚠️ Lỗi kết nối API: {e}")
    return None

def get_api_team_id(fd_team_id: int) -> int:
    """ Tra cứu API-Football ID từ bảng team_map theo football_data_id """
    try:
        res = supabase.table('team_map').select('api_football_id').eq('football_data_id', fd_team_id).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]['api_football_id']
    except Exception as e:
        print(f"⚠️ Lỗi lookup team_map cho team {fd_team_id}: {e}")
    return None

def sync_match_details():
    print("🚀 [START] Bắt đầu quét các trận đấu đã FINISHED trên Supabase...")

    # 1. Lấy danh sách các trận đã FINISHED chưa có hoặc thiếu cache
    # Ưu tiên lấy 20 trận kết thúc gần nhất
    matches_res = supabase.table('matches') \
        .select('event_id, home_team, away_team, home_team_id, match_time, status') \
        .eq('status', 'FINISHED') \
        .order('match_time', desc=True) \
        .limit(20) \
        .execute()

    matches = matches_res.data or []
    print(f"📋 Tìm thấy {len(matches)} trận đấu đã kết thúc gần đây.\n")

    synced_count = 0

    for idx, m in enumerate(matches, start=1):
        event_id = str(m['event_id'])
        home_name = m['home_team']
        away_name = m['away_team']
        home_fd_id = m['home_team_id']
        match_time = m['match_time'] # Định dạng ISO / Date

        print(f"[{idx}/{len(matches)}] Trận: {home_name} vs {away_name} (ID: {event_id})")

        # 2. Kiểm tra xem trận này đã đủ Cache trên DB chưa
        cache_stats = supabase.table('match_details').select('event_id').eq('event_id', event_id).execute()
        cache_events = supabase.table('match_events').select('event_id').eq('event_id', event_id).execute()
        cache_lineups = supabase.table('match_lineups').select('event_id').eq('event_id', event_id).execute()

        has_stats = len(cache_stats.data) > 0
        has_events = len(cache_events.data) > 0
        has_lineups = len(cache_lineups.data) > 0

        if has_stats and has_events and has_lineups:
            print("  ⚡ Đã có đủ Cache (Stats + Events + Lineups) -> Bỏ qua!")
            continue

        # 3. Lấy API-Football ID của đội nhà
        af_home_id = get_api_team_id(home_fd_id)
        if not af_home_id:
            print(f"  ❌ Đội {home_name} (FD ID: {home_fd_id}) chưa có trong team_map -> Bỏ qua!")
            continue

        # Đổi ngày về dạng YYYY-MM-DD
        date_str = match_time.split('T')[0] if 'T' in match_time else match_time[:10]

        # 4. Tìm Fixture ID bên API-Football
        fixture_url = f"https://v3.football.api-sports.io/fixtures?team={af_home_id}&date={date_str}"
        fixtures = fetch_api_football(fixture_url)
        time.sleep(2)

        if not fixtures:
            print(f"  ❌ Không tìm thấy fixture tương ứng trên API-Football ngày {date_str}")
            continue

        fixture_id = fixtures[0]['fixture']['id']
        print(f"  🎯 Tìm thấy Fixture ID: {fixture_id}")

        # 5. Fetch & Save MATCH STATS
        if not has_stats:
            stats_data = fetch_api_football(f"https://v3.football.api-sports.io/fixtures/statistics?fixture={fixture_id}")
            if stats_data and len(stats_data) >= 2:
                team1_stats = {s['type']: s['value'] for s in stats_data[0]['statistics']}
                team2_stats = {s['type']: s['value'] for s in stats_data[1]['statistics']}

                def parse_val(val):
                    if val is None: return 0
                    if isinstance(val, str) and '%' in val: return int(val.replace('%', ''))
                    return int(val)

                payload_stats = {
                    'event_id': event_id,
                    'home_possession': parse_val(team1_stats.get('Ball Possession', 0)),
                    'away_possession': parse_val(team2_stats.get('Ball Possession', 0)),
                    'home_shots': parse_val(team1_stats.get('Total Shots', 0)),
                    'away_shots': parse_val(team2_stats.get('Total Shots', 0)),
                    'home_shots_on_target': parse_val(team1_stats.get('Shots on Goal', 0)),
                    'away_shots_on_target': parse_val(team2_stats.get('Shots on Goal', 0)),
                    'home_corners': parse_val(team1_stats.get('Corner Kicks', 0)),
                    'away_corners': parse_val(team2_stats.get('Corner Kicks', 0)),
                    'home_fouls': parse_val(team1_stats.get('Fouls', 0)),
                    'away_fouls': parse_val(team2_stats.get('Fouls', 0)),
                }
                supabase.table('match_details').upsert([payload_stats], on_conflict='event_id').execute()
                print("  ✅ [Saved] Match Stats")
            time.sleep(2)

        # 6. Fetch & Save MATCH EVENTS (Bàn thắng, thẻ phạt, thay người)
        if not has_events:
            events_data = fetch_api_football(f"https://v3.football.api-sports.io/fixtures/events?fixture={fixture_id}")
            if events_data is not None:
                supabase.table('match_events').upsert([{
                    'event_id': event_id,
                    'events': events_data
                }], on_conflict='event_id').execute()
                print(f"  ✅ [Saved] Events ({len(events_data)} sự kiện)")
            time.sleep(2)

        # 7. Fetch & Save MATCH LINEUPS (Đội hình ra sân)
        if not has_lineups:
            lineups_data = fetch_api_football(f"https://v3.football.api-sports.io/fixtures/lineups?fixture={fixture_id}")
            if lineups_data is not None:
                supabase.table('match_lineups').upsert([{
                    'event_id': event_id,
                    'lineups': lineups_data
                }], on_conflict='event_id').execute()
                print("  ✅ [Saved] Lineups (Sơ đồ & Đội hình 2 đội)")
            time.sleep(2)

        synced_count += 1
        # Giữ delay để tránh quá 10 req/phút
        time.sleep(4)

    print(f"\n🎉 [COMPLETE] Đã hoàn thành sync chi tiết cho {synced_count} trận đấu!")

if __name__ == "__main__":
    sync_match_details()