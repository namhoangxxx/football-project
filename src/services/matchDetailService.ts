import { MatchEventItem, MatchStats, TeamLineup } from '../types/matchDetail';
import { fetchMatchStatsByNameAndDate } from './rapidApiFootball';

const SUPABASE_URL = 'https://pgwrrhvijrjcszihswnm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_01cdBMzHDEs5fVjPY10DRg_iONp1RQE';

const supaHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export const getMatchStats = async (
  eventId: string | number,
  homeTeam: string,
  matchTime: string,
  status: string,
  homeTeamId?: number
): Promise<MatchStats | null> => {
  try {
    const isFinished = status === 'FINISHED';
    const cleanEventId = String(eventId).trim();

    if (isFinished) {
      const cacheRes = await fetch(
        `${SUPABASE_URL}/rest/v1/match_details?event_id=eq.${encodeURIComponent(cleanEventId)}&select=*`,
        { method: 'GET', headers: supaHeaders }
      );
      if (cacheRes.ok) {
        const cachedData = await cacheRes.json();
        if (cachedData && cachedData.length > 0) return cachedData[0] as MatchStats;
      }
    }

    const stats = await fetchMatchStatsByNameAndDate(homeTeam, matchTime, homeTeamId);
    if (stats && isFinished) {
      await saveStatsToSupabase(cleanEventId, stats);
    }
    return stats;
  } catch (error) {
    console.error('Lỗi getMatchStats:', error);
    return null;
  }
};

export const getMatchEventsFromSupabase = async (
  eventId: string | number
): Promise<MatchEventItem[]> => {
  try {
    const cleanEventId = String(eventId).trim();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/match_events?event_id=eq.${encodeURIComponent(cleanEventId)}&select=events`,
      { method: 'GET', headers: supaHeaders }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0 && Array.isArray(data[0].events)) {
        return data[0].events;
      }
    }
    return [];
  } catch (error) {
    console.error('Lỗi getMatchEventsFromSupabase:', error);
    return [];
  }
};

export const getMatchLineupsFromSupabase = async (
  eventId: string | number
): Promise<TeamLineup[]> => {
  try {
    const cleanEventId = String(eventId).trim();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/match_lineups?event_id=eq.${encodeURIComponent(cleanEventId)}&select=lineups`,
      { method: 'GET', headers: supaHeaders }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0 && Array.isArray(data[0].lineups)) {
        return data[0].lineups;
      }
    }
    return [];
  } catch (error) {
    console.error('Lỗi getMatchLineupsFromSupabase:', error);
    return [];
  }
};

const saveStatsToSupabase = async (eventId: string, stats: MatchStats) => {
  try {
    const payload = {
      event_id: eventId,
      home_possession: stats.home_possession,
      away_possession: stats.away_possession,
      home_shots: stats.home_shots,
      away_shots: stats.away_shots,
      home_shots_on_target: stats.home_shots_on_target,
      away_shots_on_target: stats.away_shots_on_target,
      home_corners: stats.home_corners,
      away_corners: stats.away_corners,
      home_fouls: stats.home_fouls,
      away_fouls: stats.away_fouls,
    };

    await fetch(`${SUPABASE_URL}/rest/v1/match_details?on_conflict=event_id`, {
      method: 'POST',
      headers: {
        ...supaHeaders,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Lỗi saveStatsToSupabase:', err);
  }
};