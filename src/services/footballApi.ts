import { SUPABASE_HEADERS, SUPABASE_URL } from '../config/supabase';
import { Match } from '../types/football';
import { getClubSearchVariants } from '../utils/textNormalize';

export const fetchMatchesFromSupabase = async (): Promise<Match[]> => {
  try {
    const [activeRes, finishedRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/matches?status=neq.FINISHED&order=match_time.asc&limit=120`,
        { method: 'GET', headers: SUPABASE_HEADERS }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/matches?status=eq.FINISHED&order=match_time.desc&limit=120`,
        { method: 'GET', headers: SUPABASE_HEADERS }
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
        { method: 'GET', headers: SUPABASE_HEADERS }
      );
      if (resId.ok) {
        const dataId: Match[] = await resId.json();
        if (dataId && dataId.length > 0) return dataId;
      }
    }

    if (teamName) {
      const variants = getClubSearchVariants(teamName);
      const clauses = variants.flatMap((v) => [
        `home_team.ilike.*${encodeURIComponent(v)}*`,
        `away_team.ilike.*${encodeURIComponent(v)}*`,
      ]);

      const resName = await fetch(
        `${SUPABASE_URL}/rest/v1/matches?or=(${clauses.join(',')})&order=match_time.desc&limit=50`,
        { method: 'GET', headers: SUPABASE_HEADERS }
      );
      if (resName.ok) return await resName.json();
    }

    return [];
  } catch (error) {
    console.error('Lỗi fetchClubMatchesFromSupabase:', error);
    return [];
  }
};