import { Match } from '../types/football';

const SUPABASE_URL = 'https://pgwrrhvijrjcszihswnm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_01cdBMzHDEs5fVjPY10DRg_iONp1RQE';

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

/**
 * Lấy danh sách trận LIVE & UPCOMING cho HomeScreen
 */
export const fetchMatchesFromSupabase = async (): Promise<Match[]> => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?status=neq.FINISHED&order=match_time.asc&select=*`,
      { method: 'GET', headers }
    );
    if (!response.ok) throw new Error('Không thể lấy dữ liệu từ Supabase');
    return await response.json();
  } catch (error) {
    console.error('Lỗi fetchMatchesFromSupabase:', error);
    return [];
  }
};

/**
 * Lấy tất cả lịch sử & kết quả đấu của 1 CLB cụ thể
 */
export const fetchClubMatchesFromSupabase = async (teamName: string): Promise<Match[]> => {
  try {
    const cleanName = teamName
      .replace(/\b(FC|CF|BSC|SV|AFC|SSC|RB|VfB|VfL|1\.|AC)\b/gi, '')
      .replace(/&/g, '')
      .trim();

    const searchKeyword = cleanName.split(' ')[0] || teamName;

    const endpoint = `${SUPABASE_URL}/rest/v1/matches?or=(home_team.ilike.*${encodeURIComponent(
      searchKeyword
    )}*,away_team.ilike.*${encodeURIComponent(
      searchKeyword
    )}*)&order=match_time.desc&select=*`;

    const response = await fetch(endpoint, { method: 'GET', headers });
    if (!response.ok) throw new Error('Không thể lấy lịch sử trận đấu CLB');
    return await response.json();
  } catch (error) {
    console.error('Lỗi fetchClubMatchesFromSupabase:', error);
    return [];
  }
};