import { FOOTBALL_DATA_API_KEY } from '../config/supabase';
import { StandingRow } from '../types/football';

export const STANDINGS_LEAGUES = [
  { id: 'PL', name: 'Premier League' },
  { id: 'PD', name: 'La Liga' },
  { id: 'SA', name: 'Serie A' },
  { id: 'BL1', name: 'Bundesliga' },
  { id: 'FL1', name: 'Ligue 1' },
  { id: 'CL', name: 'Champions League' },
  { id: 'EL', name: 'Europa League' },
  { id: 'ECL', name: 'Conference League' },
];

const CACHE_TTL_MS = 5 * 60 * 1000;
const standingsCache: Record<string, { rows: StandingRow[]; updatedAt: number }> = {};
const inflightRequests: Record<string, Promise<StandingRow[]> | undefined> = {};

export const fetchLeagueStandings = async (
  leagueCode: string,
  forceRefresh = false
): Promise<StandingRow[]> => {
  const cached = standingsCache[leagueCode];
  if (!forceRefresh && cached && Date.now() - cached.updatedAt < CACHE_TTL_MS) {
    return cached.rows;
  }

  if (inflightRequests[leagueCode]) {
    return inflightRequests[leagueCode]!;
  }

  const request = (async () => {
    try {
      const response = await fetch(
        `https://api.football-data.org/v4/competitions/${leagueCode}/standings`,
        { headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY } }
      );

      if (!response.ok) {
        return cached?.rows || [];
      }

      const data = await response.json();
      const totalGroup =
        data?.standings?.find((s: any) => s.type === 'TOTAL') || data?.standings?.[0];
      const table: StandingRow[] = totalGroup?.table || [];

      if (table.length > 0) {
        standingsCache[leagueCode] = { rows: table, updatedAt: Date.now() };
      }
      return table;
    } catch (error) {
      console.error('Lỗi lấy bảng xếp hạng:', error);
      return cached?.rows || [];
    } finally {
      delete inflightRequests[leagueCode];
    }
  })();

  inflightRequests[leagueCode] = request;
  return request;
};