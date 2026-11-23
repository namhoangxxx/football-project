import { Match } from '../types/football';

const SUPABASE_URL = 'https://pgwrrhvijrjcszihswnm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_01cdBMzHDEs5fVjPY10DRg_iONp1RQE';

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export const fetchMatchesFromSupabase = async (): Promise<Match[]> => {
  try {
    const [activeRes, finishedRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/matches?status=neq.FINISHED&order=match_time.asc&limit=120`,
        { method: 'GET', headers }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/matches?status=eq.FINISHED&order=match_time.desc&limit=120`,
        { method: 'GET', headers }
      ),
    ]);

    const activeData: Match[] = activeRes.ok ? await activeRes.json() : [];
    const finishedData: Match[] = finishedRes.ok ? await finishedRes.json() : [];

    return [...activeData, ...finishedData];
  } catch (error) {
    console.error('Lỗi fetchMatchesFromSupabase:', error);
    return [];
  }
};

export const fetchClubMatchesFromSupabase = async (
  teamId: number,
  teamName?: string
): Promise<Match[]> => {
  try {
    if (teamId) {
      const resId = await fetch(
        `${SUPABASE_URL}/rest/v1/matches?or=(home_team_id.eq.${teamId},away_team_id.eq.${teamId})&order=match_time.desc&limit=50`,
        { method: 'GET', headers }
      );
      if (resId.ok) {
        const dataId: Match[] = await resId.json();
        if (dataId && dataId.length > 0) return dataId;
      }
    }

    if (teamName) {
      const cleanName = teamName
        .replace(/\b(FC|CF|BSC|SV|AFC|SSC|RB|VfB|VfL|1\.|AC)\b/gi, '')
        .trim();
      const searchWord = cleanName.split(' ').filter((w) => w.length > 2)[0] || teamName;

      const resName = await fetch(
        `${SUPABASE_URL}/rest/v1/matches?or=(home_team.ilike.*${encodeURIComponent(
          searchWord
        )}*,away_team.ilike.*${encodeURIComponent(
          searchWord
        )}*)&order=match_time.desc&limit=50`,
        { method: 'GET', headers }
      );
      if (resName.ok) return await resName.json();
    }

    return [];
  } catch (error) {
    console.error('Lỗi fetchClubMatchesFromSupabase:', error);
    return [];
  }
};