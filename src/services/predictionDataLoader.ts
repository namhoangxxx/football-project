import { Match } from '../types/football';

const SUPABASE_URL = 'https://pgwrrhvijrjcszihswnm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_01cdBMzHDEs5fVjPY10DRg_iONp1RQE';

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

export interface TeamXgMap {
  [eventId: string]: {
    homeXg: number;
    awayXg: number;
  };
}

/**
 * Tải dữ liệu xG thực tế từ bảng match_details cho các trận gần nhất của 2 đội
 */
export async function fetchRecentMatchesXg(
  homeTeam: string,
  awayTeam: string,
  allMatches: Match[]
): Promise<TeamXgMap> {
  const relevantIds = allMatches
    .filter(
      (m) =>
        m.status === 'FINISHED' &&
        (m.home_team === homeTeam ||
          m.away_team === homeTeam ||
          m.home_team === awayTeam ||
          m.away_team === awayTeam)
    )
    .slice(0, 16)
    .map((m) => m.event_id)
    .filter(Boolean);

  if (relevantIds.length === 0) return {};

  try {
    const idList = relevantIds.join(',');
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/match_details?event_id=in.(${idList})&select=event_id,home_xg,away_xg`,
      { headers }
    );
    if (!res.ok) return {};

    const rows = await res.json();
    const map: TeamXgMap = {};
    for (const r of rows || []) {
      const hXg = Number(r.home_xg);
      const aXg = Number(r.away_xg);
      if (!Number.isNaN(hXg) && !Number.isNaN(aXg) && (hXg > 0 || aXg > 0)) {
        map[String(r.event_id)] = { homeXg: hXg, awayXg: aXg };
      }
    }
    return map;
  } catch {
    return {};
  }
}