import os
import re
import sys
import time
import unicodedata
from datetime import datetime, timedelta
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Thiếu SUPABASE_URL hoặc SUPABASE_KEY trong biến môi trường / .env!")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

LEAGUE_SLUG_MAP = {
    "Premier League": "eng.1",
    "Primera Division": "esp.1",
    "La Liga": "esp.1",
    "Serie A": "ita.1",
    "Bundesliga": "ger.1",
    "Ligue 1": "fra.1",
    "UEFA Champions League": "uefa.champions",
    "UEFA Europa League": "uefa.europa",
    "UEFA Conference League": "uefa.europa.conf",
}

STAT_PAIRS = [
    ("possession", "possessionPct"),
    ("shots", "totalShots"),
    ("shots_on_target", "shotsOnTarget"),
    ("corners", "wonCorners"),
    ("fouls", "foulsCommitted"),
]

STOPWORDS_RE = re.compile(
    r"\b(fc|cf|sc|ac|as|afc|ssc|rc|rcd|ud|cd|ca|sv|vfl|vfb|tsg|fsv|rb|bsc|1\.|de|la|el|los|las|real|club|sporting|athletic|atletico|olympique|borussia|eintracht|dynamo|sparta|slavia|red bull)\b"
)
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}


def norm_team(name: str) -> str:
    s = "".join(ch for ch in unicodedata.normalize("NFD", (name or "").lower()) if unicodedata.category(ch) != "Mn")
    s = STOPWORDS_RE.sub(" ", s)
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def teams_similar(name_a: str, name_b: str) -> bool:
    a, b = norm_team(name_a), norm_team(name_b)
    return bool(a and b and (a == b or a in b or b in a))


def load_team_map() -> dict[int, int]:
    try:
        res = supabase.table("team_map").select("football_data_id, espn_id").execute()
        return {
            int(r["football_data_id"]): int(r["espn_id"])
            for r in (res.data or [])
            if r.get("football_data_id") and r.get("espn_id")
        }
    except Exception:
        return {}


def save_team_map_entry(fd_id: int | None, espn_id: int | None, cache: dict[int, int]):
    if not fd_id or not espn_id or fd_id in cache:
        return
    try:
        supabase.table("team_map").upsert(
            [{"football_data_id": int(fd_id), "espn_id": int(espn_id)}],
            on_conflict="football_data_id",
        ).execute()
        cache[int(fd_id)] = int(espn_id)
    except Exception:
        pass


def find_espn_event_id(
    league_slug: str,
    match_time_iso: str,
    home_fd_id: int | None,
    away_fd_id: int | None,
    home_name: str,
    away_name: str,
    team_map: dict[int, int],
) -> str | None:
    try:
        dt = datetime.fromisoformat(match_time_iso.replace("Z", "+00:00"))
    except Exception:
        dt = datetime.strptime(match_time_iso[:10], "%Y-%m-%d")

    home_espn_id = team_map.get(home_fd_id) if home_fd_id else None
    away_espn_id = team_map.get(away_fd_id) if away_fd_id else None

    for offset in (0, -1, 1):
        date_str = (dt + timedelta(days=offset)).strftime("%Y%m%d")
        url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{league_slug}/scoreboard?dates={date_str}"
        try:
            res = requests.get(url, headers=HEADERS, timeout=10)
            if res.status_code != 200:
                continue
            for ev in res.json().get("events", []):
                comps = (ev.get("competitions") or [{}])[0].get("competitors", [])
                home_c = next((c for c in comps if c.get("homeAway") == "home"), None)
                away_c = next((c for c in comps if c.get("homeAway") == "away"), None)
                if not home_c or not away_c:
                    continue

                ev_h_id, ev_a_id = int(home_c["team"]["id"]), int(away_c["team"]["id"])
                ev_h_name = home_c["team"].get("displayName", "")
                ev_a_name = away_c["team"].get("displayName", "")

                matched = (
                    (home_espn_id and away_espn_id and ev_h_id == home_espn_id and ev_a_id == away_espn_id)
                    or (home_espn_id and ev_h_id == home_espn_id and teams_similar(away_name, ev_a_name))
                    or (away_espn_id and ev_a_id == away_espn_id and teams_similar(home_name, ev_h_name))
                    or (teams_similar(home_name, ev_h_name) and teams_similar(away_name, ev_a_name))
                )
                if matched:
                    save_team_map_entry(home_fd_id, ev_h_id, team_map)
                    save_team_map_entry(away_fd_id, ev_a_id, team_map)
                    return str(ev["id"])
        except Exception:
            continue
    return None


def parse_stat_value(stats_list: list, stat_name: str) -> int:
    for item in stats_list:
        if item.get("name") == stat_name:
            try:
                return int(float(str(item.get("displayValue", "0")).replace("%", "").strip()))
            except ValueError:
                return 0
    return 0


def get_cached_ids(table: str, ids: list[str]) -> set[str]:
    cached = set()
    for i in range(0, len(ids), 200):
        res = supabase.table(table).select("event_id").in_("event_id", ids[i : i + 200]).execute()
        cached.update(str(r["event_id"]) for r in (res.data or []))
    return cached


