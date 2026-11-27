import { SUPABASE_HEADERS, SUPABASE_URL } from '../config/supabase';
import { Match } from '../types/football';
import { TeamLineup } from '../types/matchDetail';
import {
  normalizePositionCode,
  PlayerPositionCode,
  POS_META,
} from '../utils/playerPosition';
import { isSameClubName, isSamePlayerName, normalizeSearchText } from '../utils/textNormalize';
import {
  matchesResolvedTeam,
  ResolvedTeamIdentity,
  resolveTeamFromMap,
} from './teamMapService';

export interface ClubSeasonSummary {
  played: number;
  won: number;
  draw: number;
  lost: number;
  gf: number;
  ga: number;
  cleanSheets: number;
  homeRecord: string;
  awayRecord: string;
}

export interface ClubPlayerItem {
  id: number;
  name: string;
  number: number;
  pos: PlayerPositionCode;
  appearances: number;
  nationality?: string;
  age?: number;
  photoUrl?: string;
}

const GENERIC_ROSTER_CODES = new Set<string>(['CB', 'CM', 'CF']);
const squadCache = new Map<string, ClubPlayerItem[]>();

const isSubRole = (raw?: string): boolean => {
  const s = (raw || '').trim().toUpperCase();
  return !s || s === 'SUB' || s === 'SUBSTITUTE' || s === 'BENCH';
};

export const computeClubSeasonSummary = (
  matches: Match[],
  teamId: number,
  teamName: string
): ClubSeasonSummary => {
  const finished = matches.filter((m) => m.status === 'FINISHED');
  let won = 0, draw = 0, lost = 0, gf = 0, ga = 0, cleanSheets = 0;
  let hW = 0, hD = 0, hL = 0, aW = 0, aD = 0, aL = 0;

  finished.forEach((m) => {
    const isHome =
      (teamId > 0 && m.home_team_id === teamId) || isSameClubName(m.home_team, teamName);
    const scored = Number(isHome ? m.home_score : m.away_score) || 0;
    const conceded = Number(isHome ? m.away_score : m.home_score) || 0;

    gf += scored;
    ga += conceded;
    if (conceded === 0) cleanSheets++;

    if (scored > conceded) {
      won++;
      isHome ? hW++ : aW++;
    } else if (scored < conceded) {
      lost++;
      isHome ? hL++ : aL++;
    } else {
      draw++;
      isHome ? hD++ : aD++;
    }
  });

  return {
    played: finished.length,
    won,
    draw,
    lost,
    gf,
    ga,
    cleanSheets,
    homeRecord: `${hW}T - ${hD}H - ${hL}B`,
    awayRecord: `${aW}T - ${aD}H - ${aL}B`,
  };
};

