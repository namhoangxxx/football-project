import { Match } from '../types/football';
import { TeamLineup } from '../types/matchDetail';
import { normalizePositionCode, PlayerPositionCode } from '../utils/playerPosition';

const SUPABASE_URL = 'https://pgwrrhvijrjcszihswnm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_01cdBMzHDEs5fVjPY10DRg_iONp1RQE';

const sbHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
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
  nationality?: string;
  age?: number;
  photoUrl?: string;
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
  const cleanKeyword = teamName
    .replace(/\b(FC|CF|BSC|SV|AFC|SSC|RB|VfB|VfL|1\.|AC)\b/gi, '')
    .trim()
    .toLowerCase()
    .split(' ')[0];

  // 1. Ưu tiên đọc từ bảng players mới trên Supabase
  try {
    const pRes = await fetch(
      `${SUPABASE_URL}/rest/v1/players?team_name=ilike.*${encodeURIComponent(
        cleanKeyword
      )}*&select=*`,
      { headers: sbHeaders }
    );
    if (pRes.ok) {
      const pRows = await pRes.json();
      if (Array.isArray(pRows) && pRows.length > 0) {
        const ids = pRows.map((p: any) => p.player_id).join(',');
        const sRes = await fetch(
          `${SUPABASE_URL}/rest/v1/player_match_stats?player_id=in.(${ids})&select=player_id`,
          { headers: sbHeaders }
        );
        const appCount = new Map<number, number>();
        if (sRes.ok) {
          const sRows = await sRes.json();
          sRows.forEach((r: { player_id: number }) => {
            appCount.set(r.player_id, (appCount.get(r.player_id) || 0) + 1);
          });
        }

        return pRows.map((p: any) => ({
          id: Number(p.player_id),
          name: p.name,
          number: p.jersey_number || 0,
          pos: normalizePositionCode(p.position_code),
          appearances: appCount.get(Number(p.player_id)) || 0,
          nationality: p.nationality || undefined,
          age: p.age || undefined,
          photoUrl: p.photo_url || undefined,
        }));
      }
    }
  } catch {
    // Fallback sang match_lineups bên dưới
  }

  // 2. Fallback từ match_lineups nếu đội chưa có trong bảng players
  try {
    const eventIds = matches
      .filter((m) => m.status === 'FINISHED')
      .slice(0, 10)
      .map((m) => String(m.event_id).trim())
      .filter(Boolean);

    if (eventIds.length === 0) return [];

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/match_lineups?event_id=in.(${eventIds.join(',')})&select=lineups`,
      { headers: sbHeaders }
    );
    if (!res.ok) return [];

    const rows = await res.json();
    const playerMap = new Map<string, ClubPlayerItem>();

    rows.forEach((row: { lineups?: TeamLineup[] }) => {
      const teamLineup = row.lineups?.find((l) =>
        String(l.team?.name || '').toLowerCase().includes(cleanKeyword)
      );
      if (!teamLineup) return;

      [...(teamLineup.startXI || []), ...(teamLineup.substitutes || [])].forEach(
        ({ player }) => {
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
        }
      );
    });

    return Array.from(playerMap.values());
  } catch {
    return [];
  }
};