def sync_match_details(limit_rows: int = 250):
    matches = (
        supabase.table("matches")
        .select("event_id, home_team, away_team, home_team_id, away_team_id, league, match_time")
        .eq("status", "FINISHED")
        .order("match_time", desc=True)
        .limit(limit_rows)
        .execute()
        .data
        or []
    )
    if not matches:
        return

    all_ids = [str(m["event_id"]) for m in matches]
    stats_cached = get_cached_ids("match_details", all_ids)
    events_cached = get_cached_ids("match_events", all_ids)
    lineups_cached = get_cached_ids("match_lineups", all_ids)
    team_map = load_team_map()
    synced = 0

    for m in matches:
        eid = str(m["event_id"])
        has_stats, has_events, has_lineups = eid in stats_cached, eid in events_cached, eid in lineups_cached
        if has_stats and has_events and has_lineups:
            continue

        league_slug = LEAGUE_SLUG_MAP.get(m.get("league", ""))
        if not league_slug:
            continue

        espn_id = find_espn_event_id(
            league_slug, m["match_time"], m.get("home_team_id"), m.get("away_team_id"),
            m["home_team"], m["away_team"], team_map,
        )
        if not espn_id:
            continue

        try:
            res = requests.get(
                f"https://site.api.espn.com/apis/site/v2/sports/soccer/{league_slug}/summary?event={espn_id}",
                headers=HEADERS,
                timeout=12,
            )
            if res.status_code != 200:
                continue
            summary = res.json()
        except Exception:
            continue

        # 1. Match Stats
        if not has_stats:
            by_side = {t.get("homeAway"): t.get("statistics", []) for t in summary.get("boxscore", {}).get("teams", [])}
            if "home" in by_side and "away" in by_side:
                payload_stats = {
                    "event_id": eid,
                    **{f"home_{col}": parse_stat_value(by_side["home"], key) for col, key in STAT_PAIRS},
                    **{f"away_{col}": parse_stat_value(by_side["away"], key) for col, key in STAT_PAIRS},
                }
                supabase.table("match_details").upsert([payload_stats], on_conflict="event_id").execute()

        # 2. Match Events
        if not has_events:
            formatted_events = []
            for ev in summary.get("keyEvents", []):
                ev_type = ev.get("type", {}).get("text", "")
                if "Goal" in ev_type or "Penalty - Scored" in ev_type:
                    mapped_type = "Goal"
                elif "Card" in ev_type:
                    mapped_type = "Card"
                elif "Substitution" in ev_type:
                    mapped_type = "subst"
                else:
                    continue

                parts = ev.get("clock", {}).get("displayValue", "0'").split("+")
                minute = int("".join(filter(str.isdigit, parts[0])) or 0)
                extra = int("".join(filter(str.isdigit, parts[1])) or 0) if len(parts) > 1 else None

                participants = ev.get("participants", [])
                p0 = participants[0].get("athlete", {}) if len(participants) > 0 else {}
                p1 = participants[1].get("athlete", {}) if len(participants) > 1 else {}

                formatted_events.append({
                    "time": {"elapsed": minute, "extra": extra},
                    "team": {"id": 0, "name": ev.get("team", {}).get("displayName", "")},
                    "player": {"id": int(p0.get("id", 0) or 0), "name": p0.get("displayName", "") if p0 else ev.get("shortText", "")},
                    "assist": {
                        "id": int(p1.get("id", 0) or 0) if p1 and mapped_type in ("Goal", "subst") else None,
                        "name": p1.get("displayName") if p1 and mapped_type in ("Goal", "subst") else None,
                    },
                    "type": mapped_type,
                    "detail": ev_type,
                })

            supabase.table("match_events").upsert([{"event_id": eid, "events": formatted_events}], on_conflict="event_id").execute()

        # 3. Match Lineups
        if not has_lineups:
            formatted_lineups = []
            for r in summary.get("rosters", []):
                team_info = r.get("team", {})
                start_xi, subs = [], []
                for entry in r.get("roster", []):
                    athlete = entry.get("athlete", {})
                    player_obj = {
                        "player": {
                            "id": int(athlete.get("id", 0) or 0),
                            "name": athlete.get("displayName", ""),
                            "number": int(entry.get("jersey", 0) or 0),
                            "pos": entry.get("position", {}).get("abbreviation", ""),
                            "grid": None,
                            "subbed_in": bool(entry.get("subbedIn")),
                            "subbed_out": bool(entry.get("subbedOut")),
                        }
                    }
                    (start_xi if entry.get("starter") else subs).append(player_obj)

                formatted_lineups.append({
                    "team": {
                        "id": int(team_info.get("id", 0) or 0),
                        "name": team_info.get("displayName", ""),
                        "logo": team_info.get("logo", ""),
                    },
                    "formation": r.get("formation", "N/A"),
                    "startXI": start_xi,
                    "substitutes": subs,
                })

            supabase.table("match_lineups").upsert([{"event_id": eid, "lineups": formatted_lineups}], on_conflict="event_id").execute()

        synced += 1
        time.sleep(0.5)

    print(f"Đã đồng bộ xong chi tiết cho {synced} trận đấu.")


if __name__ == "__main__":
    sync_match_details(limit_rows=1000 if "--backfill" in sys.argv else 250)