import { Match } from '../types/football';
import { MatchEventItem, TeamLineup } from '../types/matchDetail';
import { PlayerAnalyticsProfile } from '../types/playerAnalytics';
import { normalizePositionCode, POS_META } from '../utils/playerPosition';
import { buildCanonicalPlayerId, matchesSearchTokens } from '../utils/textNormalize';
import { buildPlayerAnalyticsProfile } from './playerAnalyticsEngine';
import { fetchAllSupabaseRows } from './seasonHistoryService';

let cachedPool: PlayerAnalyticsProfile[] | null = null;
let poolPromise: Promise<PlayerAnalyticsProfile[]> | null = null;

interface PlayerSeasonSummaryRow {
  player_id?: number | string;
  name: string;
  team_name?: string | null;
  jersey_number?: number | string | null;
  position_code?: string | null;
  appearances?: number | null;
  starts?: number | null;
  sub_appearances?: number | null;
  goals?: number | null;
  assists?: number | null;
  yellow_cards?: number | null;
  red_cards?: number | null;
}

const SUMMARY_VIEW_COLUMNS =
  'player_id,name,team_name,jersey_number,position_code,appearances,starts,sub_appearances,goals,assists,yellow_cards,red_cards';

async function fetchBaseSummaryRows(): Promise<PlayerSeasonSummaryRow[]> {
  const viewRows = await fetchAllSupabaseRows<PlayerSeasonSummaryRow>(
    'player_season_summary_view',
    SUMMARY_VIEW_COLUMNS,
    'name.asc'
  );

  if (viewRows.length > 0) {
    return viewRows;
  }

  const [players, stats] = await Promise.all([
    fetchAllSupabaseRows<any>(
      'players',
      'player_id,name,team_name,jersey_number,position_code',
      'name.asc'
    ),
    fetchAllSupabaseRows<any>(
      'player_match_stats',
      'player_id,is_starter,goals,assists,yellow_cards,red_cards'
    ),
  ]);

  const aggByPlayerId = new Map<
    number,
    { starts: number; subs: number; goals: number; assists: number; yellows: number; reds: number }
  >();

  for (const st of stats) {
    const pid = Number(st.player_id);
    if (!pid) continue;
    const cur = aggByPlayerId.get(pid) || {
      starts: 0,
      subs: 0,
      goals: 0,
      assists: 0,
      yellows: 0,
      reds: 0,
    };
    st.is_starter ? cur.starts++ : cur.subs++;
    cur.goals += Number(st.goals) || 0;
    cur.assists += Number(st.assists) || 0;
    cur.yellows += Number(st.yellow_cards) || 0;
    cur.reds += Number(st.red_cards) || 0;
    aggByPlayerId.set(pid, cur);
  }

  return players.map((p: any) => {
    const pid = Number(p.player_id);
    const agg = aggByPlayerId.get(pid);
    const starts = agg?.starts ?? 0;
    const subAppearances = agg?.subs ?? 0;

    return {
      player_id: p.player_id,
      name: p.name,
      team_name: p.team_name,
      jersey_number: p.jersey_number,
      position_code: p.position_code,
      appearances: starts + subAppearances,
      starts,
      sub_appearances: subAppearances,
      goals: agg?.goals ?? 0,
      assists: agg?.assists ?? 0,
      yellow_cards: agg?.yellows ?? 0,
      red_cards: agg?.reds ?? 0,
    };
  });
}

/**
 * Fallback O(1) qua Map chỉ dùng khi view/bảng players trên Supabase chưa có dữ liệu
 */
