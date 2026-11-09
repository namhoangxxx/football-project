import { Match } from '../types/football';

const SUPABASE_URL = 'https://pgwrrhvijrjcszihswnm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_01cdBMzHDEs5fVjPY10DRg_iONp1RQE';

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

/**
 * Lấy các trận LIVE & SẮP ĐÁ cho Trang Chủ (Lọc bỏ trận đã FINISHED)
 */
export const fetchMatchesFromSupabase = async (): Promise<Match[]> => {
  try {
    // Lấy các trận đấu có status KHÔNG PHẢI là FINISHED
    const endpoint = `${SUPABASE_URL}/rest/v1/matches?status=neq.FINISHED&order=match_time.asc&limit=100`;
    
    const response = await fetch(endpoint, { method: 'GET', headers });
    if (!response.ok) throw new Error('Không thể lấy dữ liệu từ Supabase');
    return await response.json();
  } catch (error) {
    console.error('Lỗi fetchMatchesFromSupabase:', error);
    return [];
  }
};

/**
 * Lấy toàn bộ lịch sử trận đấu của 1 CLB
 */
export const fetchClubMatchesFromSupabase = async (
  teamId: number,
  teamName?: string
): Promise<Match[]> => {
  try {
    if (teamId) {
      const endpointId = `${SUPABASE_URL}/rest/v1/matches?or=(home_team_id.eq.${teamId},away_team_id.eq.${teamId})&order=match_time.desc&limit=50`;
      const resId = await fetch(endpointId, { method: 'GET', headers });

      if (resId.ok) {
        const dataId: Match[] = await resId.json();
        if (dataId && dataId.length > 0) return dataId;
      }
    }

    if (teamName) {
      const cleanName = teamName
        .replace(/\b(FC|CF|BSC|SV|AFC|SSC|RB|VfB|VfL|1\.|AC)\b/gi, '')
        .trim();
      const words = cleanName.split(' ').filter(w => w.length > 2);
      const searchWord = words[0] || teamName;

      const endpointName = `${SUPABASE_URL}/rest/v1/matches?or=(home_team.ilike.*${encodeURIComponent(
        searchWord
      )}*,away_team.ilike.*${encodeURIComponent(
        searchWord
      )}*)&order=match_time.desc&limit=50`;

      const resName = await fetch(endpointName, { method: 'GET', headers });
      if (resName.ok) return await resName.json();
    }

    return [];
  } catch (error) {
    console.error('Lỗi fetchClubMatchesFromSupabase:', error);
    return [];
  }
};