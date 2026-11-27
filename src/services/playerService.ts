import { SUPABASE_HEADERS, SUPABASE_URL } from '../config/supabase';
import { Match } from '../types/football';
import { MatchEventItem, TeamLineup } from '../types/matchDetail';
import { normalizePositionCode, PlayerPositionCode } from '../utils/playerPosition';
import { isSameClubName, isSamePlayerName, normalizeSearchText } from '../utils/textNormalize';
import { getFullSeasonMatches } from './seasonHistoryService';

export interface PlayerMatchHistoryItem {
  eventId: string | number;
  opponent: string;
  score: string;
  role: 'Đá chính' | 'Dự bị';
  goals: number;
  assists: number;
}

export interface PlayerProfileSummary {
  name: string;
  number: number;
  pos: PlayerPositionCode;
  teamName: string;
  nationality?: string;
  age?: number;
  height?: string;
  photoUrl?: string;
  starts: number;
  subAppearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  recentMatches: PlayerMatchHistoryItem[];
}

interface PlayerSummaryRow {
  player_id: number | string;
  name: string;
  team_name?: string | null;
  jersey_number?: number | string | null;
  position_code?: string | null;
  nationality?: string | null;
  age?: number | null;
  height?: string | null;
  photo_url?: string | null;
  starts?: number | null;
  sub_appearances?: number | null;
  goals?: number | null;
  assists?: number | null;
  yellow_cards?: number | null;
  red_cards?: number | null;
}

interface PlayerMatchStatRow {
  event_id: number | string;
  is_starter?: boolean | null;
  goals?: number | null;
  assists?: number | null;
  yellow_cards?: number | null;
  red_cards?: number | null;
}

const isSubRole = (raw?: string): boolean => {
  const s = (raw || '').trim().toUpperCase();
  return !s || s === 'SUB' || s === 'SUBSTITUTE' || s === 'BENCH';
};

async function queryPlayerRecords(
  relation: 'player_season_summary_view' | 'players',
  trimmedName: string,
  normTargetName: string
): Promise<PlayerSummaryRow[] | null> {
  const exactRes = await fetch(
    `${SUPABASE_URL}/rest/v1/${relation}?name=ilike.${encodeURIComponent(trimmedName)}&select=*&limit=10`,
    { headers: SUPABASE_HEADERS }
  );

  if (!exactRes.ok) {
    return null;
  }

  const exactRows: PlayerSummaryRow[] = (await exactRes.json()) || [];
  if (exactRows.length > 0 || !normTargetName) {
    return exactRows;
  }

  const tokens = trimmedName.split(/\s+/).filter((t) => t.length >= 3);
  const searchToken = tokens[tokens.length - 1] || trimmedName;
  const fuzzyRes = await fetch(
    `${SUPABASE_URL}/rest/v1/${relation}?name=ilike.${encodeURIComponent(`%${searchToken}%`)}&select=*&limit=30`,
    { headers: SUPABASE_HEADERS }
  );

  if (!fuzzyRes.ok) {
    return [];
  }

  const fuzzyRows: PlayerSummaryRow[] = (await fuzzyRes.json()) || [];
  return fuzzyRows.filter((r) => isSamePlayerName(r?.name, trimmedName));
}

function buildRecentMatches(
  statRows: PlayerMatchStatRow[],
  seasonMatches: Match[],
  teamName: string,
  resolvedTeamName: string
): PlayerMatchHistoryItem[] {
  const matchByEventId = new Map(seasonMatches.map((m) => [String(m.event_id), m]));
  const itemsWithTime: Array<PlayerMatchHistoryItem & { timestamp: number }> = [];

  for (const st of statRows) {
    const m = matchByEventId.get(String(st.event_id));
    if (!m) continue;

    const isHome =
      isSameClubName(m.home_team, teamName) ||
      (!isSameClubName(m.away_team, teamName) && isSameClubName(m.home_team, resolvedTeamName));
    const parsedTime = m.match_time ? new Date(m.match_time).getTime() : 0;

    itemsWithTime.push({
      eventId: m.event_id,
      opponent: isHome ? `vs ${m.away_team}` : `@ ${m.home_team}`,
      score: `${m.home_score ?? 0} - ${m.away_score ?? 0}`,
      role: st.is_starter ? 'Đá chính' : 'Dự bị',
      goals: Number(st.goals) || 0,
      assists: Number(st.assists) || 0,
      timestamp: Number.isNaN(parsedTime) ? 0 : parsedTime,
    });
  }

  return itemsWithTime
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10)
    .map(({ timestamp: _timestamp, ...item }) => item);
}