const fetchSquadFromPlayers = async (
  identity: ResolvedTeamIdentity
): Promise<ClubPlayerItem[]> => {
  const orFilter = identity.rawNames
    .map((n) => n.replace(/[",()]/g, '').trim())
    .filter(Boolean)
    .map((n) => `team_name.ilike.*${encodeURIComponent(n)}*`)
    .join(',');

  if (!orFilter) return [];

  let pRes = await fetch(
    `${SUPABASE_URL}/rest/v1/player_season_summary_view?or=(${orFilter})&select=*`,
    { headers: SUPABASE_HEADERS }
  );
  const usedView = pRes.ok;

  if (!usedView) {
    pRes = await fetch(
      `${SUPABASE_URL}/rest/v1/players?or=(${orFilter})&select=*`,
      { headers: SUPABASE_HEADERS }
    );
  }
  if (!pRes.ok) return [];

  const rawRows = await pRes.json();
  const pRows = Array.isArray(rawRows)
    ? rawRows.filter((p: any) =>
        matchesResolvedTeam(identity, p.team_name, p.team_id ?? p.espn_team_id)
      )
    : [];

  const appCount = new Map<number, number>();
  if (!usedView && pRows.length > 0) {
    const ids = pRows.map((p: any) => p.player_id).join(',');
    const sRes = await fetch(
      `${SUPABASE_URL}/rest/v1/player_match_stats?player_id=in.(${ids})&select=player_id&limit=3000`,
      { headers: SUPABASE_HEADERS }
    );
    if (sRes.ok) {
      const sRows = await sRes.json();
      sRows.forEach((r: { player_id: number }) => {
        appCount.set(r.player_id, (appCount.get(r.player_id) || 0) + 1);
      });
    }
  }

  return pRows.map((p: any) => {
    const pid = Number(p.player_id);
    const apps = usedView
      ? Number(p.appearances) || (Number(p.starts) || 0) + (Number(p.sub_appearances) || 0)
      : appCount.get(pid) || 0;

    return {
      id: pid,
      name: p.name,
      number: p.jersey_number || 0,
      pos: normalizePositionCode(p.position_code),
      appearances: apps,
      nationality: p.nationality || undefined,
      age: p.age || undefined,
      photoUrl: p.photo_url || undefined,
    };
  });
};

interface LineupAggItem extends ClubPlayerItem {
  startPosCounts: Map<PlayerPositionCode, number>;
}

const getPrimaryStartPos = (counts: Map<PlayerPositionCode, number>): PlayerPositionCode | null => {
  let bestPos: PlayerPositionCode | null = null;
  let maxCount = 0;
  counts.forEach((count, code) => {
    if (count > maxCount) {
      maxCount = count;
      bestPos = code;
    }
  });
  return bestPos;
};

const mergeSquadFromLineups = async (
  matches: Match[],
  identity: ResolvedTeamIdentity,
  squadList: ClubPlayerItem[]
): Promise<void> => {
  const eventIds = matches
    .filter((m) => m.status === 'FINISHED')
    .slice(0, 15)
    .map((m) => String(m.event_id).trim())
    .filter(Boolean);

  if (eventIds.length === 0) return;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/match_lineups?event_id=in.(${eventIds.join(',')})&select=lineups`,
    { headers: SUPABASE_HEADERS }
  );
  if (!res.ok) return;

  const rows = await res.json();
  const lineupAgg = new Map<string, LineupAggItem>();

  rows.forEach((row: { lineups?: TeamLineup[] }) => {
    const teamLineup = row.lineups?.find((l) =>
      matchesResolvedTeam(identity, l.team?.name, l.team?.id)
    );
    if (!teamLineup) return;

    const recordPlayer = (player: any, isStarter: boolean) => {
      if (!player?.name) return;
      const key = normalizeSearchText(player.name);
      const validPos = !isSubRole(player.pos) ? normalizePositionCode(player.pos) : null;

      const existing = lineupAgg.get(key);
      if (existing) {
        existing.appearances += 1;
        if (!existing.number && player.number) existing.number = player.number;
        if (isStarter && validPos) {
          existing.startPosCounts.set(validPos, (existing.startPosCounts.get(validPos) || 0) + 1);
        }
      } else {
        const startPosCounts = new Map<PlayerPositionCode, number>();
        if (isStarter && validPos) startPosCounts.set(validPos, 1);
        lineupAgg.set(key, {
          id: player.id || lineupAgg.size + 100000,
          name: player.name,
          number: player.number || 0,
          pos: validPos || normalizePositionCode(player.pos),
          appearances: 1,
          startPosCounts,
        });
      }
    };

    (teamLineup.startXI || []).forEach(({ player }) => recordPlayer(player, true));
    (teamLineup.substitutes || []).forEach(({ player }) => recordPlayer(player, false));
  });

  lineupAgg.forEach((lPlayer) => {
    const primaryStartPos = getPrimaryStartPos(lPlayer.startPosCounts);
    const found = squadList.find((s) => isSamePlayerName(s.name, lPlayer.name));

    if (found) {
      if (found.appearances === 0) found.appearances = lPlayer.appearances;
      if (!found.number && lPlayer.number) found.number = lPlayer.number;

      // Tinh chỉnh từ mã chung (CB/CM/CF) sang vị trí sở trường cụ thể (LB/RB/CDM/CAM/LW/RW/ST)
      if (
        primaryStartPos &&
        GENERIC_ROSTER_CODES.has(found.pos) &&
        POS_META[primaryStartPos]?.group === POS_META[found.pos]?.group
      ) {
        found.pos = primaryStartPos;
      }
    } else {
      const { startPosCounts: _ignored, ...cleanPlayer } = lPlayer;
      squadList.push({
        ...cleanPlayer,
        pos: primaryStartPos || lPlayer.pos,
      });
    }
  });
};

export const fetchClubSquadFromLineups = async (
  matches: Match[],
  teamName: string,
  teamId?: number
): Promise<ClubPlayerItem[]> => {
  const identity = await resolveTeamFromMap(teamId, teamName);
  if (identity.rawNames.length === 0 && identity.ids.size === 0) return [];

  const squadList = await fetchSquadFromPlayers(identity).catch(() => []);
  await mergeSquadFromLineups(matches, identity, squadList).catch(() => {});

  identity.normalizedNames.forEach((normName) => {
    squadCache.set(normName, squadList);
  });

  return squadList;
};

export const resolveOfficialPlayerPosition = async (
  playerId?: number,
  playerName?: string,
  teamName?: string
): Promise<PlayerPositionCode | null> => {
  // 1. Ưu tiên lấy từ cache đội hình CLB đã chuẩn hóa để đồng bộ 100% giữa ClubSquadTab và PlayerDetailScreen
  if (teamName) {
    const cachedSquad = squadCache.get(normalizeSearchText(teamName));
    if (cachedSquad) {
      const hit =
        (playerId && cachedSquad.find((p) => p.id === playerId)) ||
        (playerName && cachedSquad.find((p) => isSamePlayerName(p.name, playerName)));
      if (hit) return hit.pos;
    }
  }

  // 2. Tra cứu trực tiếp bảng players trong Supabase
  try {
    if (playerId && playerId > 0 && playerId < 100000) {
      const byIdRes = await fetch(
        `${SUPABASE_URL}/rest/v1/players?player_id=eq.${playerId}&select=position_code&limit=1`,
        { headers: SUPABASE_HEADERS }
      );
      if (byIdRes.ok) {
        const rows = await byIdRes.json();
        if (Array.isArray(rows) && rows[0]?.position_code) {
          return normalizePositionCode(rows[0].position_code);
        }
      }
    }

    if (playerName?.trim()) {
      const cleanName = playerName.replace(/[",()]/g, '').trim();
      const byNameRes = await fetch(
        `${SUPABASE_URL}/rest/v1/players?name=ilike.*${encodeURIComponent(cleanName)}*&select=name,team_name,position_code&limit=10`,
        { headers: SUPABASE_HEADERS }
      );
      if (byNameRes.ok) {
        const rows = await byNameRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const exact =
            rows.find(
              (r: any) =>
                isSamePlayerName(r.name, playerName) &&
                (!teamName || isSameClubName(r.team_name, teamName))
            ) || rows.find((r: any) => isSamePlayerName(r.name, playerName));

          if (exact?.position_code) {
            return normalizePositionCode(exact.position_code);
          }
        }
      }
    }
  } catch {}

  return null;
};