import os
import requests
from datetime import datetime, timedelta
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://pgwrrhvijrjcszihswnm.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_secret_Ev9Fpxq-vhV_ntr5Z5VE0A_7XldegTm")
FOOTBALL_API_KEY = os.environ.get("FOOTBALL_API_KEY", "35d5e00fd47d4770895bcf02b6e76d0b")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

ALLOWED_COMPETITIONS = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL', 'EL', 'ECL']

def sync_football_data():
    date_from = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    date_to = (datetime.now() + timedelta(days=8)).strftime('%Y-%m-%d')
    competitions_param = ",".join(ALLOWED_COMPETITIONS)
    
    url = f"https://api.football-data.org/v4/matches?competitions={competitions_param}&dateFrom={date_from}&dateTo={date_to}"
    headers = { 'X-Auth-Token': FOOTBALL_API_KEY }

    print(f"⏳ Đang lọc trận đấu từ {date_from} đến {date_to}...")

    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"❌ Lỗi API: {response.status_code}\n{response.text}")
            return

        data = response.json()
        matches = data.get('matches', [])
        print(f"✅ Tìm thấy {len(matches)} trận đấu!")

        if not matches:
            print("ℹ️ Không có trận đấu nào trong khoảng thời gian này.")
            return

        records_to_upsert = []
        for match in matches:
            match_id = str(match['id'])
            status = match['status']
            
            record = {
                'event_id': match_id,
                'home_team': match['homeTeam'].get('shortName') or match['homeTeam'].get('name', ''),
                'away_team': match['awayTeam'].get('shortName') or match['awayTeam'].get('name', ''),
                # BỔ SUNG: Trích xuất ID chính xác từ API bóng đá
                'home_team_id': match['homeTeam'].get('id'),
                'away_team_id': match['awayTeam'].get('id'),
                'status': status,
                'league': match['competition'].get('name', ''),
                'home_score': match['score']['fullTime']['home'],
                'away_score': match['score']['fullTime']['away'],
                'match_time': match['utcDate'],
                'home_icon': match['homeTeam'].get('crest'),
                'away_icon': match['awayTeam'].get('crest'),
            }

            # Nếu trận đang đá hoặc đã kết thúc ➔ Gọi API lấy thông số chi tiết
            if status in ['IN_PLAY', 'PAUSED', 'FINISHED']:
                try:
                    detail_url = f"https://api.football-data.org/v4/matches/{match_id}"
                    detail_res = requests.get(detail_url, headers=headers)
                    if detail_res.status_code == 200:
                        detail_data = detail_res.json()
                        stats = detail_data.get('stats', {})

                        record.update({
                            'home_possession': stats.get('possession', {}).get('home'),
                            'away_possession': stats.get('possession', {}).get('away'),
                            'home_shots': stats.get('shots', {}).get('home'),
                            'away_shots': stats.get('shots', {}).get('away'),
                            'home_shots_on_target': stats.get('shotsOnTarget', {}).get('home'),
                            'away_shots_on_target': stats.get('shotsOnTarget', {}).get('away'),
                            'home_corners': stats.get('corners', {}).get('home'),
                            'away_corners': stats.get('corners', {}).get('away'),
                            'home_fouls': stats.get('fouls', {}).get('home'),
                            'away_fouls': stats.get('fouls', {}).get('away'),
                        })
                except Exception as err:
                    print(f"⚠️ Chưa lấy được stats cho trận {match_id}: {err}")

            records_to_upsert.append(record)

        # Upsert dữ liệu vào Supabase
        supabase.table('matches').upsert(records_to_upsert, on_conflict='event_id').execute()
        print(f"🎉 Hoàn tất lưu {len(records_to_upsert)} trận đấu vào Supabase!")

    except Exception as e:
        print(f"⚠️ Lỗi xử lý dữ liệu: {e}")

if __name__ == "__main__":
    sync_football_data()