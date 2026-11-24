import { Match } from '../types/football';
import {
  extractClubSearchTerm,
  isSameClubName,
  normalizeSearchText,
} from '../utils/textNormalize';
import { TeamXgMap } from './predictionDataLoader';

export interface ScoreProbability {
  score: string;
  probability: number;
}

export interface H2HSummary {
  total: number;
  homeWins: number;
  draws: number;
  awayWins: number;
}

export interface MatchPredictionResult {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  homeExpectedGoals: number;
  awayExpectedGoals: number;
  homeElo: number;
  awayElo: number;
  mostLikelyScore: string;
  topScores: ScoreProbability[];
  over25Prob: number;
  bttsProb: number;
  confidence: 'Cao' | 'Trung bình' | 'Thấp';
  confidenceScore: number;
  h2h: H2HSummary;
  usedRealXg: boolean;
  usedStatsXg: boolean;
  sampleMatchesUsed: number;
  insights: string[];
}

const BASE_ELO = 1500;
const HOME_ELO_ADVANTAGE = 55;
const LEAGUE_AVG_GOALS = 1.38;

function getClubKey(name: string): string {
  return normalizeSearchText(extractClubSearchTerm(name || ''));
}

function computeDynamicEloMap(allMatches: Match[]): Map<string, number> {
  const eloMap = new Map<string, number>();

  const finishedSorted = allMatches
    .filter((m) => m.status === 'FINISHED' && m.home_score != null && m.away_score != null)
    .slice()
    .sort((a, b) => {
      const ta = a.match_time ? new Date(a.match_time).getTime() : 0;
      const tb = b.match_time ? new Date(b.match_time).getTime() : 0;
      return ta - tb;
    });

  for (const m of finishedSorted) {
    const hKey = getClubKey(m.home_team);
    const aKey = getClubKey(m.away_team);
    if (!hKey || !aKey) continue;

    const rH = eloMap.get(hKey) ?? BASE_ELO;
    const rA = eloMap.get(aKey) ?? BASE_ELO;

    const hGoals = Number(m.home_score) || 0;
    const aGoals = Number(m.away_score) || 0;

    const expectedHome = 1 / (1 + Math.pow(10, (rA - (rH + HOME_ELO_ADVANTAGE)) / 400));
    const actualHome = hGoals > aGoals ? 1 : hGoals < aGoals ? 0 : 0.5;

    const goalDiff = Math.abs(hGoals - aGoals);
    const marginMultiplier = goalDiff > 0 ? 1 + Math.log(goalDiff + 1) * 0.65 : 1;
    const kFactor = 24 * marginMultiplier;

    const delta = kFactor * (actualHome - expectedHome);
    eloMap.set(hKey, rH + delta);
    eloMap.set(aKey, rA - delta);
  }

  return eloMap;
}

interface TeamAttackDefense {
  attack: number;
  defense: number;
  sampleCount: number;
  directXgSamples: number;
  statsXgSamples: number;
}

function aggregateWeightedGoals(
  matches: Match[],
  teamName: string,
  xgMap: TeamXgMap,
  priorWeight: number
) {
  let weightedFor = 0;
  let weightedAgainst = 0;
  let totalWeight = 0;
  let directXgSamples = 0;
  let statsXgSamples = 0;

  matches.forEach((m, idx) => {
    const isHome = isSameClubName(m.home_team, teamName);
    const rawFor = Number(isHome ? m.home_score : m.away_score) || 0;
    const rawAgainst = Number(isHome ? m.away_score : m.home_score) || 0;

    const xgEntry = xgMap[String(m.event_id)];
    let effectiveFor = rawFor;
    let effectiveAgainst = rawAgainst;

    if (xgEntry) {
      if (xgEntry.isEstimated) statsXgSamples += 1;
      else directXgSamples += 1;

      const xgFor = isHome ? xgEntry.homeXg : xgEntry.awayXg;
      const xgAgainst = isHome ? xgEntry.awayXg : xgEntry.homeXg;
      const xgWeight = xgEntry.isEstimated ? 0.5 : 0.65;
      effectiveFor = xgWeight * xgFor + (1 - xgWeight) * rawFor;
      effectiveAgainst = xgWeight * xgAgainst + (1 - xgWeight) * rawAgainst;
    }

    const weight = Math.pow(0.93, idx);
    weightedFor += effectiveFor * weight;
    weightedAgainst += effectiveAgainst * weight;
    totalWeight += weight;
  });

  const avgFor = (weightedFor + priorWeight * LEAGUE_AVG_GOALS) / (totalWeight + priorWeight);
  const avgAgainst =
    (weightedAgainst + priorWeight * LEAGUE_AVG_GOALS) / (totalWeight + priorWeight);

  return {
    attack: avgFor / LEAGUE_AVG_GOALS,
    defense: avgAgainst / LEAGUE_AVG_GOALS,
    directXgSamples,
    statsXgSamples,
  };
}

