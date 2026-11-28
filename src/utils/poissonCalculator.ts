import { MatchPredictionMetrics, ScorelineProbability } from '../types/prediction';

const MAX_GOALS = 5;

function factorial(n: number): number {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function poissonPMF(k: number, lambda: number): number {
  const safeLambda = Math.max(0.05, lambda);
  return (Math.pow(safeLambda, k) * Math.exp(-safeLambda)) / factorial(k);
}

/**
 * Tính toán toàn bộ bộ chỉ số & ma trận xác suất từ bàn thắng kỳ vọng (lambda)
 */
export function buildPoissonPrediction(
  expectedHomeGoals: number,
  expectedAwayGoals: number,
): MatchPredictionMetrics {
  const rawHome = Array.from({ length: MAX_GOALS + 1 }, (_, k) =>
    poissonPMF(k, expectedHomeGoals),
  );
  const rawAway = Array.from({ length: MAX_GOALS + 1 }, (_, k) =>
    poissonPMF(k, expectedAwayGoals),
  );

  // Chuẩn hóa phân phối trong khoảng 0..5 bàn để tổng xác suất tròn 100%
  const sumHome = rawHome.reduce((a, b) => a + b, 0);
  const sumAway = rawAway.reduce((a, b) => a + b, 0);
  const homeDist = rawHome.map(p => p / sumHome);
  const awayDist = rawAway.map(p => p / sumAway);

  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  let over25 = 0;
  let bttsYes = 0;
  let maxMatrixProb = 0;

  const scoreMatrix: number[][] = [];
  const allScorelines: ScorelineProbability[] = [];

  for (let h = 0; h <= MAX_GOALS; h++) {
    const row: number[] = [];
    for (let a = 0; a <= MAX_GOALS; a++) {
      const prob = homeDist[h] * awayDist[a];
      const probPercent = Number((prob * 100).toFixed(2));
      row.push(probPercent);

      if (probPercent > maxMatrixProb) maxMatrixProb = probPercent;

      if (h > a) homeWin += prob;
      else if (h === a) draw += prob;
      else awayWin += prob;

      if (h + a > 2) over25 += prob;
      if (h > 0 && a > 0) bttsYes += prob;

      allScorelines.push({
        homeGoals: h,
        awayGoals: a,
        probability: probPercent,
        label: `${h} - ${a}`,
      });
    }
    scoreMatrix.push(row);
  }

  const topScorelines = allScorelines
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);

  const homeWinProb = Number((homeWin * 100).toFixed(1));
  const drawProb = Number((draw * 100).toFixed(1));
  const awayWinProb = Number((100 - homeWinProb - drawProb).toFixed(1));
  const over25Prob = Number((over25 * 100).toFixed(1));
  const bttsYesProb = Number((bttsYes * 100).toFixed(1));

  return {
    expectedHomeGoals: Number(expectedHomeGoals.toFixed(2)),
    expectedAwayGoals: Number(expectedAwayGoals.toFixed(2)),
    homeWinProb,
    drawProb,
    awayWinProb,
    over25Prob,
    under25Prob: Number((100 - over25Prob).toFixed(1)),
    bttsYesProb,
    bttsNoProb: Number((100 - bttsYesProb).toFixed(1)),
    scoreMatrix,
    maxMatrixProb,
    topScorelines,
  };
}