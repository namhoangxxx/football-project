import { Match } from '../types/football';
import { MatchRatingPoint, PlayerAnalyticsProfile, PlayerRadarAxes } from '../types/playerAnalytics';
import { generateProsAndCons } from '../utils/playerInsights';
import { normalizePositionCode } from '../utils/playerPosition';

const clamp = (val: number, min = 20, max = 99): number =>
  Math.max(min, Math.min(max, Math.round(val)));

function createRng(seedStr: string) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function buildPlayerAnalyticsProfile(
  params: {
    name: string;
    teamName: string;
    number?: number;
    pos?: string;
    rawStats?: Record<string, any>;
  },
  allMatches: Match[] = []
): PlayerAnalyticsProfile {
  const pos = normalizePositionCode(params.pos);
  const rng = createRng(`${params.teamName}::${params.name}`);
  const raw = params.rawStats || {};

  const teamMatches = allMatches
    .filter((m) => m.status === 'FINISHED' && (m.home_team === params.teamName || m.away_team === params.teamName))
    .slice(0, 8);

  const appearances = raw.appearances ?? Math.max(8, teamMatches.length || Math.floor(10 + rng() * 14));
  const minutes = raw.minutes ?? appearances * Math.floor(68 + rng() * 20);
  const per90 = Math.max(0.5, minutes / 90);

  const isGK = pos === 'GK';
  const isAttacker = pos === 'CF' || pos === 'RF' || pos === 'LF';
  const isMid = pos === 'AM' || pos === 'CM' || pos === 'CDM' || pos === 'LM' || pos === 'RM';
  const isDefender = pos === 'CB' || pos === 'LB' || pos === 'RB';

  const goals = raw.goals ?? (isGK ? 0 : isAttacker ? Math.floor(3 + rng() * 11) : isMid ? Math.floor(1 + rng() * 6) : Math.floor(rng() * 3));
  const assists = raw.assists ?? (isGK ? 0 : isAttacker || isMid ? Math.floor(2 + rng() * 8) : Math.floor(rng() * 4));
  const xg = Number((raw.xg ?? Math.max(0.2, goals * (0.82 + rng() * 0.35))).toFixed(2));
  const xa = Number((raw.xa ?? Math.max(0.1, assists * (0.8 + rng() * 0.4))).toFixed(2));
  const passAccuracy = Number((raw.pass_accuracy ?? (isMid ? 84 + rng() * 9 : isDefender ? 82 + rng() * 10 : 74 + rng() * 12)).toFixed(1));

  const tacklesPer90 = Number(((raw.tackles ?? per90 * (isDefender || pos === 'CDM' ? 2.1 + rng() * 1.6 : 0.6 + rng() * 1.3)) / per90).toFixed(2));
  const interceptionsPer90 = Number(((raw.interceptions ?? per90 * (isDefender || pos === 'CDM' ? 1.4 + rng() * 1.4 : 0.4 + rng() * 1.0)) / per90).toFixed(2));
  const dribblesPer90 = Number(((raw.dribbles ?? per90 * (isAttacker || pos === 'AM' ? 1.8 + rng() * 2.1 : 0.4 + rng() * 1.1)) / per90).toFixed(2));
  const yellowCards = raw.yellow_cards ?? Math.floor(rng() * 5);
  const redCards = raw.red_cards ?? (rng() > 0.9 ? 1 : 0);

  const radar: PlayerRadarAxes = isGK
    ? {
        shooting: clamp(32 + rng() * 15),
        creativity: clamp(45 + rng() * 20),
        passing: clamp(passAccuracy - 8),
        dribbling: clamp(40 + rng() * 18),
        defending: clamp(78 + rng() * 18),
        discipline: clamp(92 - yellowCards * 5 - redCards * 15),
      }
    : {
        shooting: clamp(38 + (goals / per90) * 65 + (xg / per90) * 20),
        creativity: clamp(40 + (assists / per90) * 70 + (xa / per90) * 25),
        passing: clamp(passAccuracy * 0.95 + (isMid ? 6 : 0)),
        dribbling: clamp(38 + dribblesPer90 * 14),
        defending: clamp(32 + (tacklesPer90 + interceptionsPer90) * 11),
        discipline: clamp(94 - (yellowCards / Math.max(1, appearances)) * 45 - redCards * 18),
      };

  const { pros, cons } = generateProsAndCons({
    pos,
    radar,
    passAccuracy,
    tacklesPer90,
    dribblesPer90,
    yellowCards,
    redCards,
  });

  const baseRating = raw.rating ?? Number((6.6 + (radar.shooting + radar.passing + radar.defending) / 380).toFixed(2));
  const sourceMatches = teamMatches.length > 0 ? teamMatches : Array.from({ length: 7 });

  const formTrend: MatchRatingPoint[] = sourceMatches.slice(0, 7).reverse().map((m: any, idx) => {
    const rating = Number(Math.max(5.5, Math.min(9.4, baseRating + (rng() - 0.46) * 1.3)).toFixed(1));
    return {
      matchId: String(m?.event_id || idx),
      opponent: m ? (m.home_team === params.teamName ? m.away_team : m.home_team) : `Vòng ${idx + 1}`,
      dateLabel: m?.match_time ? new Date(m.match_time).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : `V${idx + 1}`,
      rating,
      minutes: Math.floor(65 + rng() * 25),
      goals: rating >= 7.8 && rng() > 0.45 ? 1 : 0,
      assists: rating >= 7.5 && rng() > 0.5 ? 1 : 0,
    };
  });

  const recent5 = formTrend.slice(-5);
  const recent5Rating = recent5.length > 0
    ? Number((recent5.reduce((acc, p) => acc + p.rating, 0) / recent5.length).toFixed(2))
    : baseRating;
  const seasonRating = Number(baseRating.toFixed(2));

  return {
    id: `${params.teamName}-${params.name}`,
    name: params.name,
    teamName: params.teamName,
    number: params.number || 0,
    pos,
    seasonRating,
    recent5Rating,
    formDelta: Number((recent5Rating - seasonRating).toFixed(2)),
    appearances,
    minutes,
    goals,
    assists,
    xg,
    xa,
    passAccuracy,
    tacklesPer90,
    interceptionsPer90,
    dribblesPer90,
    yellowCards,
    redCards,
    radar,
    pros,
    cons,
    formTrend,
  };
}