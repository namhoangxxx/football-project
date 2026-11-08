import os
import requests
import time
from datetime import datetime, timedelta
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://pgwrrhvijrjcszihswnm.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_secret_Ev9Fpxq-vhV_ntr5Z5VE0A_7XldegTm")
FOOTBALL_API_KEY = os.environ.get("FOOTBALL_API_KEY", "35d5e00fd47d4770895bcf02b6e76d0b")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

ALLOWED_COMPETITIONS = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL', 'EL', 'ECL']

def sync_football_data():
    competitions_param = ",".join(ALLOWED_COMPETITIONS)
    headers = { 'X-Auth-Token': FOOTBALL_API_KEY }

    # Chia nhỏ 40 ngày thành 4 khoảng (mỗi khoảng 9 ngày để an toàn tuyệt đối với API limit 10 days)
    # Khoảng 1: -30 ngày đến -21 ngày
    # Khoảng 2: -20 ngày đến -11 ngày
    # Khoảng 3: -10 ngày đến -1 ngày
    # Khoảng 4: 0 ngày đến +9 ngày
    date_ranges = [
        (datetime.now() - timedelta(days=30), datetime.now() - timedelta(days=21)),
        (datetime.now() - timedelta(days=20), datetime.now() - timedelta(days=11)),
        (datetime.now() - timedelta(days=10), datetime.now() - timedelta(days=1)),
        (datetime.now(), datetime.now() + timedelta(days=9)),
    ]

    all_records = []

    for start_date, end_date in date_ranges:
        date_from = start_date.strftime('%Y-%m-%d')
        date_to = end_date.strftime('%Y-%m-%d')
        
        url = f"https://api.football-data.org/v4/matches?competitions={competitions_param}&dateFrom={date_from}&dateTo={date_to}"
        print(f"⏳ Đang lấy dữ liệu từ {date_from} đến {date_to}...")

        try:
            response = requests.get(url, headers=headers)
            if response.status_code != 200:
                print(f"❌ Lỗi API (Status {response.status_code}): {response.text}")
                continue

            data = response.json()
            matches = data.get('matches', [])
            print(f"  └─ Tìm thấy {len(matches)} trận.")

            for match in matches:
                match_id = str(match['id'])
                status = match['status']
                score_full = match.get('score', {}).get('fullTime', {})
                
                record = {
                    'event_id': match_id,
                    'home_team': match['homeTeam'].get('shortName') or match['homeTeam'].get('name', ''),
                    'away_team': match['awayTeam'].get('shortName') or match['awayTeam'].get('name', ''),
                    'home_team_id': match['homeTeam'].get('id'),
                    'away_team_id': match['awayTeam'].get('id'),
                    'status': status,
                    'league': match['competition'].get('name', ''),
                    'home_score': score_full.get('home'),
                    'away_score': score_full.get('away'),
                    'match_time': match['utcDate'],
                    'home_icon': match['homeTeam'].get('crest'),
                    'away_icon': match['awayTeam'].get('crest'),
                }
                all_records.append(record)

            # Nghỉ 1.5 giây giữa các request để không bị dính API rate limit (10 requests/phút)
            time.sleep(1.5)

        except Exception as e:
            print(f"⚠️ Lỗi khoảng {date_from} -> {date_to}: {e}")

    # Upsert tất cả các trận vào Supabase
    if all_records:
        print(f"🚀 Đang đẩy tổng cộng {len(all_records)} trận đấu lên Supabase...")
        supabase.table('matches').upsert(all_records, on_conflict='event_id').execute()
        print("🎉 ĐỒNG BỘ HOÀN TẤT THÀNH CÔNG!")
    else:
        print("ℹ️ Không có dữ liệu để lưu.")

if __name__ == "__main__":
    sync_football_data()