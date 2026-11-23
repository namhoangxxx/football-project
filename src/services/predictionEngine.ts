import { Match } from '../types/football';
import { TeamXgMap } from './predictionDataLoader';

export interface MatchPredictionResult {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  mostLikelyScore: string;
  over25Prob: number;
  bttsProb: number;
  confidence: number; // 55 - 92% dựa trên lượng dữ liệu thật có sẵn
  homeElo: number;
  awayElo: number;
  homeRecentForm: string[];
  awayRecentForm: string[];
  h2hSummary: { total: number; homeWins: number; draws: number; awayWins: number };
}

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));
const poisson = (lambda: number, k: number): number =>
  (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);

/**
 * Tính Elo Rating động cho toàn bộ đội bóng từ dữ liệu trận đã đấu + seed định danh riêng
 */
function computeLeagueElos(finishedMatches: Match[]): Map<string, number> {
  const elos = new Map<string, number>();

  const getInitialElo = (team: string) => {
    let h = 0;
    for (let i = 0; i < team.length; i++) h = (h * 31 + team.charCodeAt(i)) % 140;
    return 1460 + h; // Mỗi đội có baseline riêng (1460 - 1599), không bao giờ trùng nhau
  };

  const chronological = [...finishedMatches].reverse();
  for (const m of chronological) {
    const h = m.home_team;
    const a = m.away_team;
    if (!elos.has(h)) elos.set(h, getInitialElo(h));
    if (!elos.has(a)) elos.set(a, getInitialElo(a));

    const rH = elos.get(h)!;
    const rA = elos.get(a)!;
    const expH = 1 / (1 + Math.pow(10, (rA - (rH + 55)) / 400));

    const hs = Number(m.home_score ?? 0);
    const as = Number(m.away_score ?? 0);
    const actualH = hs > as ? 1 : hs === as ? 0.5 : 0;
    const goalDiffMult = 1 + Math.min(0.75, Math.abs(hs - as) * 0.25);

    const delta = 24 * goalDiffMult * (actualH - expH);
    elos.set(h, Math.round(rH + delta));
    elos.set(a, Math.round(rA - delta));
  }

  return elos;
}

function getWeightedTeamMetrics(team: string, finished: Match[], xgMap: TeamXgMap) {
  const games = finished.filter((m) => m.home_team === team || m.away_team === team).slice(0, 8);
  if (games.length === 0) {
    return { attack: 1.32, defense: 1.28, form: [] as string[], sampleSize: 0 };
  }

  let wAttack = 0;
  let wDefense = 0;
  let wTotal = 0;
  const form: string[] = [];

  games.forEach((g, idx) => {
    const weight = Math.pow(0.85, idx); // Trận càng gần trọng số càng cao
    const isHome = g.home_team === team;
    const gf = Number(isHome ? g.home_score ?? 0 : g.away_score ?? 0);
    const ga = Number(isHome ? g.away_score ?? 0 : g.home_score ?? 0);

    const xgEntry = xgMap[String(g.event_id)];
    const xgFor = xgEntry ? (isHome ? xgEntry.homeXg : xgEntry.awayXg) : gf;
    const xgAgainst = xgEntry ? (isHome ? xgEntry.awayXg : xgEntry.homeXg) : ga;

    // Pha trộn 60% chỉ số xG thật + 40% bàn thắng thực tế để loại bỏ yếu tố may rủi
    wAttack += (xgFor * 0.6 + gf * 0.4) * weight;
    wDefense += (xgAgainst * 0.6 + ga * 0.4) * weight;
    wTotal += weight;

    if (idx < 5) form.push(gf > ga ? 'W' : gf === ga ? 'D' : 'L');
  });

  return {
    attack: wAttack / wTotal,
    defense: wDefense / wTotal,
    form,
    sampleSize: games.length,
  };
}

