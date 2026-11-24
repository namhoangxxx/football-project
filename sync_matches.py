import os
import sys
import time
from datetime import datetime, timedelta, timezone
import requests
from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()
FOOTBALL_API_KEY = os.environ.get("FOOTBALL_API_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_KEY or not FOOTBALL_API_KEY:
    raise ValueError("Thiếu biến môi trường SUPABASE_URL, SUPABASE_KEY hoặc FOOTBALL_API_KEY!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
ALLOWED_COMPETITIONS = ["PL", "PD", "SA", "BL1", "FL1", "CL", "EL", "ECL"]
HEADERS = {"X-Auth-Token": FOOTBALL_API_KEY}


def fetch_with_retry(url: str, max_retries: int = 3) -> dict | None:
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            if resp.status_code == 429:
                wait_sec = int(resp.headers.get("X-RequestCounter-Reset", 60)) + 2
                print(f"  ⏸️ Chạm rate limit (429), chờ {wait_sec}s...")
                time.sleep(wait_sec)
                continue
            if resp.status_code != 200:
                print(f"  ❌ Lỗi API ({resp.status_code}): {resp.text[:150]}")
                return None
            return resp.json()
        except Exception as e:
            print(f"  ⚠️ Lỗi kết nối ({attempt + 1}/{max_retries}): {e}")
            time.sleep(2)
    return None


def map_match(match: dict, fallback_league: str = "") -> dict:
    score_obj = match.get("score") or {}
    full_time = score_obj.get("fullTime") or {}
    reg_time = score_obj.get("regularTime") or {}

    home_score = full_time.get("home") if full_time.get("home") is not None else reg_time.get("home")
    away_score = full_time.get("away") if full_time.get("away") is not None else reg_time.get("away")

    home_team = match.get("homeTeam") or {}
    away_team = match.get("awayTeam") or {}

    return {
        "event_id": str(match["id"]),
        "home_team": home_team.get("shortName") or home_team.get("name", ""),
        "away_team": away_team.get("shortName") or away_team.get("name", ""),
        "home_team_id": home_team.get("id"),
        "away_team_id": away_team.get("id"),
        "status": match.get("status", "TIMED"),
        "league": (match.get("competition") or {}).get("name") or fallback_league,
        "home_score": home_score,
        "away_score": away_score,
        "match_time": match["utcDate"],
        "home_icon": home_team.get("crest"),
        "away_icon": away_team.get("crest"),
    }


def sync_football_data(full_season: bool = False):
    if not full_season:
        try:
            res = supabase.table("matches").select("event_id", count="exact").limit(1).execute()
            if (res.count or 0) < 400:
                print("ℹ️ DB chưa đủ dữ liệu cả mùa (< 400 trận), tự kích hoạt chế độ --full...")
                full_season = True
        except Exception:
            pass

    records_by_id: dict[str, dict] = {}

    if full_season:
        for code in ALLOWED_COMPETITIONS:
            url = f"https://api.football-data.org/v4/competitions/{code}/matches"
            print(f"🌍 Đang sync toàn mùa giải [{code}]...")
            data = fetch_with_retry(url)
            if not data:
                continue
            comp_name = (data.get("competition") or {}).get("name", code)
            matches = data.get("matches") or []
            print(f"  └─ {comp_name}: {len(matches)} trận.")
            for m in matches:
                rec = map_match(m, fallback_league=comp_name)
                records_by_id[rec["event_id"]] = rec
            time.sleep(1.0)
    else:
        competitions_param = ",".join(ALLOWED_COMPETITIONS)
        now_utc = datetime.now(timezone.utc)
        date_ranges = [
            (now_utc - timedelta(days=15), now_utc - timedelta(days=7)),
            (now_utc - timedelta(days=6), now_utc + timedelta(days=1)),
            (now_utc + timedelta(days=2), now_utc + timedelta(days=9)),
        ]
        for start_date, end_date in date_ranges:
            date_from = start_date.strftime("%Y-%m-%d")
            date_to = end_date.strftime("%Y-%m-%d")
            url = f"https://api.football-data.org/v4/matches?competitions={competitions_param}&dateFrom={date_from}&dateTo={date_to}"
            print(f"⏳ Đang sync dữ liệu từ {date_from} đến {date_to}...")
            data = fetch_with_retry(url)
            if not data:
                continue
            matches = data.get("matches") or []
            print(f"  └─ Tìm thấy {len(matches)} trận.")
            for m in matches:
                rec = map_match(m)
                records_by_id[rec["event_id"]] = rec
            time.sleep(1.0)

    all_records = list(records_by_id.values())
    if all_records:
        print(f"🚀 Đang upsert {len(all_records)} trận đấu vào Supabase...")
        for i in range(0, len(all_records), 500):
            supabase.table("matches").upsert(all_records[i : i + 500], on_conflict="event_id").execute()
        print("🎉 ĐỒNG BỘ THÀNH CÔNG!")


if __name__ == "__main__":
    sync_football_data(full_season="--full" in sys.argv)