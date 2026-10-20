export interface Match {
  id?: number;
  event_id: number | string;
  home_team: string;
  away_team: string;
  home_team_id?: number;
  away_team_id?: number;
  status: string;
  league?: string;
  home_score?: number | null;
  away_score?: number | null;
  match_time?: string;
  home_icon?: string | null;
  away_icon?: string | null;
  created_at?: string;
}

const SUPABASE_URL = 'https://pgwrrhvijrjcszihswnm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_01cdBMzHDEs5fVjPY10DRg_iONp1RQE';

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

/**
 * Lấy các trận đấu ĐANG ĐÁ và SẮP ĐÁ cho màn hình chính (Loại bỏ FINISHED)
 */
export const fetchMatchesFromSupabase = async (): Promise<Match[]> => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?status=neq.FINISHED&order=match_time.asc&select=*`,
      { method: 'GET', headers }
    );

    if (!response.ok) {
      throw new Error('Không thể lấy dữ liệu từ Supabase');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi API Supabase:', error);
    throw error;
  }
};

/**
 * Lấy tất cả các trận (bao gồm cả FINISHED) của MỘT CLB cụ thể (Đội nhà hoặc Đội khách)
 */
export const fetchClubMatchesFromSupabase = async (teamName: string): Promise<Match[]> => {
  try {
    // Tìm các trận mà teamName là đội nhà HOẶC đội khách
    const query = `or=(home_team.eq.${encodeURIComponent(teamName)},away_team.eq.${encodeURIComponent(teamName)})`;
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?${query}&order=match_time.desc&select=*`,
      { method: 'GET', headers }
    );

    if (!response.ok) {
      throw new Error('Không thể lấy lịch sử thi đấu của CLB');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi API Supabase khi lấy lịch sử CLB:', error);
    throw error;
  }
};