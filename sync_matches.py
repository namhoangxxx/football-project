import os
import requests
import time
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()
FOOTBALL_API_KEY = os.environ.get("FOOTBALL_API_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_KEY or not FOOTBALL_API_KEY:
    raise ValueError("Thiếu biến môi trường SUPABASE_URL, SUPABASE_KEY hoặc FOOTBALL_API_KEY!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
ALLOWED_COMPETITIONS = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL', 'EL', 'ECL']

def sync_football_data():
    competitions_param = ",".join(ALLOWED_COMPETITIONS)
    headers = {'X-Auth-Token': FOOTBALL_API_KEY}

    now_utc = datetime.now(timezone.utc)
    date_ranges = [
        (now_utc - timedelta(days=15), now_utc - timedelta(days=7)),
        (now_utc - timedelta(days=6), now_utc + timedelta(days=1)),
        (now_utc + timedelta(days=2), now_utc + timedelta(days=9)),
    ]

    all_records = []

    for start_date, end_date in date_ranges:
        date_from = start_date.strftime('%Y-%m-%d')
        date_to = end_date.strftime('%Y-%m-%d')
        
        url = f"https://api.football-data.org/v4/matches?competitions={competitions_param}&dateFrom={date_from}&dateTo={date_to}"
        print(f"⏳ Đang sync dữ liệu từ {date_from} đến {date_to}...")

        try:
            response = requests.get(url, headers=headers)
            if response.status_code != 200:
                print(f"❌ Lỗi API ({response.status_code}): {response.text}")
                continue

            matches = response.json().get('matches', [])
            print(f"  └─ Tìm thấy {len(matches)} trận.")

            for match in matches:
                status = match.get('status', 'TIMED')
                score_obj = match.get('score', {})
                full_time = score_obj.get('fullTime', {})
                reg_time = score_obj.get('regularTime', {})
                
                home_score = full_time.get('home') if full_time.get('home') is not None else reg_time.get('home')
                away_score = full_time.get('away') if full_time.get('away') is not None else reg_time.get('away')

                all_records.append({
                    'event_id': str(match['id']),
                    'home_team': match['homeTeam'].get('shortName') or match['homeTeam'].get('name', ''),
                    'away_team': match['awayTeam'].get('shortName') or match['awayTeam'].get('name', ''),
                    'home_team_id': match['homeTeam'].get('id'),
                    'away_team_id': match['awayTeam'].get('id'),
                    'status': status,
                    'league': match['competition'].get('name', ''),
                    'home_score': home_score,
                    'away_score': away_score,
                    'match_time': match['utcDate'],
                    'home_icon': match['homeTeam'].get('crest'),
                    'away_icon': match['awayTeam'].get('crest'),
                })

            time.sleep(1.2)
        except Exception as e:
            print(f"⚠️ Lỗi khoảng {date_from} -> {date_to}: {e}")

    if all_records:
        print(f"🚀 Đã cập nhật ghi đè {len(all_records)} trận đấu vào Supabase...")
        supabase.table('matches').upsert(all_records, on_conflict='event_id').execute()
        print("🎉 ĐỒNG BỘ THÀNH CÔNG!")

if __name__ == "__main__":
    sync_football_data()