function computeTeamStrength(
  teamName: string,
  venue: 'HOME' | 'AWAY',
  allMatches: Match[],
  xgMap: TeamXgMap
): TeamAttackDefense {
  const allTeamFinished = allMatches
    .filter(
      (m) =>
        m.status === 'FINISHED' &&
        m.home_score != null &&
        m.away_score != null &&
        (isSameClubName(m.home_team, teamName) || isSameClubName(m.away_team, teamName))
    )
    .slice()
    .sort((a, b) => {
      const ta = a.match_time ? new Date(a.match_time).getTime() : 0;
      const tb = b.match_time ? new Date(b.match_time).getTime() : 0;
      return tb - ta;
    });

  const recentOverall = allTeamFinished.slice(0, 14);
  if (recentOverall.length === 0) {
    return { attack: 1.0, defense: 1.0, sampleCount: 0, directXgSamples: 0, statsXgSamples: 0 };
  }

  const recentVenue = allTeamFinished
    .filter((m) =>
      venue === 'HOME'
        ? isSameClubName(m.home_team, teamName)
        : isSameClubName(m.away_team, teamName)
    )
    .slice(0, 8);

  const overallAgg = aggregateWeightedGoals(recentOverall, teamName, xgMap, 2.0);
  const venueAgg =
    recentVenue.length > 0
      ? aggregateWeightedGoals(recentVenue, teamName, xgMap, 2.4)
      : overallAgg;

  const venueBlend = recentVenue.length >= 3 ? 0.32 : 0.15;

  return {
    attack: overallAgg.attack * (1 - venueBlend) + venueAgg.attack * venueBlend,
    defense: overallAgg.defense * (1 - venueBlend) + venueAgg.defense * venueBlend,
    sampleCount: recentOverall.length,
    directXgSamples: overallAgg.directXgSamples,
    statsXgSamples: overallAgg.statsXgSamples,
  };
}

function computeH2H(homeTeam: string, awayTeam: string, allMatches: Match[]): H2HSummary {
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;

  for (const m of allMatches) {
    if (m.status !== 'FINISHED' || m.home_score == null || m.away_score == null) continue;

    const sameOrder =
      isSameClubName(m.home_team, homeTeam) && isSameClubName(m.away_team, awayTeam);
    const reverseOrder =
      isSameClubName(m.home_team, awayTeam) && isSameClubName(m.away_team, homeTeam);

    if (!sameOrder && !reverseOrder) continue;

    const hGoals = Number(m.home_score) || 0;
    const aGoals = Number(m.away_score) || 0;

    if (hGoals === aGoals) {
      draws += 1;
    } else if ((sameOrder && hGoals > aGoals) || (reverseOrder && aGoals > hGoals)) {
      homeWins += 1;
    } else {
      awayWins += 1;
    }
  }

  return {
    total: homeWins + draws + awayWins,
    homeWins,
    draws,
    awayWins,
  };
}

function poissonPmf(k: number, lambda: number): number {
  let fact = 1;
  for (let i = 2; i <= k; i++) fact *= i;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / fact;
}

function normalizePercentages(raw: [number, number, number]): [number, number, number] {
  const sum = raw[0] + raw[1] + raw[2] || 1;
  const exact = raw.map((v) => (v / sum) * 100);
  const floored = exact.map((v) => Math.floor(v));
  const remainder = 100 - (floored[0] + floored[1] + floored[2]);

  const order = [0, 1, 2].sort((a, b) => exact[b] - floored[b] - (exact[a] - floored[a]));
  for (let i = 0; i < remainder; i++) {
    floored[order[i % 3]] += 1;
  }
  return [floored[0], floored[1], floored[2]];
}

