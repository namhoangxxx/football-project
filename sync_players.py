import json
import os
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://pgwrrhvijrjcszihswnm.supabase.co").strip()
SUPABASE_KEY = os.environ.get(
    "SUPABASE_KEY",
    os.environ.get("SUPABASE_ANON_KEY", "sb_publishable_01cdBMzHDEs5fVjPY10DRg_iONp1RQE"),
).strip()

SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

LEAGUES = [
    "eng.1",
    "esp.1",
    "ita.1",
    "ger.1",
    "fra.1",
    "uefa.champions",
    "uefa.europa",
    "uefa.europa.conf",
]

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
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def sb_upsert(table: str, rows: list, on_conflict: str):
    if not rows:
        return

    # Đảm bảo mọi object trong payload có cùng tập key (tránh lỗi PGRST102 của PostgREST)
    all_keys = list(dict.fromkeys(k for row in rows for k in row.keys()))
    normalized_rows = [{k: row.get(k) for k in all_keys} for row in rows]

    for i in range(0, len(normalized_rows), 200):
        chunk = normalized_rows[i : i + 200]
        data = json.dumps(chunk).encode("utf-8")
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={on_conflict}",
            data=data,
            headers=SB_HEADERS,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                print(f"[{table}] Batch {i // 200 + 1}: HTTP {resp.status}")
        except urllib.error.HTTPError as err:
            err_body = err.read().decode("utf-8", errors="ignore")
            print(f"❌ [{table}] Batch {i // 200 + 1} lỗi HTTP {err.code}: {err_body}")
            raise


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
            rows.append(
                {
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
                }
            )
        return rows
    except Exception:
        return []


def fetch_all_paginated(endpoint: str) -> list:
    all_rows = []
    offset = 0
    step = 500
    while True:
        sep = "&" if "?" in endpoint else "?"
        page = http_get_json(f"{endpoint}{sep}limit={step}&offset={offset}", headers=SB_HEADERS)
        if not page:
            break
        all_rows.extend(page)
        if len(page) < step:
            break
        offset += step
    return all_rows


def main():
    tasks_by_team: dict[int, tuple[str, int, str]] = {}
    for lg in LEAGUES:
        try:
            d = http_get_json(f"https://site.api.espn.com/apis/site/v2/sports/soccer/{lg}/teams")
            teams = d.get("sports", [{}])[0].get("leagues", [{}])[0].get("teams", [])
            for t in teams:
                tm = t.get("team", {})
                if tm.get("id"):
                    tid = int(tm["id"])
                    if tid not in tasks_by_team:
                        tasks_by_team[tid] = (lg, tid, tm.get("displayName", ""))
        except Exception as e:
            print(f"Lỗi lấy giải {lg}: {e}")

    tasks = list(tasks_by_team.values())
    print(f"1. Đang đồng bộ {len(tasks)} CLB từ ESPN...")
    players_map: dict[int, dict] = {}
    with ThreadPoolExecutor(max_workers=10) as ex:
        for batch in ex.map(fetch_team_roster, tasks):
            for p in batch:
                players_map[p["player_id"]] = p

    print("2. Đang tổng hợp player_match_stats từ match_lineups & match_events...")
    lineup_rows = fetch_all_paginated(f"{SUPABASE_URL}/rest/v1/match_lineups?select=event_id,lineups")
    event_rows = fetch_all_paginated(f"{SUPABASE_URL}/rest/v1/match_events?select=event_id,events")
    events_by_id = {str(r["event_id"]): (r.get("events") or []) for r in event_rows}

    stats_rows = []
    for row in lineup_rows:
        eid = str(row["event_id"])
        evs = events_by_id.get(eid, [])

        sub_in_minute: dict[str, int] = {}
        sub_out_minute: dict[str, int] = {}
        for e in evs:
            if e.get("type") == "subst":
                minute = int((e.get("time") or {}).get("elapsed") or 65)
                p_in = str((e.get("player") or {}).get("name") or "").strip().lower()
                p_out = str((e.get("assist") or {}).get("name") or "").strip().lower()
                if p_in:
                    sub_in_minute[p_in] = minute
                if p_out:
                    sub_out_minute[p_out] = minute

        for team_lu in (row.get("lineups") or []):
            t_obj = team_lu.get("team") or {}
            tid = int(t_obj.get("id") or 0)
            tname = t_obj.get("name", "")

            for is_start, group in [
                (True, team_lu.get("startXI") or []),
                (False, team_lu.get("substitutes") or []),
            ]:
                for item in group:
                    p = item.get("player") or {}
                    pid = p.get("id")
                    raw_name = (p.get("name") or "").strip()
                    pname = raw_name.lower()
                    if not pid or not pname:
                        continue
                    pid = int(pid)

                    goals = sum(
                        1
                        for e in evs
                        if e.get("type") == "Goal"
                        and "own" not in str(e.get("detail") or "").lower()
                        and str((e.get("player") or {}).get("name") or "").strip().lower() == pname
                    )
                    assists = sum(
                        1
                        for e in evs
                        if e.get("type") == "Goal"
                        and str((e.get("assist") or {}).get("name") or "").strip().lower() == pname
                    )
                    yellows = sum(
                        1
                        for e in evs
                        if e.get("type") == "Card"
                        and "red" not in str(e.get("detail") or "").lower()
                        and str((e.get("player") or {}).get("name") or "").strip().lower() == pname
                    )
                    reds = sum(
                        1
                        for e in evs
                        if e.get("type") == "Card"
                        and "red" in str(e.get("detail") or "").lower()
                        and str((e.get("player") or {}).get("name") or "").strip().lower() == pname
                    )

                    did_play = (
                        is_start
                        or bool(p.get("subbed_in"))
                        or pname in sub_in_minute
                        or goals > 0
                        or assists > 0
                        or yellows > 0
                        or reds > 0
                    )
                    if not did_play:
                        continue

                    if is_start:
                        out_min = sub_out_minute.get(pname)
                        mins = max(1, min(90, out_min)) if out_min else (75 if p.get("subbed_out") else 90)
                    else:
                        in_min = sub_in_minute.get(pname)
                        mins = max(1, 90 - in_min) if in_min else 20

                    if pid not in players_map:
                        players_map[pid] = {
                            "player_id": pid,
                            "team_id": tid if tid > 0 else None,
                            "team_name": tname,
                            "name": raw_name,
                            "jersey_number": int(p["number"]) if str(p.get("number")).isdigit() else None,
                            "position_code": normalize_pos(p.get("pos", "")),
                            "nationality": None,
                            "age": None,
                            "height": None,
                            "weight": None,
                            "photo_url": None,
                        }

                    stats_rows.append(
                        {
                            "event_id": eid,
                            "player_id": pid,
                            "team_id": tid if tid > 0 else None,
                            "is_starter": is_start,
                            "minutes_played": mins,
                            "goals": goals,
                            "assists": assists,
                            "yellow_cards": yellows,
                            "red_cards": reds,
                        }
                    )

    if players_map:
        sb_upsert("players", list(players_map.values()), on_conflict="player_id")
        print(f"=> Đã lưu {len(players_map)} cầu thủ vào bảng players.")

    if stats_rows:
        dedup = {(r["event_id"], r["player_id"]): r for r in stats_rows}
        sb_upsert("player_match_stats", list(dedup.values()), on_conflict="event_id,player_id")
        print(f"=> Đã lưu {len(dedup)} bản ghi vào player_match_stats.")


if __name__ == "__main__":
    main()