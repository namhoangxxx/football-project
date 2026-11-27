import json
import os
import urllib.error
import urllib.request
from collections import Counter, defaultdict
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
    "eng.1", "esp.1", "ita.1", "ger.1", "fra.1",
    "uefa.champions", "uefa.europa", "uefa.europa.conf",
]

POS_MAP = {
    "G": "GK", "GK": "GK", "GOALKEEPER": "GK",
    "D": "CB", "CD": "CB", "CB": "CB", "LCB": "CB", "RCB": "CB", "SW": "CB",
    "CENTER BACK": "CB", "CENTRE BACK": "CB",
    "LB": "LB", "LD": "LB", "LEFT BACK": "LB",
    "RB": "RB", "RD": "RB", "RIGHT BACK": "RB",
    "LWB": "LWB", "LEFT WING BACK": "LWB", "LEFT WINGBACK": "LWB",
    "RWB": "RWB", "RIGHT WING BACK": "RWB", "RIGHT WINGBACK": "RWB",
    "M": "CM", "CM": "CM", "LCM": "CM", "RCM": "CM", "CENTRAL MIDFIELDER": "CM",
    "DM": "CDM", "CDM": "CDM", "LDM": "CDM", "RDM": "CDM", "DEFENSIVE MIDFIELDER": "CDM",
    "AM": "CAM", "CAM": "CAM", "LAM": "CAM", "RAM": "CAM", "ATTACKING MIDFIELDER": "CAM",
    "LM": "LM", "LWM": "LM", "LEFT MIDFIELDER": "LM",
    "RM": "RM", "RWM": "RM", "RIGHT MIDFIELDER": "RM",
    "LF": "LW", "LW": "LW", "LEFT WINGER": "LW", "LEFT FORWARD": "LW",
    "RF": "RW", "RW": "RW", "RIGHT WINGER": "RW", "RIGHT FORWARD": "RW",
    "F": "CF", "CF": "CF", "SS": "CF", "CENTER FORWARD": "CF", "CENTRE FORWARD": "CF", "SECOND STRIKER": "CF",
    "ST": "ST", "LS": "ST", "RS": "ST", "STRIKER": "ST",
}

POS_GROUP = {
    "GK": "GK",
    **dict.fromkeys(["CB", "LB", "RB", "LWB", "RWB"], "DEF"),
    **dict.fromkeys(["CDM", "CM", "CAM", "LM", "RM"], "MID"),
    **dict.fromkeys(["LW", "RW", "CF", "ST"], "FWD"),
}

GENERIC_POS = {"CB", "CM", "CF"}
SUB_TOKENS = {"", "SUB", "SUBSTITUTE", "BENCH"}


def normalize_pos(abbr: str = "", name: str = "") -> str:
    for raw in (name, abbr):
        key = (raw or "").strip().upper()
        if key in POS_MAP:
            return POS_MAP[key]
        if key.split("-")[0] in POS_MAP:
            return POS_MAP[key.split("-")[0]]
    return "CM"


