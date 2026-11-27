import os
import sys
import time
from datetime import datetime, timedelta, timezone
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()
FOOTBALL_API_KEY = os.environ.get("FOOTBALL_API_KEY", "").strip()

if not all((SUPABASE_URL, SUPABASE_KEY, FOOTBALL_API_KEY)):
    raise ValueError("Thiếu biến môi trường SUPABASE_URL, SUPABASE_KEY hoặc FOOTBALL_API_KEY!")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
COMPETITIONS = ["PL", "PD", "SA", "BL1", "FL1", "CL", "EL", "ECL"]
HEADERS = {"X-Auth-Token": FOOTBALL_API_KEY}


def fetch_json(url: str, retries: int = 3) -> dict | None:
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            if resp.status_code == 429:
                wait = int(resp.headers.get("X-RequestCounter-Reset", 60)) + 2
                print(f"Chạm rate limit (429), chờ {wait}s...")
                time.sleep(wait)
                continue
            if resp.status_code != 200:
                print(f"Lỗi API ({resp.status_code}): {resp.text[:150]}")
                return None
            return resp.json()
        except Exception as e:
            print(f"Lỗi kết nối ({attempt + 1}/{retries}): {e}")
            time.sleep(2)
    return None


def map_match(match: dict, fallback_league: str = "") -> dict:
    score = match.get("score") or {}
    ft, rt = score.get("fullTime") or {}, score.get("regularTime") or {}
    home, away = match.get("homeTeam") or {}, match.get("awayTeam") or {}

    return {
        "event_id": str(match["id"]),
        "home_team": home.get("shortName") or home.get("name", ""),
        "away_team": away.get("shortName") or away.get("name", ""),
        "home_team_id": home.get("id"),
        "away_team_id": away.get("id"),
        "status": match.get("status", "TIMED"),
        "league": (match.get("competition") or {}).get("name") or fallback_league,
        "home_score": ft.get("home") if ft.get("home") is not None else rt.get("home"),
        "away_score": ft.get("away") if ft.get("away") is not None else rt.get("away"),
        "match_time": match["utcDate"],
        "home_icon": home.get("crest"),
        "away_icon": away.get("crest"),
    }


def sync_football_data(full_season: bool = False):
    if not full_season:
        try:
            res = supabase.table("matches").select("event_id", count="exact").limit(1).execute()
            full_season = (res.count or 0) < 400
        except Exception:
            pass

    if full_season:
        requests_plan = [
            (f"https://api.football-data.org/v4/competitions/{code}/matches", code)
            for code in COMPETITIONS
        ]
    else:
        now = datetime.now(timezone.utc)
        comps = ",".join(COMPETITIONS)
        requests_plan = [
            (
                f"https://api.football-data.org/v4/matches?competitions={comps}"
                f"&dateFrom={(now + timedelta(days=d1)):%Y-%m-%d}"
                f"&dateTo={(now + timedelta(days=d2)):%Y-%m-%d}",
                "",
            )
            for d1, d2 in [(-15, -7), (-6, 1), (2, 9)]
        ]

    records = {}
    for url, fallback_league in requests_plan:
        data = fetch_json(url)
        if data:
            league_name = (data.get("competition") or {}).get("name", fallback_league)
            for m in data.get("matches") or []:
                rec = map_match(m, league_name)
                records[rec["event_id"]] = rec
        time.sleep(1.0)

    rows = list(records.values())
    for i in range(0, len(rows), 500):
        supabase.table("matches").upsert(rows[i : i + 500], on_conflict="event_id").execute()
    print(f"Đã đồng bộ {len(rows)} trận đấu.")


if __name__ == "__main__":
    sync_football_data(full_season="--full" in sys.argv)