async function fetchLineupDerivedRows(): Promise<PlayerSeasonSummaryRow[]> {
  const [lineupRows, eventRows] = await Promise.all([
    fetchAllSupabaseRows<{ event_id: string | number; lineups?: TeamLineup[] }>(
      'match_lineups',
      'event_id,lineups'
    ),
    fetchAllSupabaseRows<{ event_id: string | number; events?: MatchEventItem[] }>(
      'match_events',
      'event_id,events'
    ),
  ]);

  if (lineupRows.length === 0) return [];

  const playerMap = new Map<string, PlayerSeasonSummaryRow>();

  const getOrCreateEntry = (
    teamName: string,
    playerName: string,
    number = 0,
    pos?: string
  ): PlayerSeasonSummaryRow => {
    const canonical = buildCanonicalPlayerId(teamName, playerName);
    const existing = playerMap.get(canonical);
    if (existing) return existing;

    const created: PlayerSeasonSummaryRow = {
      name: playerName.trim(),
      team_name: teamName.trim(),
      jersey_number: number,
      position_code: pos || 'CM',
      appearances: 0,
      starts: 0,
      sub_appearances: 0,
      goals: 0,
      assists: 0,
      yellow_cards: 0,
      red_cards: 0,
    };
    playerMap.set(canonical, created);
    return created;
  };

  for (const row of lineupRows) {
    if (!Array.isArray(row.lineups)) continue;
    for (const teamLineup of row.lineups) {
      const teamName = teamLineup.team?.name;
      if (!teamName) continue;

      for (const item of teamLineup.startXI || []) {
        const p = item?.player;
        if (!p?.name) continue;
        const entry = getOrCreateEntry(teamName, p.name, p.number || 0, p.pos);
        entry.starts = (entry.starts || 0) + 1;
        entry.appearances = (entry.appearances || 0) + 1;
        if (!entry.jersey_number && p.number) entry.jersey_number = p.number;
        if ((!entry.position_code || entry.position_code === 'CM') && p.pos) {
          entry.position_code = p.pos;
        }
      }

      for (const item of teamLineup.substitutes || []) {
        const p = item?.player as (typeof item.player & { subbed_in?: boolean }) | undefined;
        if (!p?.name || !p.subbed_in) continue;
        const entry = getOrCreateEntry(teamName, p.name, p.number || 0, p.pos);
        entry.sub_appearances = (entry.sub_appearances || 0) + 1;
        entry.appearances = (entry.appearances || 0) + 1;
        if (!entry.jersey_number && p.number) entry.jersey_number = p.number;
        if ((!entry.position_code || entry.position_code === 'CM') && p.pos) {
          entry.position_code = p.pos;
        }
      }
    }
  }

  for (const row of eventRows) {
    if (!Array.isArray(row.events)) continue;
    for (const ev of row.events) {
      const teamName = ev.team?.name;
      if (!teamName) continue;

      if (ev.type === 'Goal' && !String(ev.detail || '').toLowerCase().includes('own')) {
        if (ev.player?.name) {
          const scorer = getOrCreateEntry(teamName, ev.player.name);
          scorer.goals = (scorer.goals || 0) + 1;
        }
        if (ev.assist?.name) {
          const assister = getOrCreateEntry(teamName, ev.assist.name);
          assister.assists = (assister.assists || 0) + 1;
        }
      } else if (ev.type === 'Card' && ev.player?.name) {
        const carded = getOrCreateEntry(teamName, ev.player.name);
        if (String(ev.detail || '').toLowerCase().includes('red')) {
          carded.red_cards = (carded.red_cards || 0) + 1;
        } else {
          carded.yellow_cards = (carded.yellow_cards || 0) + 1;
        }
      }
    }
  }

  return Array.from(playerMap.values());
}

export async function fetchAllPlayersAnalyticsPool(
  _allMatches: Match[] = []
): Promise<PlayerAnalyticsProfile[]> {
  if (cachedPool && cachedPool.length > 0) return cachedPool;
  if (poolPromise) return poolPromise;

  poolPromise = (async () => {
    try {
      let rows = await fetchBaseSummaryRows();
      if (rows.length === 0) {
        rows = await fetchLineupDerivedRows();
      }

      const uniqueMap = new Map<string, PlayerAnalyticsProfile>();

      for (const row of rows) {
        if (!row?.name) continue;

        const starts = Number(row.starts) || 0;
        const subAppearances = Number(row.sub_appearances) || 0;
        const totalApps = Number(row.appearances) || starts + subAppearances;
        const estMinutes = starts * 82 + subAppearances * 24;

        const profile = buildPlayerAnalyticsProfile(
          {
            name: row.name,
            teamName: row.team_name || 'Unknown FC',
            number: Number(row.jersey_number) || 0,
            pos: normalizePositionCode(row.position_code ?? undefined),
            rawStats:
              totalApps > 0
                ? {
                    appearances: totalApps,
                    minutes: estMinutes > 0 ? estMinutes : undefined,
                    goals: Number(row.goals) || 0,
                    assists: Number(row.assists) || 0,
                    yellow_cards: Number(row.yellow_cards) || 0,
                    red_cards: Number(row.red_cards) || 0,
                  }
                : undefined,
          },
          []
        );

        const canonicalId = buildCanonicalPlayerId(profile.teamName, profile.name);
        if (!uniqueMap.has(canonicalId)) {
          uniqueMap.set(canonicalId, {
            ...profile,
            id: canonicalId,
          });
        }
      }

      const pool = Array.from(uniqueMap.values());
      if (pool.length > 0) cachedPool = pool;
      return pool;
    } catch {
      return [];
    } finally {
      poolPromise = null;
    }
  })();

  return poolPromise;
}

const GROUP_ALIAS_MAP: Record<string, 'GK' | 'DEF' | 'MID' | 'FWD'> = {
  GK: 'GK',
  DF: 'DEF',
  DEF: 'DEF',
  MF: 'MID',
  MID: 'MID',
  FW: 'FWD',
  FWD: 'FWD',
};

export function filterPlayersPool(
  pool: PlayerAnalyticsProfile[],
  query: string,
  posFilter = 'ALL'
): PlayerAnalyticsProfile[] {
  const normalizedFilter = String(posFilter || 'ALL').trim().toUpperCase();
  const targetGroup = GROUP_ALIAS_MAP[normalizedFilter];

  return pool.filter((p) => {
    if (normalizedFilter !== 'ALL') {
      if (targetGroup) {
        if (POS_META[p.pos]?.group !== targetGroup) return false;
      } else if (p.pos !== normalizedFilter) {
        return false;
      }
    }
    return matchesSearchTokens([p.name, p.teamName, p.pos, String(p.number || '')], query);
  });
}