import { Match } from '../types/football';
import { TeamLineup } from '../types/matchDetail';

const SUPABASE_URL = 'https://pgwrrhvijrjcszihswnm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_01cdBMzHDEs5fVjPY10DRg_iONp1RQE';

export type PlayerPositionCode =
  | 'GK' | 'CB' | 'LB' | 'RB'
  | 'CDM' | 'CM' | 'RM' | 'LM' | 'AM'
  | 'CF' | 'RF' | 'LF';

const VALID_POSITIONS = new Set<PlayerPositionCode>([
  'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'RM', 'LM', 'AM', 'CF', 'RF', 'LF',
]);

export const normalizePositionCode = (raw?: string): PlayerPositionCode => {
  const code = String(raw || '').trim().toUpperCase();
  if (VALID_POSITIONS.has(code as PlayerPositionCode)) {
    return code as PlayerPositionCode;
  }
  const legacyMap: Record<string, PlayerPositionCode> = {
    G: 'GK',
    D: 'CB',
    LCB: 'CB',
    RCB: 'CB',
    LWB: 'LB',
    RWB: 'RB',
    M: 'CM',
    LCM: 'CM',
    RCM: 'CM',
    DM: 'CDM',
    LDM: 'CDM',
    RDM: 'CDM',
    CAM: 'AM',
    LAM: 'AM',
    RAM: 'AM',
    F: 'CF',
    ST: 'CF',
    LS: 'CF',
    RS: 'CF',
    LW: 'LF',
    RW: 'RF',
  };
  return legacyMap[code] || 'CM';
};

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
}

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
      m.home_team_id === teamId ||
      m.home_team.toLowerCase().includes(teamName.toLowerCase());
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

export const fetchClubSquadFromLineups = async (
  matches: Match[],
  teamName: string
): Promise<ClubPlayerItem[]> => {
  try {
    const eventIds = matches
      .filter((m) => m.status === 'FINISHED')
      .slice(0, 8)
      .map((m) => String(m.event_id).trim())
      .filter(Boolean);

    if (eventIds.length === 0) return [];

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/match_lineups?event_id=in.(${eventIds.join(',')})&select=lineups`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (!res.ok) return [];

    const rows = await res.json();
    const playerMap = new Map<string, ClubPlayerItem>();
    const keyword = teamName.toLowerCase().split(' ')[0];

    rows.forEach((row: { lineups?: TeamLineup[] }) => {
      const teamLineup = row.lineups?.find((l) =>
        String(l.team?.name || '').toLowerCase().includes(keyword)
      );
      if (!teamLineup) return;

      const allPlayers = [
        ...(teamLineup.startXI || []),
        ...(teamLineup.substitutes || []),
      ];
      allPlayers.forEach(({ player }) => {
        if (!player?.name) return;
        const key = player.name.toLowerCase();
        const existing = playerMap.get(key);
        if (existing) {
          existing.appearances += 1;
        } else {
          playerMap.set(key, {
            id: player.id || playerMap.size + 1,
            name: player.name,
            number: player.number || 0,
            pos: normalizePositionCode(player.pos),
            appearances: 1,
          });
        }
      });
    });

    return Array.from(playerMap.values());
  } catch {
    return [];
  }
};