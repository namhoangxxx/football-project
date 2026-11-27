import { SUPABASE_HEADERS, SUPABASE_URL } from '../config/supabase';
import { isSameClubName, normalizeSearchText } from '../utils/textNormalize';

export interface ResolvedTeamIdentity {
  ids: Set<string>;
  rawNames: string[];
  normalizedNames: Set<string>;
}

let cachedTeamMap: Record<string, any>[] | null = null;
let pendingRequest: Promise<Record<string, any>[]> | null = null;

const NON_TEAM_PREFIXES = [
  'league',
  'competition',
  'country',
  'area',
  'season',
  'sport',
  'venue',
  'stadium',
];

const isTeamIdColumn = (key: string): boolean => {
  const k = key.toLowerCase();
  if (k === 'id' || !k.includes('id')) return false;
  return !NON_TEAM_PREFIXES.some((prefix) => k.includes(prefix));
};

const isTeamNameColumn = (key: string): boolean => {
  const k = key.toLowerCase();
  if (NON_TEAM_PREFIXES.some((prefix) => k.includes(prefix))) return false;
  return k.includes('name') || k.includes('team') || k.includes('alias') || k === 'tla' || k === 'code';
};

const extractColumnStrings = (val: unknown): string[] => {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed && !trimmed.startsWith('http') ? [trimmed] : [];
  }
  if (Array.isArray(val)) {
    return val.flatMap(extractColumnStrings);
  }
  return [];
};

const loadTeamMap = async (): Promise<Record<string, any>[]> => {
  if (cachedTeamMap) return cachedTeamMap;
  if (pendingRequest) return pendingRequest;

  pendingRequest = fetch(`${SUPABASE_URL}/rest/v1/team_map?select=*`, {
    headers: SUPABASE_HEADERS,
  })
    .then((res) => (res.ok ? res.json() : []))
    .then((rows) => {
      cachedTeamMap = Array.isArray(rows) ? rows : [];
      return cachedTeamMap;
    })
    .catch(() => [])
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
};

const rowHasExactName = (row: Record<string, any>, targetNorm: string): boolean =>
  Object.entries(row).some(([key, val]) => {
    if (!isTeamNameColumn(key)) return false;
    return extractColumnStrings(val).some((s) => normalizeSearchText(s) === targetNorm);
  });

const rowHasAliasName = (row: Record<string, any>, rawTeamName: string): boolean =>
  Object.entries(row).some(([key, val]) => {
    if (!isTeamNameColumn(key)) return false;
    return extractColumnStrings(val).some((s) => isSameClubName(s, rawTeamName));
  });

const rowHasTeamId = (row: Record<string, any>, targetId: string): boolean =>
  Object.entries(row).some(([key, val]) => {
    if (val == null || !isTeamIdColumn(key)) return false;
    return String(val).trim() === targetId;
  });

export const resolveTeamFromMap = async (
  teamId?: number,
  teamName?: string
): Promise<ResolvedTeamIdentity> => {
  const ids = new Set<string>();
  const rawNames = new Set<string>();
  const normalizedNames = new Set<string>();

  const cleanName = teamName?.trim() || '';
  const targetNorm = cleanName ? normalizeSearchText(cleanName) : '';
  const targetId = teamId && teamId > 0 ? String(teamId) : '';

  if (targetId) ids.add(targetId);
  if (cleanName) {
    rawNames.add(cleanName);
    normalizedNames.add(targetNorm);
  }

  const rows = await loadTeamMap();

  // Ưu tiên khớp chính xác theo tên CLB trước, sau đó mới xét alias và ID để tránh trùng ID chéo
  const matched =
    (targetNorm && rows.find((r) => rowHasExactName(r, targetNorm))) ||
    (cleanName && rows.find((r) => rowHasAliasName(r, cleanName))) ||
    (targetId && rows.find((r) => rowHasTeamId(r, targetId))) ||
    null;

  if (matched) {
    Object.entries(matched).forEach(([key, val]) => {
      if (val == null) return;
      if (isTeamIdColumn(key)) {
        const idStr = String(val).trim();
        if (idStr) ids.add(idStr);
      } else if (isTeamNameColumn(key)) {
        extractColumnStrings(val).forEach((s) => {
          normalizedNames.add(normalizeSearchText(s));
          if (s.length > 3) rawNames.add(s);
        });
      }
    });
  }

  return { ids, rawNames: Array.from(rawNames), normalizedNames };
};

export const matchesResolvedTeam = (
  identity: ResolvedTeamIdentity,
  candidateName?: string,
  candidateId?: string | number
): boolean => {
  if (candidateId != null && identity.ids.has(String(candidateId).trim())) {
    return true;
  }
  if (!candidateName) return false;
  if (identity.normalizedNames.has(normalizeSearchText(candidateName))) {
    return true;
  }
  return identity.rawNames.some((mapped) => isSameClubName(candidateName, mapped));
};