import { StandingRow } from '../types/football';

const FOOTBALL_API_KEY = '35d5e00fd47d4770895bcf02b6e76d0b';

export const STANDINGS_LEAGUES = [
  { id: 'PL', name: 'Premier League' },
  { id: 'PD', name: 'La Liga' },
  { id: 'SA', name: 'Serie A' },
  { id: 'BL1', name: 'Bundesliga' },
  { id: 'FL1', name: 'Ligue 1' },
  { id: 'CL', name: 'Champions League' },
];

const standingsCache: Record<string, StandingRow[]> = {};

export const fetchLeagueStandings = async (
  leagueCode: string
): Promise<StandingRow[]> => {
  if (standingsCache[leagueCode] && standingsCache[leagueCode].length > 0) {
    return standingsCache[leagueCode];
  }

  try {
    const response = await fetch(
      `https://api.football-data.org/v4/competitions/${leagueCode}/standings`,
      { headers: { 'X-Auth-Token': FOOTBALL_API_KEY } }
    );
    const data = await response.json();
    const table: StandingRow[] = data?.standings?.[0]?.table || [];

    if (table.length > 0) {
      standingsCache[leagueCode] = table;
    }
    return table;
  } catch (error) {
    console.error('Lỗi lấy bảng xếp hạng:', error);
    return [];
  }
};