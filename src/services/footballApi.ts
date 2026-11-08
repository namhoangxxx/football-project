import { Match } from '../types/football';

const SUPABASE_URL = 'https://pgwrrhvijrjcszihswnm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_01cdBMzHDEs5fVjPY10DRg_iONp1RQE';

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

/**
 * Lấy danh sách trận LIVE & UPCOMING cho Trang chủ
 */
export const fetchMatchesFromSupabase = async (): Promise<Match[]> => {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const endpoint = `${SUPABASE_URL}/rest/v1/matches?match_time=gte.${yesterday}&order=match_time.asc&limit=100`;
    
    const response = await fetch(endpoint, { method: 'GET', headers });
    if (!response.ok) throw new Error('Không thể lấy dữ liệu từ Supabase');
    return await response.json();
  } catch (error) {
    console.error('Lỗi fetchMatchesFromSupabase:', error);
    return [];
  }
};

/**
 * Lấy TẤT CẢ lịch sử & kết quả đấu của 1 CLB
 */
export const fetchClubMatchesFromSupabase = async (
  teamId: number,
  teamName?: string
): Promise<Match[]> => {
  try {
    // 1. Lọt qua query ID nếu teamId tồn tại
    if (teamId) {
      const endpointId = `${SUPABASE_URL}/rest/v1/matches?or=(home_team_id.eq.${teamId},away_team_id.eq.${teamId})&order=match_time.desc`;
      const resId = await fetch(endpointId, { method: 'GET', headers });

      if (resId.ok) {
        const dataId: Match[] = await resId.json();
        // Nếu có từ 2 trận trở lên theo ID -> Trả về luôn
        if (dataId && dataId.length > 1) {
          return dataId;
        }
      }
    }

    // 2. Dự phòng nâng cao: Tìm kiếm theo tên chuỗi linh hoạt
    if (teamName) {
      // Tách lấy từ chính nhất của tên CLB (Ví dụ: "Manchester United FC" -> "Manchester", "Arsenal FC" -> "Arsenal")
      const cleanName = teamName
        .replace(/\b(FC|CF|BSC|SV|AFC|SSC|RB|VfB|VfL|1\.|AC)\b/gi, '')
        .trim();
      
      // Lấy từ đầu tiên dài hơn 2 ký tự
      const words = cleanName.split(' ').filter(w => w.length > 2);
      const searchWord = words[0] || teamName;

      const endpointName = `${SUPABASE_URL}/rest/v1/matches?or=(home_team.ilike.*${encodeURIComponent(
        searchWord
      )}*,away_team.ilike.*${encodeURIComponent(
        searchWord
      )}*)&order=match_time.desc`;

      const resName = await fetch(endpointName, { method: 'GET', headers });
      if (resName.ok) {
        const dataName: Match[] = await resName.json();
        return dataName || [];
      }
    }

    return [];
  } catch (error) {
    console.error('Lỗi fetchClubMatchesFromSupabase:', error);
    return [];
  }
};