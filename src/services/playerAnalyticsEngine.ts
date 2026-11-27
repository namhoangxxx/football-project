import { Match } from '../types/football';
import { MatchRatingPoint, PlayerAnalyticsProfile, PlayerRadarAxes } from '../types/playerAnalytics';
import { generateProsAndCons } from '../utils/playerInsights';
import { normalizePositionCode, POS_META } from '../utils/playerPosition';
import { buildCanonicalPlayerId, isSameClubName } from '../utils/textNormalize';
import { PlayerMatchHistoryItem } from './playerService';

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
    recentMatches?: PlayerMatchHistoryItem[];
  },
  allMatches: Match[] = []
): PlayerAnalyticsProfile {
  const pos = normalizePositionCode(params.pos);
  const group = POS_META[pos].group;
  const canonicalId = buildCanonicalPlayerId(params.teamName, params.name);
  const rng = createRng(canonicalId);
  const raw = params.rawStats || {};
  const recentLogs = params.recentMatches || [];

  const teamMatches = allMatches
    .filter(
      (m) =>
        m.status === 'FINISHED' &&
        (isSameClubName(m.home_team, params.teamName) || isSameClubName(m.away_team, params.teamName))
    )
    .slice(0, 8);

  const appearances = raw.appearances ?? Math.max(8, teamMatches.length || Math.floor(10 + rng() * 14));
  const minutes = raw.minutes ?? appearances * Math.floor(68 + rng() * 20);
  const per90 = Math.max(0.5, minutes / 90);

  const isGK = group === 'GK';
  const isDef = group === 'DEF';
  const isMid = group === 'MID';
  const isFwd = group === 'FWD';

  const isWingBack = pos === 'LWB' || pos === 'RWB';
  const isFullBack = pos === 'LB' || pos === 'RB' || isWingBack;
  const isCDM = pos === 'CDM';
  const isCAM = pos === 'CAM';
  const isWideMid = pos === 'LM' || pos === 'RM';
  const isWinger = pos === 'LW' || pos === 'RW';
  const isStriker = pos === 'ST' || pos === 'CF';

  const goals =
    raw.goals ??
    (isGK
      ? 0
      : isStriker
      ? Math.floor(4 + rng() * 12)
      : isWinger || isCAM
      ? Math.floor(2 + rng() * 9)
      : isMid
      ? Math.floor(1 + rng() * 5)
      : Math.floor(rng() * 3));

  const assists =
    raw.assists ??
    (isGK
      ? 0
      : isCAM || isWinger || isWideMid
      ? Math.floor(3 + rng() * 8)
      : isFwd || isMid || isWingBack
      ? Math.floor(1 + rng() * 6)
      : Math.floor(rng() * 3));

  const xg = Number((raw.xg ?? Math.max(0.2, goals * (0.82 + rng() * 0.35))).toFixed(2));
  const xa = Number((raw.xa ?? Math.max(0.1, assists * (0.8 + rng() * 0.4))).toFixed(2));

  const passAccuracy = Number(
    (
      raw.pass_accuracy ??
      (isCDM || pos === 'CM'
        ? 85 + rng() * 8
        : isDef
        ? 82 + rng() * 10
        : isCAM || isWideMid
        ? 80 + rng() * 10
        : 73 + rng() * 12)
    ).toFixed(1)
  );

  const tackleBase = isDef || isCDM ? 2.1 + rng() * 1.6 : isMid ? 1.1 + rng() * 1.2 : 0.45 + rng() * 0.85;
  const interceptBase = isDef || isCDM ? 1.4 + rng() * 1.4 : isMid ? 0.8 + rng() * 1.0 : 0.3 + rng() * 0.7;
  const dribbleBase =
    isWinger || isCAM
      ? 2.0 + rng() * 2.1
      : isStriker || isWideMid
      ? 1.4 + rng() * 1.7
      : isFullBack
      ? 1.0 + rng() * 1.3
      : 0.45 + rng() * 0.95;

  const tacklesPer90 = Number(((raw.tackles ?? per90 * tackleBase) / per90).toFixed(2));
  const interceptionsPer90 = Number(((raw.interceptions ?? per90 * interceptBase) / per90).toFixed(2));
  const dribblesPer90 = Number(((raw.dribbles ?? per90 * dribbleBase) / per90).toFixed(2));
  const yellowCards = raw.yellow_cards ?? Math.floor(rng() * 5);
  const redCards = raw.red_cards ?? (rng() > 0.9 ? 1 : 0);

  const radar: PlayerRadarAxes = isGK
    ? {
        shooting: clamp(30 + rng() * 14),
        creativity: clamp(46 + rng() * 18),
        passing: clamp(passAccuracy - 6),
        dribbling: clamp(38 + rng() * 16),
        defending: clamp(80 + rng() * 16),
        discipline: clamp(92 - yellowCards * 5 - redCards * 15),
      }
    : {
        shooting: clamp(
          (isStriker ? 44 : isWinger || isCAM ? 40 : 35) +
            (goals / per90) * 65 +
            (xg / per90) * 20
        ),
        creativity: clamp(
          (isCAM || isWinger || isWideMid ? 44 : isWingBack ? 41 : 38) +
            (assists / per90) * 70 +
            (xa / per90) * 25
        ),
        passing: clamp(
          passAccuracy * 0.94 + (isMid ? 6 : isDef ? 3 : 0)
        ),
        dribbling: clamp(
          (isWinger || isCAM ? 42 : isFullBack ? 39 : 36) + dribblesPer90 * 14
        ),
        defending: clamp(
          (isDef || isCDM ? 36 : 30) + (tacklesPer90 + interceptionsPer90) * 11
        ),
        discipline: clamp(
          94 - (yellowCards / Math.max(1, appearances)) * 45 - redCards * 18
        ),
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

  const weightedRadarScore = isGK
    ? radar.defending * 0.46 + radar.passing * 0.24 + radar.discipline * 0.18 + radar.creativity * 0.12
    : isDef
    ? radar.defending * 0.42 +
      radar.passing * 0.24 +
      radar.discipline * 0.14 +
      (isFullBack ? radar.creativity * 0.1 + radar.dribbling * 0.1 : radar.shooting * 0.1 + radar.dribbling * 0.1)
    : isMid
    ? radar.passing * 0.28 +
      radar.creativity * 0.24 +
      radar.defending * (isCDM ? 0.26 : 0.16) +
      radar.dribbling * 0.16 +
      radar.shooting * (isCDM ? 0.06 : 0.16)
    : radar.shooting * 0.35 +
      radar.creativity * 0.24 +
      radar.dribbling * 0.22 +
      radar.passing * 0.11 +
      radar.discipline * 0.08;

  const baseRating =
    raw.rating ?? Number(Math.max(6.1, Math.min(8.6, 5.45 + weightedRadarScore / 44)).toFixed(2));
  const matchTimeLookup = new Map(allMatches.map((m) => [String(m.event_id), m.match_time]));

  const formTrend: MatchRatingPoint[] =
    recentLogs.length > 0
      ? recentLogs
          .slice(0, 7)
          .reverse()
          .map((log, idx) => {
            const matchTime = matchTimeLookup.get(String(log.eventId));
            const contribBonus =
              log.goals * 0.75 + log.assists * 0.55 + (log.role === 'Đá chính' ? 0.15 : -0.15);
            const rating = Number(
              Math.max(5.8, Math.min(9.6, baseRating + contribBonus + (rng() - 0.5) * 0.45)).toFixed(1)
            );
            return {
              matchId: String(log.eventId),
              opponent: log.opponent,
              dateLabel: matchTime
                ? new Date(matchTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                : `T${idx + 1}`,
              rating,
              minutes: log.role === 'Đá chính' ? 84 : 25,
              goals: log.goals,
              assists: log.assists,
            };
          })
      : (teamMatches.length > 0 ? teamMatches : Array.from({ length: 7 }))
          .slice(0, 7)
          .reverse()
          .map((m: any, idx) => {
            const rating = Number(Math.max(5.5, Math.min(9.4, baseRating + (rng() - 0.46) * 1.3)).toFixed(1));
            const isHome = m ? isSameClubName(m.home_team, params.teamName) : false;
            return {
              matchId: String(m?.event_id || idx),
              opponent: m ? (isHome ? m.away_team : m.home_team) : `Vòng ${idx + 1}`,
              dateLabel: m?.match_time
                ? new Date(m.match_time).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                : `V${idx + 1}`,
              rating,
              minutes: Math.floor(65 + rng() * 25),
              goals: rating >= 7.8 && rng() > 0.45 ? 1 : 0,
              assists: rating >= 7.5 && rng() > 0.5 ? 1 : 0,
            };
          });

  const recent5 = formTrend.slice(-5);
  const recent5Rating =
    recent5.length > 0
      ? Number((recent5.reduce((acc, p) => acc + p.rating, 0) / recent5.length).toFixed(2))
      : baseRating;
  const seasonRating = Number(baseRating.toFixed(2));

  return {
    id: canonicalId,
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