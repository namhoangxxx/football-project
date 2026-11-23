import { MatchTeamIdentities, TeamIdentity, TeamSide } from '../../types/tactical';

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
  String(s || '')
    .toLowerCase()
    .replace(/\b(fc|cf|afc|sc|ac|as|ss|ssc|rb|vfb|vfl|1\.)\b/g, '')
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

  const targetName = normalizeStr(eventTeam.name);
  if (!targetName) return false;

  const candidates = [identity.espnName, identity.teamName]
    .map(normalizeStr)
    .filter((c) => c.length > 0);

  return candidates.some(
    (c) => c === targetName || c.includes(targetName) || targetName.includes(c)
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
  const clean = (formation || '4-3-3').replace(/[^0-9-]/g, '');
  const lines = clean
    .split('-')
    .map((n) => parseInt(n, 10))
    .filter((n) => !isNaN(n) && n > 0);

  const validLines = lines.length >= 2 ? lines : [4, 3, 3];
  const coords: Array<{ x: number; y: number }> = [{ x: 8, y: 34 }];

  const startX = 24;
  const endX = 82;
  const stepX =
    validLines.length > 1 ? (endX - startX) / (validLines.length - 1) : 25;

  validLines.forEach((count, lineIdx) => {
    const x = startX + lineIdx * stepX;
    for (let i = 0; i < count; i++) {
      const y = ((i + 1) / (count + 1)) * 68;
      coords.push({ x, y });
    }
  });

  while (coords.length < 11) {
    coords.push({ x: 50, y: 34 });
  }
  return coords.slice(0, 11);
};