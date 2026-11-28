import { MatchTeamIdentities, TeamIdentity, TeamSide } from '../../types/tactical';
import { isSameClubName, normalizeSearchText } from '../textNormalize';

export const createSeededRandom = (seedStr: string) => {
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += 0x6d2b79f5;
    let t = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const clamp = (val: number, min: number, max: number) =>
  Math.max(min, Math.min(max, val));

export const normalizeStr = (s?: string) =>
  normalizeSearchText(s || '')
    .replace(/\bmunchen\b/g, 'munich')
    .replace(/\bkoeln\b/g, 'koln')
    .replace(/\b(fc|cf|afc|sc|ac|as|ss|ssc|rb|vfb|vfl|1)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

export const matchesTeamIdentity = (
  eventTeam: { id?: number | string; name?: string } | undefined,
  identity: TeamIdentity
): boolean => {
  if (!eventTeam) return false;

  if (eventTeam.id != null) {
    const rawId = Number(eventTeam.id);
    if (!isNaN(rawId) && rawId > 0) {
      if (identity.espnId && rawId === identity.espnId) return true;
      if (identity.footballDataId && rawId === identity.footballDataId) return true;
      if (identity.apiFootballId && rawId === identity.apiFootballId) return true;
    }
  }

  const rawName = String(eventTeam.name || '').trim();
  if (!rawName) return false;

  const rawCandidates = [identity.espnName, identity.teamName].filter(
    (c): c is string => Boolean(c && c.trim().length > 0)
  );

  if (rawCandidates.some((c) => isSameClubName(rawName, c))) {
    return true;
  }

  const targetName = normalizeStr(rawName);
  if (!targetName) return false;

  const normalizedCandidates = rawCandidates
    .map(normalizeStr)
    .filter((c) => c.length > 0);

  return normalizedCandidates.some(
    (c) =>
      c === targetName ||
      (c.length >= 5 &&
        targetName.length >= 5 &&
        (c.includes(targetName) || targetName.includes(c)))
  );
};

export const resolveEventSide = (
  eventTeam: { id?: number | string; name?: string } | undefined,
  identities: MatchTeamIdentities
): TeamSide | null => {
  const isHome = matchesTeamIdentity(eventTeam, identities.home);
  const isAway = matchesTeamIdentity(eventTeam, identities.away);

  if (isHome && !isAway) return 'HOME';
  if (isAway && !isHome) return 'AWAY';
  return null;
};

export const getFormationCoordinates = (
  formation?: string
): Array<{ x: number; y: number }> => {
  const raw = (formation || '4-3-3').trim();
  const clean = raw.replace(/[^0-9-]/g, '');
  const rawParts = clean.includes('-')
    ? clean.split('-')
    : /^\d{3,5}$/.test(clean)
    ? clean.split('')
    : [];

  const lines = rawParts
    .map((n) => parseInt(n, 10))
    .filter((n) => !isNaN(n) && n > 0);

  const validLines =
    lines.length >= 2 && lines.reduce((sum, n) => sum + n, 0) === 10
      ? lines
      : [4, 3, 3];

  const coords: Array<{ x: number; y: number }> = [{ x: 8, y: 34 }];

  const startX = 24;
  const endX = 82;
  const stepX =
    validLines.length > 1 ? (endX - startX) / (validLines.length - 1) : 25;

  validLines.forEach((count, lineIdx) => {
    const baseX = startX + lineIdx * stepX;
    for (let i = 0; i < count; i++) {
      const isOuterFlank = count >= 4 && (i === 0 || i === count - 1);
      // Hậu vệ biên / tiền vệ biên dâng cao hơn trục trung lộ để tránh chồng đường chuyền
      const xOffset = lineIdx === 0 && isOuterFlank ? 3.5 : lineIdx === 0 && count >= 4 ? -1.2 : 0;
      const y = ((i + 1) / (count + 1)) * 68;
      coords.push({
        x: clamp(baseX + xOffset, 16, 88),
        y: clamp(y, 7, 61),
      });
    }
  });

  while (coords.length < 11) {
    coords.push({ x: 50, y: 34 });
  }
  return coords.slice(0, 11);
};