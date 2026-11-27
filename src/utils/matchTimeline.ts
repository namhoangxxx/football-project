import { Match } from '../types/football';

const LIVE_STATUSES = new Set(['IN_PLAY', 'LIVE', 'PAUSED', '1H', '2H', 'HT']);
const UPCOMING_STATUSES = new Set(['SCHEDULED', 'TIMED', 'NS']);
const FINISHED_STATUSES = new Set(['FINISHED', 'FT', 'AET', 'PEN']);

const parseDateValue = (raw: unknown): number => {
  if (raw == null) return 0;
  if (typeof raw === 'number') {
    return raw < 1e12 ? raw * 1000 : raw;
  }
  const str = String(raw).trim();
  if (!str) return 0;

  const isoCandidate = str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str;
  const parsed = Date.parse(isoCandidate);
  if (!Number.isNaN(parsed)) return parsed;

  const vnMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[T\s](\d{1,2}):(\d{2}))?/);
  if (vnMatch) {
    const [, d, m, y, hh = '0', mm = '0'] = vnMatch;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm)).getTime();
  }

  return 0;
};

export const getMatchTimestamp = (m: Match): number => {
  const obj = m as unknown as Record<string, unknown>;
  const candidates = [
    obj.utc_date,
    obj.utcDate,
    obj.match_date,
    obj.matchDate,
    obj.date,
    obj.kickoff,
    obj.kickoff_time,
    obj.start_time,
    obj.datetime,
    obj.timestamp,
  ];

  for (const val of candidates) {
    const ts = parseDateValue(val);
    if (ts > 0) return ts;
  }

  for (const [key, val] of Object.entries(obj)) {
    const k = key.toLowerCase();
    if ((k.includes('date') || k.includes('time')) && !k.includes('created') && !k.includes('updated')) {
      const ts = parseDateValue(val);
      if (ts > 0) return ts;
    }
  }

  return 0;
};

const getChronologicalRank = (status?: string): number => {
  const s = (status || '').toUpperCase();
  if (FINISHED_STATUSES.has(s)) return 0; // Đã đá nằm phía trên
  if (LIVE_STATUSES.has(s)) return 1;     // Đang đá ở giữa
  if (UPCOMING_STATUSES.has(s)) return 2; // Sắp đá nằm phía dưới
  return 3;
};

export interface ClubTimelineResult {
  sortedMatches: Match[];
  anchorIndex: number;
  anchorLabel: string;
}

export const buildClubTimeline = (matches: Match[]): ClubTimelineResult => {
  const sortedMatches = [...matches].sort((a, b) => {
    const rankA = getChronologicalRank(a.status);
    const rankB = getChronologicalRank(b.status);
    if (rankA !== rankB) return rankA - rankB;
    return getMatchTimestamp(a) - getMatchTimestamp(b);
  });

  if (sortedMatches.length === 0) {
    return { sortedMatches, anchorIndex: 0, anchorLabel: '' };
  }

  const liveIdx = sortedMatches.findIndex((m) =>
    LIVE_STATUSES.has((m.status || '').toUpperCase())
  );
  if (liveIdx !== -1) {
    return { sortedMatches, anchorIndex: liveIdx, anchorLabel: 'ĐANG DIỄN RA' };
  }

  const upcomingIdx = sortedMatches.findIndex((m) =>
    UPCOMING_STATUSES.has((m.status || '').toUpperCase())
  );
  if (upcomingIdx !== -1) {
    return { sortedMatches, anchorIndex: upcomingIdx, anchorLabel: 'TRẬN TIẾP THEO' };
  }

  let lastFinishedIdx = sortedMatches.length - 1;
  for (let i = sortedMatches.length - 1; i >= 0; i--) {
    if (FINISHED_STATUSES.has((sortedMatches[i].status || '').toUpperCase())) {
      lastFinishedIdx = i;
      break;
    }
  }

  return { sortedMatches, anchorIndex: lastFinishedIdx, anchorLabel: 'TRẬN GẦN NHẤT' };
};