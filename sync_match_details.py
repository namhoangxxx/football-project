import os
import requests
import time
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()
API_FOOTBALL_KEY = os.environ.get("API_FOOTBALL_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_KEY or not API_FOOTBALL_KEY:
    raise ValueError("Thiếu biến môi trường SUPABASE_URL, SUPABASE_KEY hoặc API_FOOTBALL_KEY!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
headers_af = {'x-apisports-key': API_FOOTBALL_KEY}

def fetch_api_football(url: str):
    try:
        res = requests.get(url, headers=headers_af, timeout=10)
        if res.status_code == 200:
            data = res.json()
            if data.get('errors') and ('rateLimit' in data['errors'] or 'requests' in str(data['errors'])):
                print("  ⏳ Dính Rate Limit API-Football! Dừng phiên sync để bảo toàn quota.")
                return "RATE_LIMIT"
            return data.get('response', [])
        elif res.status_code == 429:
            print("  ⏳ Dính HTTP 429! Dừng phiên sync.")
            return "RATE_LIMIT"
    except Exception as e:
        print(f"  ⚠️ Lỗi kết nối API: {e}")
    return None

def get_api_team_id(fd_team_id: int):
    try:
        res = supabase.table('team_map').select('api_football_id').eq('football_data_id', fd_team_id).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]['api_football_id']
    except Exception as e:
        print(f"⚠️ Lỗi lookup team_map cho team {fd_team_id}: {e}")
    return None

def sync_match_details():
    print("🚀 [START] Bắt đầu quét các trận đấu đã FINISHED trên Supabase...")

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
        match_time = m['match_time']

        print(f"[{idx}/{len(matches)}] Trận: {home_name} vs {away_name} (ID: {event_id})")

        cache_stats = supabase.table('match_details').select('event_id').eq('event_id', event_id).execute()
        cache_events = supabase.table('match_events').select('event_id').eq('event_id', event_id).execute()
        cache_lineups = supabase.table('match_lineups').select('event_id').eq('event_id', event_id).execute()

        has_stats = len(cache_stats.data) > 0
        has_events = len(cache_events.data) > 0
        has_lineups = len(cache_lineups.data) > 0

        if has_stats and has_events and has_lineups:
            print("  ⚡ Đã có đủ Cache (Stats + Events + Lineups) -> Bỏ qua!")
            continue

        af_home_id = get_api_team_id(home_fd_id)
        if not af_home_id:
            print(f"  ❌ Đội {home_name} (FD ID: {home_fd_id}) chưa có trong team_map -> Bỏ qua!")
            continue

        date_str = match_time.split('T')[0] if 'T' in match_time else match_time[:10]

        fixture_url = f"https://v3.football.api-sports.io/fixtures?team={af_home_id}&date={date_str}"
        fixtures = fetch_api_football(fixture_url)
        if fixtures == "RATE_LIMIT":
            break
        time.sleep(2)

        if not fixtures:
            print(f"  ❌ Không tìm thấy fixture tương ứng trên API-Football ngày {date_str}")
            continue

        fixture_id = fixtures[0]['fixture']['id']
        print(f"  🎯 Tìm thấy Fixture ID: {fixture_id}")

        if not has_stats:
            stats_data = fetch_api_football(f"https://v3.football.api-sports.io/fixtures/statistics?fixture={fixture_id}")
            if stats_data == "RATE_LIMIT":
                break
            if stats_data and len(stats_data) >= 2:
                is_first_home = stats_data[0]['team']['id'] == af_home_id
                home_obj = stats_data[0] if is_first_home else stats_data[1]
                away_obj = stats_data[1] if is_first_home else stats_data[0]

                team1_stats = {s['type']: s['value'] for s in home_obj['statistics']}
                team2_stats = {s['type']: s['value'] for s in away_obj['statistics']}

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

        if not has_events:
            events_data = fetch_api_football(f"https://v3.football.api-sports.io/fixtures/events?fixture={fixture_id}")
            if events_data == "RATE_LIMIT":
                break
            if events_data is not None:
                supabase.table('match_events').upsert([{
                    'event_id': event_id,
                    'events': events_data
                }], on_conflict='event_id').execute()
                print(f"  ✅ [Saved] Events ({len(events_data)} sự kiện)")
            time.sleep(2)

        if not has_lineups:
            lineups_data = fetch_api_football(f"https://v3.football.api-sports.io/fixtures/lineups?fixture={fixture_id}")
            if lineups_data == "RATE_LIMIT":
                break
            if lineups_data is not None:
                supabase.table('match_lineups').upsert([{
                    'event_id': event_id,
                    'lineups': lineups_data
                }], on_conflict='event_id').execute()
                print("  ✅ [Saved] Lineups (Sơ đồ & Đội hình 2 đội)")
            time.sleep(2)

        synced_count += 1
        time.sleep(4)

    print(f"\n🎉 [COMPLETE] Đã hoàn thành sync chi tiết cho {synced_count} trận đấu!")

if __name__ == "__main__":
    sync_match_details()