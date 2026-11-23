import { Match } from '../types/football';
import { PlayerAnalyticsProfile } from '../types/playerAnalytics';
import { normalizePositionCode } from '../utils/playerPosition';
import { buildPlayerAnalyticsProfile } from './playerAnalyticsEngine';

const SUPABASE_URL = 'https://pgwrrhvijrjcszihswnm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_01cdBMzHDEs5fVjPY10DRg_iONp1RQE';

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

let cachedPool: PlayerAnalyticsProfile[] | null = null;

export async function fetchAllPlayersAnalyticsPool(
  allMatches: Match[]
): Promise<PlayerAnalyticsProfile[]> {
  if (cachedPool && cachedPool.length > 0) return cachedPool;

  try {
    const [pRes, sRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/players?select=*&limit=350`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/player_match_stats?select=*&limit=2500`, { headers }),
    ]);

    if (!pRes.ok) return [];
    const players = await pRes.json();
    const stats = sRes.ok ? await sRes.json() : [];

    const aggByPlayerId = new Map<
      number,
      { starts: number; subs: number; goals: number; assists: number; yellows: number; reds: number }
    >();

    for (const st of stats || []) {
      const pid = Number(st.player_id);
      if (!pid) continue;
      const cur = aggByPlayerId.get(pid) || {
        starts: 0,
        subs: 0,
        goals: 0,
        assists: 0,
        yellows: 0,
        reds: 0,
      };
      st.is_starter ? cur.starts++ : cur.subs++;
      cur.goals += Number(st.goals) || 0;
      cur.assists += Number(st.assists) || 0;
      cur.yellows += Number(st.yellow_cards) || 0;
      cur.reds += Number(st.red_cards) || 0;
      aggByPlayerId.set(pid, cur);
    }

    const pool: PlayerAnalyticsProfile[] = (players || [])
      .filter((p: any) => p?.name)
      .map((p: any) => {
        const pid = Number(p.player_id);
        const agg = aggByPlayerId.get(pid);
        const totalApps = agg ? agg.starts + agg.subs : undefined;
        const estMinutes = agg ? agg.starts * 82 + agg.subs * 24 : undefined;

        return buildPlayerAnalyticsProfile(
          {
            name: p.name,
            teamName: p.team_name || 'Unknown FC',
            number: Number(p.jersey_number) || 0,
            pos: normalizePositionCode(p.position_code),
            rawStats: agg
              ? {
                  appearances: totalApps && totalApps > 0 ? totalApps : undefined,
                  minutes: estMinutes && estMinutes > 0 ? estMinutes : undefined,
                  goals: agg.goals,
                  assists: agg.assists,
                  yellow_cards: agg.yellows,
                  red_cards: agg.reds,
                }
              : undefined,
          },
          allMatches
        );
      });

    if (pool.length > 0) cachedPool = pool;
    return pool;
  } catch {
    return [];
  }
}