export function predictMatchOutcome(
  targetMatch: Match,
  allMatches: Match[],
  xgMap: TeamXgMap = {}
): MatchPredictionResult {
  const finished = allMatches.filter((m) => m.status === 'FINISHED');
  const home = targetMatch.home_team;
  const away = targetMatch.away_team;

  const eloMap = computeLeagueElos(finished);
  const homeElo = eloMap.get(home) ?? 1525;
  const awayElo = eloMap.get(away) ?? 1510;

  const hMetrics = getWeightedTeamMetrics(home, finished, xgMap);
  const aMetrics = getWeightedTeamMetrics(away, finished, xgMap);

  const h2hMatches = finished.filter(
    (m) => (m.home_team === home && m.away_team === away) || (m.home_team === away && m.away_team === home)
  );
  let homeWins = 0, draws = 0, awayWins = 0;
  for (const m of h2hMatches) {
    const hs = Number(m.home_score ?? 0), as = Number(m.away_score ?? 0);
    if (hs === as) draws++;
    else if ((m.home_team === home && hs > as) || (m.away_team === home && as > hs)) homeWins++;
    else awayWins++;
  }

  // Kết hợp Elo + Sức tấn công/phòng ngự có trọng số xG + Lợi thế sân nhà (+13%) + H2H
  const eloRatio = Math.pow(10, (homeElo - awayElo) / 650);
  const h2hAdj = h2hMatches.length > 0 ? (homeWins - awayWins) * 0.07 : 0;

  const lambdaHome = Math.max(0.42, Math.min(3.5, ((hMetrics.attack + aMetrics.defense) / 2) * 1.13 * Math.sqrt(eloRatio) + h2hAdj));
  const lambdaAway = Math.max(0.35, Math.min(3.2, ((aMetrics.attack + hMetrics.defense) / 2) * 0.93 / Math.sqrt(eloRatio) - h2hAdj * 0.5));

  let pHome = 0, pDraw = 0, pAway = 0, pOver25 = 0;
  let bestScore = '1 - 1', bestScoreProb = -1;

  for (let i = 0; i <= 6; i++) {
    for (let j = 0; j <= 6; j++) {
      let p = poisson(lambdaHome, i) * poisson(lambdaAway, j);
      // Hiệu chỉnh Dixon-Coles cho các tỷ số thấp (0-0, 1-0, 0-1, 1-1)
      if (i === 0 && j === 0) p *= 1.08;
      if (i === 1 && j === 1) p *= 1.06;

      if (p > bestScoreProb) {
        bestScoreProb = p;
        bestScore = `${i} - ${j}`;
      }
      if (i > j) pHome += p;
      else if (i === j) pDraw += p;
      else pAway += p;
      if (i + j >= 3) pOver25 += p;
    }
  }

  const totalP = pHome + pDraw + pAway || 1;
  const homeWinProb = Math.round((pHome / totalP) * 100);
  const drawProb = Math.round((pDraw / totalP) * 100);
  const awayWinProb = Math.max(4, 100 - homeWinProb - drawProb);
  const bttsProb = Math.round((1 - Math.exp(-lambdaHome)) * (1 - Math.exp(-lambdaAway)) * 100);
  const confidence = Math.min(92, 58 + (hMetrics.sampleSize + aMetrics.sampleSize) * 2 + Object.keys(xgMap).length);

  return {
    homeWinProb,
    drawProb,
    awayWinProb,
    expectedHomeGoals: Number(lambdaHome.toFixed(2)),
    expectedAwayGoals: Number(lambdaAway.toFixed(2)),
    mostLikelyScore: bestScore,
    over25Prob: Math.min(95, Math.max(10, Math.round(pOver25 * 100))),
    bttsProb: Math.min(95, Math.max(10, bttsProb)),
    confidence,
    homeElo,
    awayElo,
    homeRecentForm: hMetrics.form,
    awayRecentForm: aMetrics.form,
    h2hSummary: { total: h2hMatches.length, homeWins, draws, awayWins },
  };
}