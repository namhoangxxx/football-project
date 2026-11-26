import { SUPABASE_HEADERS, SUPABASE_URL } from '../config/supabase';
import { Match } from '../types/football';

let cachedSeasonMatches: Match[] | null = null;
let inflightPromise: Promise<Match[]> | null = null;

export function clearSeasonMatchesCache(): void {
  cachedSeasonMatches = null;
}

export async function fetchAllSupabaseRows<T = any>(
  table: string,
  select = '*',
  order = '',
  maxRows = 10000
): Promise<T[]> {
  const pageSize = 1000;
  const orderParam = order ? `&order=${encodeURIComponent(order)}` : '';
  const selectParam = encodeURIComponent(select);

  const fetchPage = async (offset: number, limit: number): Promise<T[]> => {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${selectParam}${orderParam}&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { headers: SUPABASE_HEADERS });
    if (!res.ok) return [];
    const chunk = await res.json();
    return Array.isArray(chunk) ? chunk : [];
  };

  const firstLimit = Math.min(pageSize, maxRows);
  const firstChunk = await fetchPage(0, firstLimit);
  if (firstChunk.length < firstLimit || maxRows <= pageSize) {
    return firstChunk;
  }

  const allRows: T[] = [...firstChunk];
  let offset = pageSize;
  const concurrency = 3;

  // Tải song song từng cụm 3 trang để giảm độ trễ mạng nhưng vẫn dừng ngay khi hết dữ liệu
  while (offset < maxRows) {
    const batchOffsets: number[] = [];
    for (let i = 0; i < concurrency && offset + i * pageSize < maxRows; i++) {
      batchOffsets.push(offset + i * pageSize);
    }

    const chunks = await Promise.all(
      batchOffsets.map((off) => fetchPage(off, Math.min(pageSize, maxRows - off)))
    );

    let reachedEnd = false;
    for (const chunk of chunks) {
      if (chunk.length === 0) {
        reachedEnd = true;
        break;
      }
      allRows.push(...chunk);
      if (chunk.length < pageSize) {
        reachedEnd = true;
        break;
      }
    }

    if (reachedEnd) break;
    offset += batchOffsets.length * pageSize;
  }

  return allRows;
}

function mergeUniqueMatches(primary: Match[], secondary: Match[]): Match[] {
  if (secondary.length === 0) return primary;
  if (primary.length === 0) return secondary;

  const map = new Map<string, Match>();
  for (const m of primary) {
    if (!m) continue;
    const key = String(m.event_id || `${m.home_team}_${m.away_team}_${m.match_time || ''}`);
    if (!map.has(key)) map.set(key, m);
  }
  for (const m of secondary) {
    if (!m) continue;
    const key = String(m.event_id || `${m.home_team}_${m.away_team}_${m.match_time || ''}`);
    if (!map.has(key)) map.set(key, m);
  }
  return Array.from(map.values());
}

export async function getFullSeasonMatches(fallbackMatches: Match[] = []): Promise<Match[]> {
  if (cachedSeasonMatches && cachedSeasonMatches.length > 0) {
    return mergeUniqueMatches(cachedSeasonMatches, fallbackMatches);
  }
  if (inflightPromise) {
    const res = await inflightPromise;
    return mergeUniqueMatches(res, fallbackMatches);
  }

  inflightPromise = (async () => {
    try {
      const rows = await fetchAllSupabaseRows<Match>('matches', '*', 'match_time.desc', 3500);
      if (rows.length > 0) cachedSeasonMatches = rows;
      return rows;
    } catch {
      return [];
    } finally {
      inflightPromise = null;
    }
  })();

  const fetched = await inflightPromise;
  return mergeUniqueMatches(fetched, fallbackMatches);
}