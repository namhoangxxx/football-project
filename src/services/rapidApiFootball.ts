import { MatchStats } from '../types/matchDetail';

const API_FOOTBALL_KEY = 'f8640e0e945a8b02c168ea70013f9d2f';
const SUPABASE_URL = 'https://pgwrrhvijrjcszihswnm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_01cdBMzHDEs5fVjPY10DRg_iONp1RQE';

const supaHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

/**
 * Tra cứu API-Football Team ID từ Supabase theo football_data_id
 */
const getApiFootballTeamId = async (homeTeamId?: number): Promise<number | null> => {
  if (!homeTeamId) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/team_map?football_data_id=eq.${homeTeamId}&select=api_football_id`,
      { headers: supaHeaders }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) return data[0].api_football_id;
    }
  } catch (err) {
    console.error('Lỗi getApiFootballTeamId:', err);
  }
  return null;
};

export const fetchMatchStatsByNameAndDate = async (
  homeTeamName: string,
  matchDateStr: string,
  homeTeamId?: number
): Promise<MatchStats | null> => {
  try {
    if (!matchDateStr) return null;

    const dateOnly = matchDateStr.split('T')[0];
    const afTeamId = await getApiFootballTeamId(homeTeamId);

    let searchUrl = '';
    if (afTeamId) {
      searchUrl = `https://v3.football.api-sports.io/fixtures?date=${dateOnly}&team=${afTeamId}`;
      console.log(`🎯 [API-Football] Tra cứu trực tiếp theo Team ID (${afTeamId}) cho ngày ${dateOnly}...`);
    } else {
      searchUrl = `https://v3.football.api-sports.io/fixtures?date=${dateOnly}`;
      console.log(`🌐 [API-Football] Fallback quét ngày ${dateOnly}...`);
    }

    const searchRes = await fetch(searchUrl, {
      method: 'GET',
      headers: { 'x-apisports-key': API_FOOTBALL_KEY },
    });

    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const fixtures = searchData.response || [];

    if (fixtures.length === 0) return null;

    const matchedFixtureId = fixtures[0].fixture.id;
    console.log(`✅ [API-Football] Tìm thấy Fixture ID: ${matchedFixtureId}`);

    // Fetch thông số chi tiết (Stats)
    const statsUrl = `https://v3.football.api-sports.io/fixtures/statistics?fixture=${matchedFixtureId}`;
    const statsRes = await fetch(statsUrl, {
      method: 'GET',
      headers: { 'x-apisports-key': API_FOOTBALL_KEY },
    });

    if (!statsRes.ok) return null;
    const statsJson = await statsRes.json();
    const statsData = statsJson.response;

    if (!statsData || statsData.length < 2) return null;

    const homeStats = statsData[0].statistics;
    const awayStats = statsData[1].statistics;

    const parseVal = (arr: any[], typeName: string): number => {
      const item = arr.find((s: any) => s.type === typeName);
      if (!item || item.value === null || item.value === undefined) return 0;
      if (typeof item.value === 'string') return parseInt(item.value.replace('%', ''), 10) || 0;
      return item.value;
    };

    return {
      home_possession: parseVal(homeStats, 'Ball Possession'),
      away_possession: parseVal(awayStats, 'Ball Possession'),
      home_shots: parseVal(homeStats, 'Total Shots'),
      away_shots: parseVal(awayStats, 'Total Shots'),
      home_shots_on_target: parseVal(homeStats, 'Shots on Goal'),
      away_shots_on_target: parseVal(awayStats, 'Shots on Goal'),
      home_corners: parseVal(homeStats, 'Corner Kicks'),
      away_corners: parseVal(awayStats, 'Corner Kicks'),
      home_fouls: parseVal(homeStats, 'Fouls'),
      away_fouls: parseVal(awayStats, 'Fouls'),
    };
  } catch (error) {
    console.error('Lỗi fetchMatchStatsByNameAndDate:', error);
    return null;
  }
};