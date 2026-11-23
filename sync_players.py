import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor

SUPABASE_URL = "https://pgwrrhvijrjcszihswnm.supabase.co"
SUPABASE_ANON_KEY = "sb_publishable_01cdBMzHDEs5fVjPY10DRg_iONp1RQE"

SB_HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

LEAGUES = ["eng.1", "esp.1", "ita.1", "ger.1", "fra.1"]

POS_MAP = {
    "G": "GK", "GK": "GK",
    "CD": "CB", "CD-L": "CB", "CD-R": "CB", "CB": "CB", "D": "CB",
    "LB": "LB", "LWB": "LB", "LD": "LB",
    "RB": "RB", "RWB": "RB", "RD": "RB",
    "DM": "CDM", "DM-L": "CDM", "DM-R": "CDM", "CDM": "CDM",
    "CM": "CM", "CM-L": "CM", "CM-R": "CM", "M": "CM",
    "RM": "RM", "RWM": "RM",
    "LM": "LM", "LWM": "LM",
    "AM": "AM", "AM-L": "AM", "AM-R": "AM", "CAM": "AM",
    "F": "CF", "CF": "CF", "CF-L": "CF", "CF-R": "CF", "ST": "CF",
    "RF": "RF", "RW": "RF",
    "LF": "LF", "LW": "LF",
}

def normalize_pos(raw: str) -> str:
    code = (raw or "").strip().upper()
    if code in POS_MAP:
        return POS_MAP[code]
    return POS_MAP.get(code.split("-")[0], "CM")

def http_get_json(url: str, headers=None):
    req = urllib.request.Request(url, headers=headers or {"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))

def sb_upsert(table: str, rows: list):
    for i in range(0, len(rows), 200):
        chunk = rows[i:i + 200]
        data = json.dumps(chunk).encode("utf-8")
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/{table}",
            data=data,
            headers=SB_HEADERS,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            print(f"[{table}] Batch {i//200 + 1}: HTTP {resp.status}")

def fetch_team_roster(args):
    lg, team_id, team_name = args
    try:
        data = http_get_json(
            f"https://site.api.espn.com/apis/site/v2/sports/soccer/{lg}/teams/{team_id}/roster"
        )
        rows = []
        for a in data.get("athletes", []):
            pid = a.get("id")
            if not pid:
                continue
            pos_abbr = (a.get("position") or {}).get("abbreviation", "")
            jersey = a.get("jersey")
            rows.append({
                "player_id": int(pid),
                "team_id": int(team_id),
                "team_name": team_name,
                "name": a.get("displayName") or a.get("fullName"),
                "jersey_number": int(jersey) if str(jersey).isdigit() else None,
                "position_code": normalize_pos(pos_abbr),
                "nationality": a.get("citizenship") or (a.get("birthPlace") or {}).get("country"),
                "age": a.get("age"),
                "height": a.get("displayHeight"),
                "weight": a.get("displayWeight"),
                "photo_url": (a.get("headshot") or {}).get("href"),
            })
        return rows
    except Exception:
        return []

def main():
    tasks = []
    for lg in LEAGUES:
        try:
            d = http_get_json(f"https://site.api.espn.com/apis/site/v2/sports/soccer/{lg}/teams")
            teams = d.get("sports", [{}])[0].get("leagues", [{}])[0].get("teams", [])
            for t in teams:
                tm = t.get("team", {})
                if tm.get("id"):
                    tasks.append((lg, int(tm["id"]), tm.get("displayName", "")))
        except Exception as e:
            print(f"Lỗi lấy giải {lg}: {e}")

    print(f"1. Đang đồng bộ {len(tasks)} CLB từ ESPN...")
    players_map = {}
    with ThreadPoolExecutor(max_workers=10) as ex:
        for batch in ex.map(fetch_team_roster, tasks):
            for p in batch:
                players_map[p["player_id"]] = p

    if players_map:
        sb_upsert("players", list(players_map.values()))
        print(f"=> Đã lưu {len(players_map)} cầu thủ vào bảng players.")

    print("2. Đang tổng hợp player_match_stats từ match_lineups & match_events...")
    lineup_rows = http_get_json(
        f"{SUPABASE_URL}/rest/v1/match_lineups?select=event_id,lineups&limit=300",
        headers=SB_HEADERS,
    )
    event_rows = http_get_json(
        f"{SUPABASE_URL}/rest/v1/match_events?select=event_id,events&limit=300",
        headers=SB_HEADERS,
    )
    events_by_id = {str(r["event_id"]): (r.get("events") or []) for r in event_rows}

    stats_rows = []
    for row in lineup_rows:
        eid = str(row["event_id"])
        evs = events_by_id.get(eid, [])
        for team_lu in (row.get("lineups") or []):
            tid = int((team_lu.get("team") or {}).get("id") or 0)
            for is_start, group in [(True, team_lu.get("startXI") or []), (False, team_lu.get("substitutes") or [])]:
                for item in group:
                    p = item.get("player") or {}
                    pid = p.get("id")
                    pname = (p.get("name") or "").strip().lower()
                    if not pid or not pname:
                        continue
                    goals = sum(
                        1 for e in evs
                        if e.get("type") == "Goal"
                        and "own" not in str(e.get("detail") or "").lower()
                        and str((e.get("player") or {}).get("name") or "").strip().lower() == pname
                    )
                    assists = sum(
                        1 for e in evs
                        if e.get("type") == "Goal"
                        and str((e.get("assist") or {}).get("name") or "").strip().lower() == pname
                    )
                    yellows = sum(
                        1 for e in evs
                        if e.get("type") == "Card"
                        and "red" not in str(e.get("detail") or "").lower()
                        and str((e.get("player") or {}).get("name") or "").strip().lower() == pname
                    )
                    reds = sum(
                        1 for e in evs
                        if e.get("type") == "Card"
                        and "red" in str(e.get("detail") or "").lower()
                        and str((e.get("player") or {}).get("name") or "").strip().lower() == pname
                    )
                    stats_rows.append({
                        "event_id": eid,
                        "player_id": int(pid),
                        "team_id": tid,
                        "is_starter": is_start,
                        "minutes_played": 90 if is_start else 25,
                        "goals": goals,
                        "assists": assists,
                        "yellow_cards": yellows,
                        "red_cards": reds,
                    })

    if stats_rows:
        # Khử trùng lặp theo (event_id, player_id)
        dedup = {(r["event_id"], r["player_id"]): r for r in stats_rows}
        sb_upsert("player_match_stats", list(dedup.values()))
        print(f"=> Đã lưu {len(dedup)} bản ghi vào player_match_stats.")

if __name__ == "__main__":
    main()