def http_get_json(url: str, headers=None, timeout: int = 20):
    req = urllib.request.Request(url, headers=headers or {"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_all_paginated(endpoint: str) -> list:
    rows, offset, step = [], 0, 500
    while True:
        sep = "&" if "?" in endpoint else "?"
        page = http_get_json(f"{endpoint}{sep}limit={step}&offset={offset}", headers=SB_HEADERS)
        if not page:
            break
        rows.extend(page)
        if len(page) < step:
            break
        offset += step
    return rows


def sb_upsert(table: str, rows: list, on_conflict: str):
    if not rows:
        return
    keys = list(dict.fromkeys(k for r in rows for k in r))
    normalized = [{k: r.get(k) for k in keys} for r in rows]

    for i in range(0, len(normalized), 200):
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={on_conflict}",
            data=json.dumps(normalized[i : i + 200]).encode("utf-8"),
            headers=SB_HEADERS,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                print(f"[{table}] Batch {i // 200 + 1}: HTTP {resp.status}")
        except urllib.error.HTTPError as err:
            print(f"❌ [{table}] Lỗi HTTP {err.code}: {err.read().decode('utf-8', errors='ignore')}")
            raise


def fetch_team_roster(args):
    lg, team_id, team_name = args
    try:
        data = http_get_json(f"https://site.api.espn.com/apis/site/v2/sports/soccer/{lg}/teams/{team_id}/roster")
        rows = []
        for a in data.get("athletes", []):
            pid = a.get("id")
            if not pid:
                continue
            pos = a.get("position") or {}
            jersey = str(a.get("jersey") or "")
            rows.append({
                "player_id": int(pid),
                "team_id": int(team_id),
                "team_name": team_name,
                "name": a.get("displayName") or a.get("fullName"),
                "jersey_number": int(jersey) if jersey.isdigit() else None,
                "position_code": normalize_pos(pos.get("abbreviation", ""), pos.get("name") or pos.get("displayName", "")),
                "nationality": a.get("citizenship") or (a.get("birthPlace") or {}).get("country"),
                "age": a.get("age"),
                "height": a.get("displayHeight"),
                "weight": a.get("displayWeight"),
                "photo_url": (a.get("headshot") or {}).get("href"),
            })
        return rows
    except Exception:
        return []


def fetch_athlete_pos(pid: int) -> tuple[int, str | None]:
    try:
        pos = http_get_json(f"https://sports.core.api.espn.com/v2/sports/soccer/athletes/{pid}", timeout=10).get("position") or {}
        abbr, name = pos.get("abbreviation", ""), pos.get("name") or pos.get("displayName", "")
        return pid, normalize_pos(abbr, name) if (abbr or name) else None
    except Exception:
        return pid, None


def main():
    teams_by_id = {}
    for lg in LEAGUES:
        try:
            d = http_get_json(f"https://site.api.espn.com/apis/site/v2/sports/soccer/{lg}/teams")
            for t in d.get("sports", [{}])[0].get("leagues", [{}])[0].get("teams", []):
                tm = t.get("team", {})
                if tm.get("id"):
                    teams_by_id.setdefault(int(tm["id"]), (lg, int(tm["id"]), tm.get("displayName", "")))
        except Exception as e:
            print(f"Lỗi lấy giải {lg}: {e}")

    print(f"1. Đồng bộ roster {len(teams_by_id)} CLB...")
    players_map = {}
    with ThreadPoolExecutor(max_workers=12) as ex:
        for batch in ex.map(fetch_team_roster, teams_by_id.values()):
            for p in batch:
                players_map[p["player_id"]] = p

    # Giữ vị trí chi tiết đã có trong DB, chỉ gọi API chi tiết cho cầu thủ mới
    existing_pos = {
        int(r["player_id"]): r["position_code"]
        for r in fetch_all_paginated(f"{SUPABASE_URL}/rest/v1/players?select=player_id,position_code")
    }
    pids_to_lookup = []
    for pid, p in players_map.items():
        if pid in existing_pos and existing_pos[pid] not in GENERIC_POS:
            p["position_code"] = existing_pos[pid]
        elif pid not in existing_pos and p["position_code"] in GENERIC_POS:
            pids_to_lookup.append(pid)

    if pids_to_lookup:
        print(f"2. Lấy vị trí chi tiết cho {len(pids_to_lookup)} cầu thủ mới...")
        with ThreadPoolExecutor(max_workers=20) as ex:
            for pid, pos in ex.map(fetch_athlete_pos, pids_to_lookup):
                if pos:
                    players_map[pid]["position_code"] = pos

    print("3. Tổng hợp player_match_stats...")
    lineup_rows = fetch_all_paginated(f"{SUPABASE_URL}/rest/v1/match_lineups?select=event_id,lineups")
    events_by_id = {
        str(r["event_id"]): (r.get("events") or [])
        for r in fetch_all_paginated(f"{SUPABASE_URL}/rest/v1/match_events?select=event_id,events")
    }

    start_pos_counter = defaultdict(Counter)
    stats_dedup = {}

    for row in lineup_rows:
        eid = str(row["event_id"])
        goals, assists, yellows, reds = Counter(), Counter(), Counter(), Counter()
        sub_in, sub_out = {}, {}

        for e in events_by_id.get(eid, []):
            etype = e.get("type")
            detail = str(e.get("detail") or "").lower()
            p_name = str((e.get("player") or {}).get("name") or "").strip().lower()
            a_name = str((e.get("assist") or {}).get("name") or "").strip().lower()
            if etype == "subst":
                minute = int((e.get("time") or {}).get("elapsed") or 65)
                if p_name:
                    sub_in[p_name] = minute
                if a_name:
                    sub_out[a_name] = minute
            elif etype == "Goal":
                if p_name and "own" not in detail:
                    goals[p_name] += 1
                if a_name:
                    assists[a_name] += 1
            elif etype == "Card" and p_name:
                (reds if "red" in detail else yellows)[p_name] += 1

        for team_lu in (row.get("lineups") or []):
            t_obj = team_lu.get("team") or {}
            tid = int(t_obj.get("id") or 0) or None
            tname = t_obj.get("name", "")

            for is_start, group in [(True, team_lu.get("startXI") or []), (False, team_lu.get("substitutes") or [])]:
                for item in group:
                    p = item.get("player") or {}
                    raw_name = (p.get("name") or "").strip()
                    if not p.get("id") or not raw_name:
                        continue
                    pid, pname = int(p["id"]), raw_name.lower()
                    raw_pos = str(p.get("pos") or "")

                    if is_start and raw_pos.strip().upper() not in SUB_TOKENS:
                        start_pos_counter[pid][normalize_pos(raw_pos)] += 1

                    g, a, y, r = goals[pname], assists[pname], yellows[pname], reds[pname]
                    if not (is_start or p.get("subbed_in") or pname in sub_in or g or a or y or r):
                        continue

                    if is_start:
                        mins = max(1, min(90, sub_out[pname])) if pname in sub_out else (75 if p.get("subbed_out") else 90)
                    else:
                        mins = max(1, 90 - sub_in[pname]) if pname in sub_in else 20

                    if pid not in players_map:
                        top = start_pos_counter[pid].most_common(1)
                        jersey = str(p.get("number") or "")
                        players_map[pid] = {
                            "player_id": pid,
                            "team_id": tid,
                            "team_name": tname,
                            "name": raw_name,
                            "jersey_number": int(jersey) if jersey.isdigit() else None,
                            "position_code": top[0][0] if top else normalize_pos(raw_pos),
                        }

                    stats_dedup[(eid, pid)] = {
                        "event_id": eid, "player_id": pid, "team_id": tid,
                        "is_starter": is_start, "minutes_played": mins,
                        "goals": g, "assists": a, "yellow_cards": y, "red_cards": r,
                    }

    for pid, p_row in players_map.items():
        cur = p_row["position_code"]
        if cur in GENERIC_POS and start_pos_counter[pid]:
            top_pos = start_pos_counter[pid].most_common(1)[0][0]
            if top_pos not in GENERIC_POS and POS_GROUP.get(top_pos) == POS_GROUP.get(cur):
                p_row["position_code"] = top_pos

    print("Phân bổ vị trí:", dict(Counter(p["position_code"] for p in players_map.values()).most_common()))
    sb_upsert("players", list(players_map.values()), on_conflict="player_id")
    sb_upsert("player_match_stats", list(stats_dedup.values()), on_conflict="event_id,player_id")


if __name__ == "__main__":
    main()