async function aggregateFromClubLineupsAndEvents(
  playerName: string,
  teamName: string,
  seasonMatches: Match[],
  fallbackNumber: number,
  fallbackPos: PlayerPositionCode,
  preserveOfficialPos: boolean
) {
  const clubFinished = seasonMatches
    .filter(
      (m) =>
        m.status === 'FINISHED' &&
        (isSameClubName(m.home_team, teamName) || isSameClubName(m.away_team, teamName))
    )
    .sort((a, b) => {
      const ta = a.match_time ? new Date(a.match_time).getTime() : 0;
      const tb = b.match_time ? new Date(b.match_time).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 38);

  const eventIds = clubFinished.map((m) => String(m.event_id).trim()).filter(Boolean);
  if (eventIds.length === 0) return null;

  const idList = eventIds.join(',');
  const [lRes, eRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/match_lineups?event_id=in.(${idList})&select=event_id,lineups`, {
      headers: SUPABASE_HEADERS,
    }),
    fetch(`${SUPABASE_URL}/rest/v1/match_events?event_id=in.(${idList})&select=event_id,events`, {
      headers: SUPABASE_HEADERS,
    }),
  ]);

  if (!lRes.ok) return null;
  const lineupRows: Array<{ event_id: string | number; lineups?: TeamLineup[] }> =
    (await lRes.json()) || [];
  const eventRows: Array<{ event_id: string | number; events?: MatchEventItem[] }> = eRes.ok
    ? (await eRes.json()) || []
    : [];

  const eventsByMatch = new Map<string, MatchEventItem[]>();
  for (const er of eventRows) {
    if (Array.isArray(er.events)) {
      eventsByMatch.set(String(er.event_id), er.events);
    }
  }

  let starts = 0;
  let subAppearances = 0;
  let goals = 0;
  let assists = 0;
  let yellowCards = 0;
  let redCards = 0;
  let detectedNumber = fallbackNumber;
  const startPosCounts = new Map<PlayerPositionCode, number>();
  const statRows: PlayerMatchStatRow[] = [];

  for (const lr of lineupRows) {
    const teamLineup = lr.lineups?.find((l) => isSameClubName(l.team?.name, teamName));
    if (!teamLineup) continue;

    const starter = (teamLineup.startXI || []).find((x) =>
      isSamePlayerName(x.player?.name, playerName)
    );
    const sub = !starter
      ? (teamLineup.substitutes || []).find((x) => isSamePlayerName(x.player?.name, playerName))
      : undefined;

    if (!starter && !sub) continue;

    const pObj = (starter || sub)!.player;
    if (!detectedNumber && pObj.number) detectedNumber = pObj.number;

    const isStarter = Boolean(starter);
    if (isStarter) {
      starts++;
      if (!isSubRole(pObj.pos)) {
        const code = normalizePositionCode(pObj.pos);
        startPosCounts.set(code, (startPosCounts.get(code) || 0) + 1);
      }
    } else {
      subAppearances++;
    }

    let matchGoals = 0;
    let matchAssists = 0;
    const matchEvents = eventsByMatch.get(String(lr.event_id)) || [];

    for (const ev of matchEvents) {
      if (ev.team?.name && !isSameClubName(ev.team.name, teamName)) continue;
      if (ev.type === 'Goal' && !String(ev.detail || '').toLowerCase().includes('own')) {
        if (isSamePlayerName(ev.player?.name, playerName)) {
          matchGoals++;
          goals++;
        }
        if (ev.assist?.name && isSamePlayerName(ev.assist.name, playerName)) {
          matchAssists++;
          assists++;
        }
      } else if (ev.type === 'Card' && isSamePlayerName(ev.player?.name, playerName)) {
        if (String(ev.detail || '').toLowerCase().includes('red')) redCards++;
        else yellowCards++;
      }
    }

    statRows.push({
      event_id: lr.event_id,
      is_starter: isStarter,
      goals: matchGoals,
      assists: matchAssists,
    });
  }

  if (starts + subAppearances === 0) return null;

  let detectedPos = fallbackPos;
  if (!preserveOfficialPos && startPosCounts.size > 0) {
    let maxCount = 0;
    startPosCounts.forEach((count, code) => {
      if (count > maxCount) {
        maxCount = count;
        detectedPos = code;
      }
    });
  }

  return {
    number: detectedNumber,
    pos: detectedPos,
    starts,
    subAppearances,
    goals,
    assists,
    yellowCards,
    redCards,
    recentMatches: buildRecentMatches(statRows, seasonMatches, teamName, teamName),
  };
}

export const fetchPlayerProfileSummary = async (
  playerName: string,
  teamName: string,
  allMatches: Match[],
  fallbackNumber = 0,
  fallbackPos: PlayerPositionCode = 'CM'
): Promise<PlayerProfileSummary> => {
  let detectedNumber = fallbackNumber;
  let detectedPos = fallbackPos;
  let hasOfficialPos = false;
  let nationality: string | undefined;
  let age: number | undefined;
  let height: string | undefined;
  let photoUrl: string | undefined;
  let playerId: number | null = null;
  let resolvedTeamName = teamName;

  let starts = 0;
  let subAppearances = 0;
  let goals = 0;
  let assists = 0;
  let yellowCards = 0;
  let redCards = 0;
  let recentMatches: PlayerMatchHistoryItem[] = [];

  try {
    const trimmedName = playerName.trim();
    const normTargetName = normalizeSearchText(trimmedName);
    const seasonMatches = await getFullSeasonMatches(allMatches);

    if (trimmedName) {
      let usedSummaryView = true;
      let rows = await queryPlayerRecords(
        'player_season_summary_view',
        trimmedName,
        normTargetName
      );

      if (rows === null) {
        usedSummaryView = false;
        rows = (await queryPlayerRecords('players', trimmedName, normTargetName)) || [];
      }

      if (rows.length > 0) {
        const matchedByClub = rows.find((r) => isSameClubName(r.team_name ?? undefined, teamName));
        const p = matchedByClub || (rows.length === 1 ? rows[0] : null);

        if (p) {
          playerId = Number(p.player_id);
          resolvedTeamName = p.team_name || teamName;
          detectedNumber = Number(p.jersey_number) || detectedNumber;
          if (p.position_code) {
            detectedPos = normalizePositionCode(p.position_code);
            hasOfficialPos = true;
          }
          nationality = p.nationality || undefined;
          age = p.age || undefined;
          height = p.height || undefined;
          photoUrl = p.photo_url || undefined;

          if (usedSummaryView) {
            starts = Number(p.starts) || 0;
            subAppearances = Number(p.sub_appearances) || 0;
            goals = Number(p.goals) || 0;
            assists = Number(p.assists) || 0;
            yellowCards = Number(p.yellow_cards) || 0;
            redCards = Number(p.red_cards) || 0;
          }

          if (playerId) {
            const statsUrl = usedSummaryView
              ? `${SUPABASE_URL}/rest/v1/player_match_stats?player_id=eq.${playerId}&select=event_id,is_starter,goals,assists&order=event_id.desc&limit=15`
              : `${SUPABASE_URL}/rest/v1/player_match_stats?player_id=eq.${playerId}&select=event_id,is_starter,goals,assists,yellow_cards,red_cards`;

            const sRes = await fetch(statsUrl, { headers: SUPABASE_HEADERS });
            if (sRes.ok) {
              const statRows: PlayerMatchStatRow[] = (await sRes.json()) || [];

              if (!usedSummaryView) {
                for (const st of statRows) {
                  st.is_starter ? starts++ : subAppearances++;
                  goals += Number(st.goals) || 0;
                  assists += Number(st.assists) || 0;
                  yellowCards += Number(st.yellow_cards) || 0;
                  redCards += Number(st.red_cards) || 0;
                }
              }

              recentMatches = buildRecentMatches(
                statRows,
                seasonMatches,
                teamName,
                resolvedTeamName
              );
            }
          }
        }
      }

      if (starts + subAppearances === 0) {
        const lineupFallback = await aggregateFromClubLineupsAndEvents(
          trimmedName,
          resolvedTeamName,
          seasonMatches,
          detectedNumber,
          detectedPos,
          hasOfficialPos
        );
        if (lineupFallback) {
          detectedNumber = lineupFallback.number;
          detectedPos = lineupFallback.pos;
          starts = lineupFallback.starts;
          subAppearances = lineupFallback.subAppearances;
          goals = lineupFallback.goals;
          assists = lineupFallback.assists;
          yellowCards = lineupFallback.yellowCards;
          redCards = lineupFallback.redCards;
          recentMatches = lineupFallback.recentMatches;
        }
      }
    }
  } catch {
    // Giữ giá trị mặc định nếu lỗi mạng
  }

  return {
    name: playerName,
    number: detectedNumber,
    pos: detectedPos,
    teamName,
    nationality,
    age,
    height,
    photoUrl,
    starts,
    subAppearances,
    goals,
    assists,
    yellowCards,
    redCards,
    recentMatches,
  };
};