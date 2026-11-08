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
    # Lấy dữ liệu từ 7 ngày trước đến 7 ngày tới
    date_from = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
    date_to = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
    competitions_param = ",".join(ALLOWED_COMPETITIONS)
    
    url = f"https://api.football-data.org/v4/matches?competitions={competitions_param}&dateFrom={date_from}&dateTo={date_to}"
    headers = { 'X-Auth-Token': FOOTBALL_API_KEY }

    print(f"⏳ Đang tải dữ liệu từ {date_from} đến {date_to}...")

    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"❌ Lỗi API football-data.org (Status {response.status_code}):\n{response.text}")
            return

        data = response.json()
        matches = data.get('matches', [])
        print(f"✅ Tìm thấy {len(matches)} trận đấu!")

        if not matches:
            print("ℹ️ Không có trận đấu nào.")
            return

        records_to_upsert = []
        for match in matches:
            match_id = str(match['id'])
            status = match['status']
            
            score_full = match.get('score', {}).get('fullTime', {})
            home_score = score_full.get('home')
            away_score = score_full.get('away')

            record = {
                'event_id': match_id,
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
            }

            records_to_upsert.append(record)

        if records_to_upsert:
            supabase.table('matches').upsert(records_to_upsert, on_conflict='event_id').execute()
            print(f"🎉 Lưu thành công {len(records_to_upsert)} trận vào Supabase!")

    except Exception as e:
        print(f"⚠️ Lỗi trong quá trình đồng bộ: {e}")

if __name__ == "__main__":
    sync_football_data()