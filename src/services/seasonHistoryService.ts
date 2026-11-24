import { SUPABASE_HEADERS, SUPABASE_URL } from '../config/supabase';
import { Match } from '../types/football';

let cachedSeasonMatches: Match[] | null = null;
let inflightPromise: Promise<Match[]> | null = null;

export async function fetchAllSupabaseRows<T = any>(
  table: string,
  select = '*',
  order = '',
  maxRows = 50000
): Promise<T[]> {
  const pageSize = 1000;
  const allRows: T[] = [];
  let offset = 0;

  while (offset < maxRows) {
    const orderParam = order ? `&order=${encodeURIComponent(order)}` : '';
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${orderParam}&limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, { headers: SUPABASE_HEADERS });
    if (!res.ok) break;
    const chunk: T[] = await res.json();
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    allRows.push(...chunk);
    if (chunk.length < pageSize) break;
    offset += pageSize;
  }

  return allRows;
}

function mergeUniqueMatches(primary: Match[], secondary: Match[]): Match[] {
  const map = new Map<string, Match>();
  for (const m of [...primary, ...secondary]) {
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
      const rows = await fetchAllSupabaseRows<Match>('matches', '*', 'match_time.desc');
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