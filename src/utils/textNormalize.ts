export function normalizeSearchText(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/ı/g, 'i')
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesSearchTokens(fields: string[], rawQuery: string): boolean {
  const cleanQuery = normalizeSearchText(rawQuery);
  if (!cleanQuery) return true;
  const tokens = cleanQuery.split(' ');
  const haystack = normalizeSearchText(fields.join(' '));
  return tokens.every((tk) => haystack.includes(tk));
}

const CLUB_STRIP_REGEX = /\b(fc|cf|afc|ssc|bsc|sv|vfb|vfl|1\.|calcio|hotspur)\b/gi;

const CLUB_ALIASES: Record<string, string[]> = {
  'internazionale milano': ['internazionale', 'inter milan', 'inter'],
  'inter milan': ['internazionale', 'inter'],
  'bayern munchen': ['bayern munich', 'bayern'],
  'atletico de madrid': ['atletico madrid', 'atletico'],
  'paris saint germain': ['psg', 'paris sg'],
};

export function extractClubSearchTerm(teamName: string): string {
  const cleaned = (teamName || '')
    .replace(CLUB_STRIP_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || (teamName || '').trim();
}

export function getClubSearchVariants(teamName: string): string[] {
  const primary = extractClubSearchTerm(teamName);
  const norm = normalizeSearchText(primary);
  const variants = new Set<string>([primary]);

  if (CLUB_ALIASES[norm]) {
    CLUB_ALIASES[norm].forEach((alias) => variants.add(alias));
  }
  return Array.from(variants).filter(Boolean);
}

export function isSameClubName(teamA?: string, teamB?: string): boolean {
  const a = normalizeSearchText(extractClubSearchTerm(teamA || ''));
  const b = normalizeSearchText(extractClubSearchTerm(teamB || ''));
  if (!a || !b) return false;
  if (a === b) return true;

  const variantsA = new Set([a, ...(CLUB_ALIASES[a] || [])]);
  const variantsB = new Set([b, ...(CLUB_ALIASES[b] || [])]);
  for (const v of variantsA) {
    if (variantsB.has(v)) return true;
  }

  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length >= 7 && longer.includes(shorter)) return true;

  return false;
}

export function isSamePlayerName(nameA?: string, nameB?: string): boolean {
  const a = normalizeSearchText(nameA || '');
  const b = normalizeSearchText(nameB || '');
  if (!a || !b) return false;
  if (a === b) return true;

  if (a.length >= 6 && b.length >= 6 && (a.includes(b) || b.includes(a))) {
    return true;
  }

  const tokensA = a.split(' ');
  const tokensB = b.split(' ');
  if (tokensA.length >= 2 && tokensB.length >= 2) {
    const firstA = tokensA[0];
    const firstB = tokensB[0];
    const restA = tokensA.slice(1).join(' ');
    const restB = tokensB.slice(1).join(' ');

    if (
      restA.length >= 4 &&
      restA === restB &&
      firstA.charAt(0) === firstB.charAt(0) &&
      (firstA.length === 1 || firstB.length === 1)
    ) {
      return true;
    }
  }

  return false;
}

export function buildCanonicalPlayerId(teamName?: string, playerName?: string): string {
  const cleanTeam = normalizeSearchText(extractClubSearchTerm(teamName || ''));
  const cleanPlayer = normalizeSearchText(playerName || '');
  return `${cleanTeam}::${cleanPlayer}`;
}

export function isSamePlayer(
  a: { id?: string | number; name?: string; teamName?: string },
  b: { id?: string | number; name?: string; teamName?: string }
): boolean {
  if (a.id != null && b.id != null && String(a.id) === String(b.id)) {
    return true;
  }
  if (!isSamePlayerName(a.name, b.name)) return false;

  if (!a.teamName || !b.teamName) return true;
  return isSameClubName(a.teamName, b.teamName);
}