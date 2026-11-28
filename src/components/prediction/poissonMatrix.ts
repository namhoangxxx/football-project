export interface ScoreMatrixData {
  matrix: number[][];
  maxProb: number;
}

const MAX_GOALS = 4;

function factorial(n: number): number {
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function poisson(k: number, lambda: number): number {
  const safe = Math.max(0.05, lambda);
  return (Math.pow(safe, k) * Math.exp(-safe)) / factorial(k);
}

export function buildScoreMatrix(homeXg: number, awayXg: number): ScoreMatrixData {
  const homeDist = Array.from({ length: MAX_GOALS + 1 }, (_, k) => poisson(k, homeXg));
  const awayDist = Array.from({ length: MAX_GOALS + 1 }, (_, k) => poisson(k, awayXg));

  let maxProb = 0;
  const matrix: number[][] = [];

  for (let h = 0; h <= MAX_GOALS; h++) {
    const row: number[] = [];
    for (let a = 0; a <= MAX_GOALS; a++) {
      const pct = Number((homeDist[h] * awayDist[a] * 100).toFixed(1));
      if (pct > maxProb) maxProb = pct;
      row.push(pct);
    }
    matrix.push(row);
  }

  return { matrix, maxProb };
}