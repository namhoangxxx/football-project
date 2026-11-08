import { Match } from '../types/football';

const SUPABASE_URL = 'https://pgwrrhvijrjcszihswnm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_01cdBMzHDEs5fVjPY10DRg_iONp1RQE';

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

/**
 * Lấy danh sách trận đấu cho HomeScreen (Gồm cả LIVE, UPCOMING và FINISHED)
 */
export const fetchMatchesFromSupabase = async (): Promise<Match[]> => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?order=match_time.desc&select=*`,
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
 * Lấy tất cả lịch sử & kết quả đấu của 1 CLB (Query ID trước, nếu rỗng thì query theo tên)
 */
export const fetchClubMatchesFromSupabase = async (
  teamId: number,
  teamName?: string
): Promise<Match[]> => {
  try {
    // 1. Lọc theo teamId
    const queryId = `or=(home_team_id.eq.${teamId},away_team_id.eq.${teamId})&order=match_time.desc&select=*`;
    let response = await fetch(`${SUPABASE_URL}/rest/v1/matches?${queryId}`, {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      const data: Match[] = await response.json();
      if (data && data.length > 0) return data;
    }

    // 2. Dự phòng: Nếu chưa có ID (hoặc ID = null trong DB), tìm theo keyword Tên
    if (teamName) {
      const cleanName = teamName
        .replace(/\b(FC|CF|BSC|SV|AFC|SSC|RB|VfB|VfL|1\.|AC)\b/gi, '')
        .replace(/&/g, '')
        .trim();
      const firstWord = cleanName.split(' ')[0] || teamName;

      const queryName = `or=(home_team.ilike.*${encodeURIComponent(
        firstWord
      )}*,away_team.ilike.*${encodeURIComponent(
        firstWord
      )}*)&order=match_time.desc&select=*`;

      response = await fetch(`${SUPABASE_URL}/rest/v1/matches?${queryName}`, {
        method: 'GET',
        headers,
      });

      if (response.ok) return await response.json();
    }

    return [];
  } catch (error) {
    console.error('Lỗi fetchClubMatchesFromSupabase:', error);
    return [];
  }
};