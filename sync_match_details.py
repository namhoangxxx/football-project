import os
import re
import sys
import time
import unicodedata
from datetime import datetime, timedelta
import requests
from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Thiếu SUPABASE_URL hoặc SUPABASE_KEY trong biến môi trường / .env!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}


def norm_team(name: str) -> str:
    s = unicodedata.normalize("NFD", (name or "").lower())
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = re.sub(r"\b(fc|cf|sc|ac|as|afc|ssc|rc|rcd|ud|cd|ca|sv|vfl|vfb|tsg|fsv|rb|bsc|1\.|de|la|el|los|las|real|club|sporting|athletic|atletico|olympique|borussia|eintracht|dynamo|sparta|slavia|red bull)\b", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    return s


def teams_similar(name_a: str, name_b: str) -> bool:
    a, b = norm_team(name_a), norm_team(name_b)
    if not a or not b:
        return False
    return a == b or a in b or b in a


def load_team_map() -> dict[int, int]:
    try:
        res = supabase.table("team_map").select("football_data_id, espn_id").execute()
        return {
            int(r["football_data_id"]): int(r["espn_id"])
            for r in (res.data or [])
            if r.get("football_data_id") and r.get("espn_id")
        }
    except Exception as e:
        print(f"⚠️ Lỗi đọc team_map: {e}")
        return {}


def save_team_map_entry(fd_id: int | None, espn_id: int | None, team_map_cache: dict[int, int]):
    if not fd_id or not espn_id or fd_id in team_map_cache:
        return
    try:
        supabase.table("team_map").upsert(
            [{"football_data_id": int(fd_id), "espn_id": int(espn_id)}],
            on_conflict="football_data_id",
        ).execute()
        team_map_cache[int(fd_id)] = int(espn_id)
        print(f"  🔗 [team_map] Đã tự động ánh xạ fd_id={fd_id} -> espn_id={espn_id}")
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

    dates_to_check = [
        dt.strftime("%Y%m%d"),
        (dt - timedelta(days=1)).strftime("%Y%m%d"),
        (dt + timedelta(days=1)).strftime("%Y%m%d"),
    ]

    for date_str in dates_to_check:
        url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{league_slug}/scoreboard?dates={date_str}"
        try:
            res = requests.get(url, headers=HEADERS, timeout=10)
            if res.status_code != 200:
                continue
            for ev in res.json().get("events", []):
                competitions = ev.get("competitions", [])
                if not competitions:
                    continue
                competitors = competitions[0].get("competitors", [])
                home_comp = next((c for c in competitors if c.get("homeAway") == "home"), None)
                away_comp = next((c for c in competitors if c.get("homeAway") == "away"), None)
                if not home_comp or not away_comp:
                    continue

                ev_home_id = int(home_comp["team"]["id"])
                ev_away_id = int(away_comp["team"]["id"])
                ev_home_name = home_comp["team"].get("displayName", "")
                ev_away_name = away_comp["team"].get("displayName", "")

                id_match_both = (
                    home_espn_id
                    and away_espn_id
                    and ev_home_id == home_espn_id
                    and ev_away_id == away_espn_id
                )
                id_match_one = (
                    (home_espn_id and ev_home_id == home_espn_id and teams_similar(away_name, ev_away_name))
                    or (away_espn_id and ev_away_id == away_espn_id and teams_similar(home_name, ev_home_name))
                )
                name_match_both = teams_similar(home_name, ev_home_name) and teams_similar(away_name, ev_away_name)

                if id_match_both or id_match_one or name_match_both:
                    # Tự cập nhật team_map nếu một trong hai đội chưa được lưu
                    save_team_map_entry(home_fd_id, ev_home_id, team_map)
                    save_team_map_entry(away_fd_id, ev_away_id, team_map)
                    return str(ev["id"])
        except Exception as e:
            print(f"  ⚠️ Lỗi scoreboard ESPN ({league_slug} - {date_str}): {e}")
    return None


def parse_stat_value(stats_list: list, stat_name: str) -> int:
    for item in stats_list:
        if item.get("name") == stat_name:
            val = str(item.get("displayValue", "0")).replace("%", "").strip()
            try:
                return int(float(val))
            except ValueError:
                return 0
    return 0


def sync_match_details(limit_rows: int = 250):
    print("🚀 [START] Đồng bộ chi tiết trận đấu (Stats + Events + Lineups) theo ESPN ID...\n")

    matches_res = (
        supabase.table("matches")
        .select("event_id, home_team, away_team, home_team_id, away_team_id, league, match_time, status")
        .eq("status", "FINISHED")
        .order("match_time", desc=True)
        .limit(limit_rows)
        .execute()
    )

    matches = matches_res.data or []
    print(f"📋 Quét {len(matches)} trận đấu đã kết thúc gần nhất.\n")
    if not matches:
        return

    all_ids = [str(m["event_id"]) for m in matches]

    # Kiểm tra cache theo lô thay vì gọi 3 query lẻ cho từng trận
    stats_cached: set[str] = set()
    events_cached: set[str] = set()
    lineups_cached: set[str] = set()

    for i in range(0, len(all_ids), 200):
        chunk_ids = all_ids[i : i + 200]
        s_res = supabase.table("match_details").select("event_id").in_("event_id", chunk_ids).execute()
        e_res = supabase.table("match_events").select("event_id").in_("event_id", chunk_ids).execute()
        l_res = supabase.table("match_lineups").select("event_id").in_("event_id", chunk_ids).execute()
        stats_cached.update(str(r["event_id"]) for r in (s_res.data or []))
        events_cached.update(str(r["event_id"]) for r in (e_res.data or []))
        lineups_cached.update(str(r["event_id"]) for r in (l_res.data or []))

    team_map = load_team_map()
    synced_count = 0

    for idx, m in enumerate(matches, start=1):
        event_id = str(m["event_id"])
        has_stats = event_id in stats_cached
        has_events = event_id in events_cached
        has_lineups = event_id in lineups_cached

        if has_stats and has_events and has_lineups:
            continue

        home_name = m["home_team"]
        away_name = m["away_team"]
        league_name = m.get("league", "")
        match_time = m["match_time"]

        print(f"[{idx}/{len(matches)}] {home_name} vs {away_name} ({league_name})")

        league_slug = LEAGUE_SLUG_MAP.get(league_name)
        if not league_slug:
            print(f"  ⚠️ Giải '{league_name}' chưa hỗ trợ mapping ESPN -> Bỏ qua!")
            continue

        espn_id = find_espn_event_id(
            league_slug,
            match_time,
            m.get("home_team_id"),
            m.get("away_team_id"),
            home_name,
            away_name,
            team_map,
        )
        if not espn_id:
            print("  ❌ Không tìm thấy trận tương ứng trên ESPN.")
            continue

        summary_url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{league_slug}/summary?event={espn_id}"
        try:
            res = requests.get(summary_url, headers=HEADERS, timeout=12)
            if res.status_code != 200:
                print(f"  ❌ Lỗi tải summary ESPN (HTTP {res.status_code})")
                continue
            summary = res.json()
        except Exception as e:
            print(f"  ⚠️ Lỗi kết nối summary ESPN: {e}")
            continue

        # 1. MATCH STATS
        if not has_stats:
            box_teams = summary.get("boxscore", {}).get("teams", [])
            if len(box_teams) >= 2:
                home_stats = (
                    box_teams[0].get("statistics", [])
                    if box_teams[0].get("homeAway") == "home"
                    else box_teams[1].get("statistics", [])
                )
                away_stats = (
                    box_teams[1].get("statistics", [])
                    if box_teams[1].get("homeAway") == "away"
                    else box_teams[0].get("statistics", [])
                )

                payload_stats = {
                    "event_id": event_id,
                    "home_possession": parse_stat_value(home_stats, "possessionPct"),
                    "away_possession": parse_stat_value(away_stats, "possessionPct"),
                    "home_shots": parse_stat_value(home_stats, "totalShots"),
                    "away_shots": parse_stat_value(away_stats, "totalShots"),
                    "home_shots_on_target": parse_stat_value(home_stats, "shotsOnTarget"),
                    "away_shots_on_target": parse_stat_value(away_stats, "shotsOnTarget"),
                    "home_corners": parse_stat_value(home_stats, "wonCorners"),
                    "away_corners": parse_stat_value(away_stats, "wonCorners"),
                    "home_fouls": parse_stat_value(home_stats, "foulsCommitted"),
                    "away_fouls": parse_stat_value(away_stats, "foulsCommitted"),
                }
                supabase.table("match_details").upsert([payload_stats], on_conflict="event_id").execute()
                print("  ✅ [Saved] Match Stats")

        # 2. MATCH EVENTS
        if not has_events:
            key_events = summary.get("keyEvents", [])
            formatted_events = []
            for ev in key_events:
                ev_type_text = ev.get("type", {}).get("text", "")
                clock_str = ev.get("clock", {}).get("displayValue", "0'")
                minute_num = int("".join(filter(str.isdigit, clock_str.split("+")[0])) or 0)
                extra_num = (
                    int("".join(filter(str.isdigit, clock_str.split("+")[1])) or 0)
                    if "+" in clock_str
                    else None
                )

                mapped_type = "Other"
                if "Goal" in ev_type_text or "Penalty - Scored" in ev_type_text:
                    mapped_type = "Goal"
                elif "Card" in ev_type_text:
                    mapped_type = "Card"
                elif "Substitution" in ev_type_text:
                    mapped_type = "subst"

                if mapped_type == "Other":
                    continue

                participants = ev.get("participants", [])
                p0 = participants[0].get("athlete", {}) if len(participants) > 0 else {}
                p1 = participants[1].get("athlete", {}) if len(participants) > 1 else {}

                player_name = p0.get("displayName", "") if p0 else ev.get("shortText", "")
                player_id = int(p0.get("id", 0) or 0)
                assist_name = p1.get("displayName", None) if p1 and mapped_type in ("Goal", "subst") else None
                assist_id = int(p1.get("id", 0) or 0) if p1 and mapped_type in ("Goal", "subst") else None

                formatted_events.append(
                    {
                        "time": {"elapsed": minute_num, "extra": extra_num},
                        "team": {"id": 0, "name": ev.get("team", {}).get("displayName", "")},
                        "player": {"id": player_id, "name": player_name},
                        "assist": {"id": assist_id, "name": assist_name},
                        "type": mapped_type,
                        "detail": ev_type_text,
                    }
                )

            supabase.table("match_events").upsert(
                [{"event_id": event_id, "events": formatted_events}],
                on_conflict="event_id",
            ).execute()
            print(f"  ✅ [Saved] Events ({len(formatted_events)} sự kiện)")

        # 3. MATCH LINEUPS (kèm cờ subbed_in / subbed_out để File 3 tính đúng phút thi đấu)
        if not has_lineups:
            rosters = summary.get("rosters", [])
            formatted_lineups = []
            for r in rosters:
                team_info = r.get("team", {})
                formation = r.get("formation", "N/A")
                start_xi = []
                subs = []

                for entry in r.get("roster", []):
                    athlete = entry.get("athlete", {})
                    subbed_in = bool(entry.get("subbedIn"))
                    subbed_out = bool(entry.get("subbedOut"))
                    is_starter = bool(entry.get("starter"))

                    player_obj = {
                        "player": {
                            "id": int(athlete.get("id", 0) or 0),
                            "name": athlete.get("displayName", ""),
                            "number": int(entry.get("jersey", 0) or 0),
                            "pos": entry.get("position", {}).get("abbreviation", ""),
                            "grid": None,
                            "subbed_in": subbed_in,
                            "subbed_out": subbed_out,
                        }
                    }
                    if is_starter:
                        start_xi.append(player_obj)
                    else:
                        subs.append(player_obj)

                formatted_lineups.append(
                    {
                        "team": {
                            "id": int(team_info.get("id", 0) or 0),
                            "name": team_info.get("displayName", ""),
                            "logo": team_info.get("logo", ""),
                        },
                        "formation": formation,
                        "startXI": start_xi,
                        "substitutes": subs,
                    }
                )

            supabase.table("match_lineups").upsert(
                [{"event_id": event_id, "lineups": formatted_lineups}],
                on_conflict="event_id",
            ).execute()
            print("  ✅ [Saved] Lineups")

        synced_count += 1
        time.sleep(0.5)

    print(f"\n🎉 [COMPLETE] Đã đồng bộ xong chi tiết cho {synced_count} trận đấu!")


if __name__ == "__main__":
    limit = 1000 if "--backfill" in sys.argv else 250
    sync_match_details(limit_rows=limit)