export function predictMatchOutcome(
  homeTeam: string,
  awayTeam: string,
  allMatches: Match[],
  xgMap: TeamXgMap = {}
): MatchPredictionResult {
  const eloMap = computeDynamicEloMap(allMatches);
  const homeEloRaw = eloMap.get(getClubKey(homeTeam)) ?? BASE_ELO;
  const awayEloRaw = eloMap.get(getClubKey(awayTeam)) ?? BASE_ELO;

  const homeStr = computeTeamStrength(homeTeam, 'HOME', allMatches, xgMap);
  const awayStr = computeTeamStrength(awayTeam, 'AWAY', allMatches, xgMap);
  const h2h = computeH2H(homeTeam, awayTeam, allMatches);

  // Điều chỉnh nhẹ theo đối đầu trực tiếp (H2H) nếu đã gặp nhau
  const h2hEdge =
    h2h.total > 0 ? ((h2h.homeWins - h2h.awayWins) / (h2h.total + 2)) * 0.08 : 0;

  const eloDiff = homeEloRaw + HOME_ELO_ADVANTAGE - awayEloRaw;
  const eloFactorHome = Math.min(1.38, Math.max(0.72, Math.exp(eloDiff / 1150) + h2hEdge));
  const eloFactorAway = Math.min(1.38, Math.max(0.72, Math.exp(-eloDiff / 1150) - h2hEdge));

  const lambdaHome = Math.min(
    3.6,
    Math.max(0.35, LEAGUE_AVG_GOALS * homeStr.attack * awayStr.defense * 1.1 * eloFactorHome)
  );
  const lambdaAway = Math.min(
    3.4,
    Math.max(0.3, LEAGUE_AVG_GOALS * awayStr.attack * homeStr.defense * 0.92 * eloFactorAway)
  );

  const rho = -0.06;
  let pHome = 0;
  let pDraw = 0;
  let pAway = 0;
  let pOver25 = 0;
  let pBtts = 0;
  let totalMatrix = 0;
  const scoreList: ScoreProbability[] = [];

  for (let h = 0; h <= 6; h++) {
    for (let a = 0; a <= 6; a++) {
      let tau = 1;
      if (h === 0 && a === 0) tau = 1 - lambdaHome * lambdaAway * rho;
      else if (h === 1 && a === 0) tau = 1 + lambdaAway * rho;
      else if (h === 0 && a === 1) tau = 1 + lambdaHome * rho;
      else if (h === 1 && a === 1) tau = 1 - rho;

      const prob = Math.max(0, poissonPmf(h, lambdaHome) * poissonPmf(a, lambdaAway) * tau);
      totalMatrix += prob;

      if (h > a) pHome += prob;
      else if (h === a) pDraw += prob;
      else pAway += prob;

      if (h + a >= 3) pOver25 += prob;
      if (h >= 1 && a >= 1) pBtts += prob;

      scoreList.push({ score: `${h} - ${a}`, probability: prob });
    }
  }

  scoreList.sort((x, y) => y.probability - x.probability);
  const topScores = scoreList.slice(0, 3).map((item) => ({
    score: item.score,
    probability: Math.round((item.probability / (totalMatrix || 1)) * 1000) / 10,
  }));

  const [homeWinProb, drawProb, awayWinProb] = normalizePercentages([pHome, pDraw, pAway]);
  const over25Prob = Math.round((pOver25 / (totalMatrix || 1)) * 100);
  const bttsProb = Math.round((pBtts / (totalMatrix || 1)) * 100);

  const usedRealXg = homeStr.directXgSamples + awayStr.directXgSamples > 0;
  const usedStatsXg = homeStr.statsXgSamples + awayStr.statsXgSamples > 0;
  const sampleMatchesUsed = homeStr.sampleCount + awayStr.sampleCount;

  const sampleScore = Math.min(28, sampleMatchesUsed) * 2.0;
  const xgBonus = usedRealXg ? 18 : usedStatsXg ? 12 : 0;
  const clarityBonus = Math.min(26, Math.abs(homeWinProb - awayWinProb) * 0.55);
  const confidenceScore = Math.min(96, Math.round(sampleScore + xgBonus + clarityBonus));
  const confidence: 'Cao' | 'Trung bình' | 'Thấp' =
    confidenceScore >= 68 ? 'Cao' : confidenceScore >= 45 ? 'Trung bình' : 'Thấp';

  const homeElo = Math.round(homeEloRaw);
  const awayElo = Math.round(awayEloRaw);

  const insights: string[] = [];
  const rawEloGap = homeElo - awayElo;
  if (Math.abs(rawEloGap) >= 45) {
    const stronger = rawEloGap > 0 ? homeTeam : awayTeam;
    insights.push(
      `${stronger} đang nhỉnh hơn ${Math.abs(rawEloGap)} điểm Elo dựa trên ${sampleMatchesUsed} trận gần đây của 2 đội.`
    );
  } else {
    insights.push(
      `Tương quan Elo khá cân bằng (${homeElo} vs ${awayElo} qua ${sampleMatchesUsed} trận mẫu), lợi thế sân nhà đóng vai trò then chốt.`
    );
  }

  if (usedRealXg || usedStatsXg) {
    const xgSourceText = usedRealXg ? 'dữ liệu xG thực tế' : 'thống kê cú sút & xG quy đổi';
    insights.push(
      `Tích hợp ${xgSourceText}: kỳ vọng bàn thắng ${homeTeam} (${lambdaHome.toFixed(2)} xG) vs ${awayTeam} (${lambdaAway.toFixed(2)} xG).`
    );
  } else {
    insights.push(
      `Hiệu suất ghi bàn kỳ vọng ước tính ở mức ${lambdaHome.toFixed(2)} - ${lambdaAway.toFixed(2)} bàn.`
    );
  }

  if (h2h.total > 0) {
    insights.push(
      `Đối đầu gần đây (${h2h.total} trận): ${homeTeam} thắng ${h2h.homeWins}, hòa ${h2h.draws}, ${awayTeam} thắng ${h2h.awayWins}.`
    );
  }

  return {
    homeWinProb,
    drawProb,
    awayWinProb,
    homeExpectedGoals: Number(lambdaHome.toFixed(2)),
    awayExpectedGoals: Number(lambdaAway.toFixed(2)),
    homeElo,
    awayElo,
    mostLikelyScore: topScores[0]?.score || '1 - 1',
    topScores,
    over25Prob,
    bttsProb,
    confidence,
    confidenceScore,
    h2h,
    usedRealXg,
    usedStatsXg,
    sampleMatchesUsed,
    insights,
  };
}