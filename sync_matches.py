import requests
from datetime import datetime, timedelta
from supabase import create_client, Client

SUPABASE_URL = "https://pgwrrhvijrjcszihswnm.supabase.co"
SUPABASE_KEY = "sb_secret_Ev9Fpxq-vhV_ntr5Z5VE0A_7XldegTm"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
FOOTBALL_API_KEY = "35d5e00fd47d4770895bcf02b6e76d0b"

# Danh sách 5 giải đấu hàng đầu Châu Âu
COMPETITIONS = ['PL', 'PD', 'SA', 'BL1', 'FL1']

def sync_football_data():
    date_from = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    date_to = (datetime.now() + timedelta(days=10)).strftime('%Y-%m-%d')
    
    headers = { 'X-Auth-Token': FOOTBALL_API_KEY }
    all_records = []

    print(f"⏳ Bắt đầu cào dữ liệu từ {date_from} đến {date_to}...")

    for comp in COMPETITIONS:
        url = f"https://api.football-data.org/v4/competitions/{comp}/matches?dateFrom={date_from}&dateTo={date_to}"
        try:
            res = requests.get(url, headers=headers)
            if res.status_code == 200:
                data = res.json()
                matches = data.get('matches', [])
                print(f"✅ Giải {comp}: Tìm thấy {len(matches)} trận.")
                
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
                    all_records.append(record)
            else:
                print(f"⚠️ Không lấy được giải {comp}: HTTP {res.status_code}")
        except Exception as e:
            print(f"❌ Lỗi giải {comp}: {e}")

    if all_records:
        # Lưu/Cập nhật vào Supabase
        supabase.table('matches').upsert(all_records, on_conflict='event_id').execute()
        print(f"🎉 Đã lưu thành công {len(all_records)} trận đấu vào Supabase!")
    else:
        print("ℹ️ Không có dữ liệu để lưu.")

if __name__ == "__main__":
    sync_football_data()