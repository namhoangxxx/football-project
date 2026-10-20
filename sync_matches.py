import requests
from datetime import datetime, timedelta
from supabase import create_client, Client

SUPABASE_URL = "https://pgwrrhvijrjcszihswnm.supabase.co"
SUPABASE_KEY = "sb_secret_Ev9Fpxq-vhV_ntr5Z5VE0A_7XldegTm"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
FOOTBALL_API_KEY = "35d5e00fd47d4770895bcf02b6e76d0b"

def sync_football_data():
    # Lấy từ HÔM QUA để cập nhật kết quả các trận vừa kết thúc (tránh bị kẹt IN_PLAY/SCHEDULED)
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    next_week = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
    
    print(f"⏳ Đang đồng bộ trận đấu từ {yesterday} đến {next_week}...")
    
    url = f"https://api.football-data.org/v4/matches?dateFrom={yesterday}&dateTo={next_week}"
    headers = { 'X-Auth-Token': FOOTBALL_API_KEY }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Lỗi API: {response.status_code}\n{response.text}")
        return

    data = response.json()
    matches = data.get('matches', [])
    print(f"✅ Tìm thấy {len(matches)} trận đấu!")

    for match in matches:
        match_data = {
            'event_id': str(match['id']),
            'home_team': match['homeTeam']['shortName'] or match['homeTeam']['name'],
            'away_team': match['awayTeam']['shortName'] or match['awayTeam']['name'],
            'status': match['status'], # Sẽ cập nhật từ IN_PLAY sang FINISHED
            'league': match['competition']['name'],
            'home_score': match['score']['fullTime']['home'],
            'away_score': match['score']['fullTime']['away'],
            'match_time': match['utcDate'],
            'home_icon': match['homeTeam'].get('crest'),
            'away_icon': match['awayTeam'].get('crest'),
        }
        
        try:
            supabase.table('matches').upsert(match_data, on_conflict='event_id').execute()
        except Exception as e:
            print(f"⚠️ Lỗi lưu trận {match_data['home_team']}: {e}")

    print("🎉 Hoàn tất cập nhật dữ liệu mới nhất!")

if __name__ == "__main__":
    sync_football_data()