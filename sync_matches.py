import requests
from datetime import datetime, timedelta
from supabase import create_client, Client

SUPABASE_URL = "https://pgwrrhvijrjcszihswnm.supabase.co"
SUPABASE_KEY = "sb_secret_Ev9Fpxq-vhV_ntr5Z5VE0A_7XldegTm"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
FOOTBALL_API_KEY = "35d5e00fd47d4770895bcf02b6e76d0b"

def sync_football_data():
    # Lấy rộng từ 3 ngày trước đến 10 ngày sau để bao phủ trọn vẹn lịch thi đấu
    date_from = (datetime.now() - timedelta(days=3)).strftime('%Y-%m-%d')
    date_to = (datetime.now() + timedelta(days=10)).strftime('%Y-%m-%d')
    
    print(f"⏳ Đang đồng bộ trận đấu từ {date_from} đến {date_to}...")
    
    url = f"https://api.football-data.org/v4/matches?dateFrom={date_from}&dateTo={date_to}"
    headers = { 'X-Auth-Token': FOOTBALL_API_KEY }
    
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

        # Chuẩn bị danh sách dữ liệu để đẩy hàng loạt (Batch Processing)
        records_to_upsert = []
        for match in matches:
            record = {
                'event_id': str(match['id']),
                'home_team': match['homeTeam'].get('shortName') or match['homeTeam'].get('name', ''),
                'away_team': match['awayTeam'].get('shortName') or match['awayTeam'].get('name', ''),
                'status': match['status'],
                'league': match['competition'].get('name', ''),
                'home_score': match['score']['fullTime']['home'],
                'away_score': match['score']['fullTime']['away'],
                'match_time': match['utcDate'],
                'home_icon': match['homeTeam'].get('crest'),
                'away_icon': match['awayTeam'].get('crest'),
            }
            records_to_upsert.append(record)
        
        # Đẩy toàn bộ danh sách vào Supabase cùng một lúc
        supabase.table('matches').upsert(records_to_upsert, on_conflict='event_id').execute()
        print(f"🎉 Hoàn tất cập nhật {len(records_to_upsert)} trận đấu vào Supabase!")

    except Exception as e:
        print(f"⚠️ Lỗi trong quá trình xử lý đồng bộ: {e}")

if __name__ == "__main__":
    sync_football_data()