import { SUPABASE_HEADERS, SUPABASE_URL } from '../config/supabase';
import { Match } from '../types/football';
import { isSameClubName } from '../utils/textNormalize';
import { fetchClubMatchesFromSupabase } from './footballApi';
import { getFullSeasonMatches } from './seasonHistoryService';

export interface TeamXgEntry {
  homeXg: number;
  awayXg: number;
  isEstimated: boolean;
}

export interface TeamXgMap {
  [eventId: string]: TeamXgEntry;
}

export interface ExpandedPredictionData {
  matches: Match[];
  xgMap: TeamXgMap;
}

function sortMatchesByTimeDesc(list: Match[]): Match[] {
  return [...list].sort((a, b) => {
    const ta = a.match_time ? new Date(a.match_time).getTime() : 0;
    const tb = b.match_time ? new Date(b.match_time).getTime() : 0;
    return tb - ta;
  });
}

function mergeMatches(lists: Match[][]): Match[] {
  const map = new Map<string, Match>();
  for (const list of lists) {
    for (const m of list || []) {
      if (!m) continue;
      const key = String(m.event_id || m.id || `${m.home_team}_${m.away_team}_${m.match_time || ''}`);
      if (!map.has(key)) map.set(key, m);
    }
  }
  return Array.from(map.values());
}

/**
 * Nạp dữ liệu đầy đủ cho mô hình dự đoán:
 * 1. Hợp nhất toàn bộ trận mùa giải + lịch sử riêng của 2 CLB từ Supabase
 * 2. Lấy thống kê từ bảng match_details cho tối đa 15 trận gần nhất mỗi đội + các trận H2H
 */
export async function fetchExpandedPredictionData(
  homeTeam: string,
  awayTeam: string,
  allMatches: Match[],
  homeTeamId = 0,
  awayTeamId = 0
): Promise<ExpandedPredictionData> {
  let pool = await getFullSeasonMatches(allMatches);

  const homeFinishedCount = pool.filter(
    (m) => m.status === 'FINISHED' && (isSameClubName(m.home_team, homeTeam) || isSameClubName(m.away_team, homeTeam))
  ).length;
  const awayFinishedCount = pool.filter(
    (m) => m.status === 'FINISHED' && (isSameClubName(m.home_team, awayTeam) || isSameClubName(m.away_team, awayTeam))
  ).length;

  // Nếu pool hiện tại chưa đủ lịch sử của 1 trong 2 đội, truy vấn bổ sung trực tiếp theo CLB
  if (homeFinishedCount < 12 || awayFinishedCount < 12) {
    const [homeExtra, awayExtra] = await Promise.all([
      homeFinishedCount < 12 ? fetchClubMatchesFromSupabase(homeTeamId, homeTeam) : Promise.resolve([]),
      awayFinishedCount < 12 ? fetchClubMatchesFromSupabase(awayTeamId, awayTeam) : Promise.resolve([]),
    ]);
    pool = mergeMatches([pool, homeExtra, awayExtra]);
  }

  const finishedSorted = sortMatchesByTimeDesc(
    pool.filter((m) => m.status === 'FINISHED')
  );

  const homeRecentIds = finishedSorted
    .filter((m) => isSameClubName(m.home_team, homeTeam) || isSameClubName(m.away_team, homeTeam))
    .slice(0, 15)
    .map((m) => String(m.event_id).trim());

  const awayRecentIds = finishedSorted
    .filter((m) => isSameClubName(m.home_team, awayTeam) || isSameClubName(m.away_team, awayTeam))
    .slice(0, 15)
    .map((m) => String(m.event_id).trim());

  const h2hIds = finishedSorted
    .filter(
      (m) =>
        (isSameClubName(m.home_team, homeTeam) && isSameClubName(m.away_team, awayTeam)) ||
        (isSameClubName(m.home_team, awayTeam) && isSameClubName(m.away_team, homeTeam))
    )
    .slice(0, 8)
    .map((m) => String(m.event_id).trim());

  const relevantIds = Array.from(
    new Set([...homeRecentIds, ...awayRecentIds, ...h2hIds].filter(Boolean))
  );

  if (relevantIds.length === 0) {
    return { matches: pool, xgMap: {} };
  }

  try {
    const idList = relevantIds.join(',');
    // Dùng select=* để tránh lỗi HTTP 400 nếu bảng match_details không có cột home_xg/away_xg
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/match_details?event_id=in.(${idList})&select=*`,
      { headers: SUPABASE_HEADERS }
    );
    if (!res.ok) return { matches: pool, xgMap: {} };

    const rows = await res.json();
    const xgMap: TeamXgMap = {};

    for (const r of rows || []) {
      const evId = String(r.event_id);
      const directHomeXg = Number(r.home_xg);
      const directAwayXg = Number(r.away_xg);

      if (
        !Number.isNaN(directHomeXg) &&
        !Number.isNaN(directAwayXg) &&
        (directHomeXg > 0 || directAwayXg > 0)
      ) {
        xgMap[evId] = { homeXg: directHomeXg, awayXg: directAwayXg, isEstimated: false };
        continue;
      }

      // Quy đổi xG từ thống kê dứt điểm & phạt góc thực tế của trận đấu
      const hSot = Number(r.home_shots_on_target) || 0;
      const aSot = Number(r.away_shots_on_target) || 0;
      const hShots = Math.max(hSot, Number(r.home_shots) || 0);
      const aShots = Math.max(aSot, Number(r.away_shots) || 0);
      const hCorners = Number(r.home_corners) || 0;
      const aCorners = Number(r.away_corners) || 0;

      if (hShots > 0 || aShots > 0) {
        const estHome = Number((hSot * 0.31 + (hShots - hSot) * 0.055 + hCorners * 0.025).toFixed(2));
        const estAway = Number((aSot * 0.31 + (aShots - aSot) * 0.055 + aCorners * 0.025).toFixed(2));
        xgMap[evId] = { homeXg: estHome, awayXg: estAway, isEstimated: true };
      }
    }

    return { matches: pool, xgMap };
  } catch {
    return { matches: pool, xgMap: {} };
  }
}

export async function fetchRecentMatchesXg(
  homeTeam: string,
  awayTeam: string,
  allMatches: Match[]
): Promise<TeamXgMap> {
  const { xgMap } = await fetchExpandedPredictionData(homeTeam, awayTeam, allMatches);
  return xgMap;
}