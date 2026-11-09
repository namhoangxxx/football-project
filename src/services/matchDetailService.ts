import { MatchStats } from '../types/matchDetail';
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

    // 1. Kiểm tra Supabase Cache (nếu trận đã FINISHED)
    if (isFinished) {
      console.log(`🔎 [Cache Check] Tìm cache cho event_id: "${cleanEventId}"...`);
      const cacheRes = await fetch(
        `${SUPABASE_URL}/rest/v1/match_details?event_id=eq.${encodeURIComponent(cleanEventId)}&select=*`,
        { method: 'GET', headers: supaHeaders }
      );

      if (cacheRes.ok) {
        const cachedData = await cacheRes.json();
        if (cachedData && cachedData.length > 0) {
          console.log(`⚡ [Cache Hit] Tìm thấy dữ liệu cache trong Supabase cho trận ${cleanEventId}!`);
          return cachedData[0] as MatchStats;
        }
      }
    }

    // 2. Nếu chưa có Cache -> Lấy từ API-Football
    console.log(`🌐 [API Call] Fetching dữ liệu cho đội ${homeTeam} (Home ID: ${homeTeamId})...`);
    const stats = await fetchMatchStatsByNameAndDate(homeTeam, matchTime, homeTeamId);

    // 3. Nếu fetch thành công và trận đã FINISHED -> Ghi cache vào Supabase
    if (stats && isFinished) {
      console.log(`💾 [Cache Save] Tiến hành lưu cache cho event_id ${cleanEventId}...`);
      await saveStatsToSupabase(cleanEventId, stats);
    }

    return stats;
  } catch (error) {
    console.error('Lỗi getMatchStats:', error);
    return null;
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

    const saveRes = await fetch(
      `${SUPABASE_URL}/rest/v1/match_details?on_conflict=event_id`,
      {
        method: 'POST',
        headers: {
          ...supaHeaders,
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(payload),
      }
    );

    if (saveRes.ok) {
      console.log(`🎉 [DB Success] Đã lưu thành công cache cho event_id: ${eventId}`);
    } else {
      const errText = await saveRes.text();
      console.error(`❌ [DB Error ${saveRes.status}] Lỗi lưu DB:`, errText);
    }
  } catch (err) {
    console.error('Lỗi saveStatsToSupabase:', err);
  }
};