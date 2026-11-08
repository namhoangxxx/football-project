import os
import requests
from datetime import datetime, timedelta
from supabase import create_client, Client

# Cấu hình biến môi trường
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://pgwrrhvijrjcszihswnm.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_secret_Ev9Fpxq-vhV_ntr5Z5VE0A_7XldegTm")
FOOTBALL_API_KEY = os.environ.get("FOOTBALL_API_KEY", "35d5e00fd47d4770895bcf02b6e76d0b")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Danh sách 8 giải đấu quan tâm
ALLOWED_COMPETITIONS = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL', 'EL', 'ECL']

def sync_football_data():
    # Lấy dữ liệu từ 14 ngày trước đến 10 ngày tới (đảm bảo cập nhật cả trận đã đá lẫn sắp đá)
    date_from = (datetime.now() - timedelta(days=14)).strftime('%Y-%m-%d')
    date_to = (datetime.now() + timedelta(days=10)).strftime('%Y-%m-%d')
    competitions_param = ",".join(ALLOWED_COMPETITIONS)
    
    url = f"https://api.football-data.org/v4/matches?competitions={competitions_param}&dateFrom={date_from}&dateTo={date_to}"
    headers = { 'X-Auth-Token': FOOTBALL_API_KEY }

    print(f"⏳ Đang tải dữ liệu trận đấu từ {date_from} đến {date_to}...")

    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"❌ Lỗi API football-data.org (Status {response.status_code}):\n{response.text}")
            return

        data = response.json()
        matches = data.get('matches', [])
        print(f"✅ Tìm thấy tổng cộng {len(matches)} trận đấu!")

        if not matches:
            print("ℹ️ Không tìm thấy trận đấu nào trong khoảng thời gian này.")
            return

        records_to_upsert = []
        for match in matches:
            match_id = str(match['id'])
            status = match['status']
            
            # Lấy thông tin tỷ số fullTime
            score_full = match.get('score', {}).get('fullTime', {})
            home_score = score_full.get('home')
            away_score = score_full.get('away')

            record = {
                'event_id': match_id,
                'home_team': match['homeTeam'].get('shortName') or match['homeTeam'].get('name', ''),
                'away_team': match['awayTeam'].get('shortName') or match['awayTeam'].get('name', ''),
                # Lưu ID số của hai đội bóng để đồng bộ màn hình Chi tiết CLB
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

        # Ghi đè / Cập nhật vào bảng 'matches' của Supabase
        if records_to_upsert:
            supabase.table('matches').upsert(records_to_upsert, on_conflict='event_id').execute()
            print(f"🎉 Đã lưu thành công {len(records_to_upsert)} trận vào Supabase!")

    except Exception as e:
        print(f"⚠️ Đã xảy ra lỗi trong quá trình đồng bộ: {e}")

if __name__ == "__main__":
    sync_football_data()