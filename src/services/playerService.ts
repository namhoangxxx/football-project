import { Match } from '../types/football';
import { normalizePositionCode, PlayerPositionCode } from '../utils/playerPosition';

const SUPABASE_URL = 'https://pgwrrhvijrjcszihswnm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_01cdBMzHDEs5fVjPY10DRg_iONp1RQE';

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

export interface PlayerMatchHistoryItem {
  eventId: string | number;
  opponent: string;
  score: string;
  role: 'Đá chính' | 'Dự bị';
  goals: number;
  assists: number;
}

export interface PlayerProfileSummary {
  name: string;
  number: number;
  pos: PlayerPositionCode;
  teamName: string;
  nationality?: string;
  age?: number;
  height?: string;
  photoUrl?: string;
  starts: number;
  subAppearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  recentMatches: PlayerMatchHistoryItem[];
}

export const fetchPlayerProfileSummary = async (
  playerName: string,
  teamName: string,
  allMatches: Match[],
  fallbackNumber = 0,
  fallbackPos: PlayerPositionCode = 'CM'
): Promise<PlayerProfileSummary> => {
  let detectedNumber = fallbackNumber;
  let detectedPos = fallbackPos;
  let nationality: string | undefined;
  let age: number | undefined;
  let height: string | undefined;
  let photoUrl: string | undefined;
  let playerId: number | null = null;

  let starts = 0, subAppearances = 0, goals = 0, assists = 0, yellowCards = 0, redCards = 0;
  const recentMatches: PlayerMatchHistoryItem[] = [];

  try {
    const pRes = await fetch(
      `${SUPABASE_URL}/rest/v1/players?name=ilike.${encodeURIComponent(playerName.trim())}&select=*&limit=1`,
      { headers }
    );
    if (pRes.ok) {
      const rows = await pRes.json();
      if (rows?.length > 0) {
        const p = rows[0];
        playerId = Number(p.player_id);
        detectedNumber = p.jersey_number || detectedNumber;
        detectedPos = normalizePositionCode(p.position_code);
        nationality = p.nationality || undefined;
        age = p.age || undefined;
        height = p.height || undefined;
        photoUrl = p.photo_url || undefined;
      }
    }

    if (playerId) {
      const sRes = await fetch(
        `${SUPABASE_URL}/rest/v1/player_match_stats?player_id=eq.${playerId}&select=*`,
        { headers }
      );
      if (sRes.ok) {
        const statRows = await sRes.json();
        const matchByEventId = new Map(allMatches.map((m) => [String(m.event_id), m]));
        const teamKey = teamName.toLowerCase().split(' ')[0];

        statRows.forEach((st: any) => {
          st.is_starter ? starts++ : subAppearances++;
          goals += Number(st.goals) || 0;
          assists += Number(st.assists) || 0;
          yellowCards += Number(st.yellow_cards) || 0;
          redCards += Number(st.red_cards) || 0;

          const m = matchByEventId.get(String(st.event_id));
          if (m) {
            const isHome = m.home_team.toLowerCase().includes(teamKey);
            recentMatches.push({
              eventId: m.event_id,
              opponent: isHome ? `vs ${m.away_team}` : `@ ${m.home_team}`,
              score: `${m.home_score ?? 0} - ${m.away_score ?? 0}`,
              role: st.is_starter ? 'Đá chính' : 'Dự bị',
              goals: Number(st.goals) || 0,
              assists: Number(st.assists) || 0,
            });
          }
        });
      }
    }
  } catch {
    // Giữ giá trị mặc định nếu lỗi mạng
  }

  return {
    name: playerName,
    number: detectedNumber,
    pos: detectedPos,
    teamName,
    nationality,
    age,
    height,
    photoUrl,
    starts,
    subAppearances,
    goals,
    assists,
    yellowCards,
    redCards,
    recentMatches: recentMatches.slice(0, 10),
  };
};