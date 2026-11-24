import { Match } from '../types/football';
import { MatchEventItem, TeamLineup } from '../types/matchDetail';
import { PlayerAnalyticsProfile } from '../types/playerAnalytics';
import { normalizePositionCode, POS_META } from '../utils/playerPosition';
import {
  buildCanonicalPlayerId,
  isSameClubName,
  isSamePlayerName,
  matchesSearchTokens,
} from '../utils/textNormalize';
import { buildPlayerAnalyticsProfile } from './playerAnalyticsEngine';
import { fetchAllSupabaseRows, getFullSeasonMatches } from './seasonHistoryService';

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
 * Quét bổ sung toàn bộ cầu thủ từ match_lineups và match_events
 * để đảm bảo không bỏ sót cầu thủ nào chưa có trong bảng players
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

  const findOrCreateEntry = (
    teamName: string,
    playerName: string,
    number = 0,
    pos?: string
  ): PlayerSeasonSummaryRow => {
    const canonical = buildCanonicalPlayerId(teamName, playerName);
    const exact = playerMap.get(canonical);
    if (exact) return exact;

    for (const item of playerMap.values()) {
      if (isSameClubName(item.team_name || '', teamName) && isSamePlayerName(item.name, playerName)) {
        return item;
      }
    }

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
        const entry = findOrCreateEntry(teamName, p.name, p.number || 0, p.pos);
        entry.starts = (entry.starts || 0) + 1;
        entry.appearances = (entry.appearances || 0) + 1;
        if (!entry.jersey_number && p.number) entry.jersey_number = p.number;
        if ((!entry.position_code || entry.position_code === 'CM') && p.pos) {
          entry.position_code = p.pos;
        }
      }

      for (const item of teamLineup.substitutes || []) {
        const p = item?.player;
        if (!p?.name) continue;
        const entry = findOrCreateEntry(teamName, p.name, p.number || 0, p.pos);
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
          const scorer = findOrCreateEntry(teamName, ev.player.name);
          scorer.goals = (scorer.goals || 0) + 1;
        }
        if (ev.assist?.name) {
          const assister = findOrCreateEntry(teamName, ev.assist.name);
          assister.assists = (assister.assists || 0) + 1;
        }
      } else if (ev.type === 'Card' && ev.player?.name) {
        const carded = findOrCreateEntry(teamName, ev.player.name);
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
  allMatches: Match[] = []
): Promise<PlayerAnalyticsProfile[]> {
  if (cachedPool && cachedPool.length > 0) return cachedPool;
  if (poolPromise) return poolPromise;

  poolPromise = (async () => {
    try {
      const [baseRows, lineupRows, fullMatches] = await Promise.all([
        fetchBaseSummaryRows(),
        fetchLineupDerivedRows(),
        getFullSeasonMatches(allMatches),
      ]);

      const mergedRows: PlayerSeasonSummaryRow[] = [...baseRows];

      for (const lRow of lineupRows) {
        const existing = mergedRows.find(
          (b) =>
            isSameClubName(b.team_name || '', lRow.team_name || '') &&
            isSamePlayerName(b.name, lRow.name)
        );
        if (existing) {
          // Bổ sung chỉ số từ lineup/events nếu bảng thống kê chính chưa có
          if ((existing.appearances || 0) === 0 && (lRow.appearances || 0) > 0) {
            existing.starts = lRow.starts;
            existing.sub_appearances = lRow.sub_appearances;
            existing.appearances = lRow.appearances;
            existing.goals = Math.max(existing.goals || 0, lRow.goals || 0);
            existing.assists = Math.max(existing.assists || 0, lRow.assists || 0);
            existing.yellow_cards = Math.max(existing.yellow_cards || 0, lRow.yellow_cards || 0);
            existing.red_cards = Math.max(existing.red_cards || 0, lRow.red_cards || 0);
          }
          if (!existing.jersey_number && lRow.jersey_number) {
            existing.jersey_number = lRow.jersey_number;
          }
        } else {
          mergedRows.push(lRow);
        }
      }

      const uniqueMap = new Map<string, PlayerAnalyticsProfile>();

      for (const row of mergedRows) {
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
          fullMatches
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