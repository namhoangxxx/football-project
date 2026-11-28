import { SUPABASE_HEADERS, SUPABASE_URL } from '../config/supabase';
import { MatchEventItem, MatchStats, TeamLineup } from '../types/matchDetail';
import { MatchTeamIdentities, TeamIdentity } from '../types/tactical';

export const normalizePossession = (
  homeRaw?: number | string | null,
  awayRaw?: number | string | null
): { home: number; away: number } => {
  const parseNum = (val?: number | string | null): number => {
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
    if (typeof val === 'string') {
      const n = parseFloat(val.replace('%', '').trim());
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const h = parseNum(homeRaw);
  const a = parseNum(awayRaw);
  const total = h + a;

  if (total <= 0) return { home: 50, away: 50 };

  const home = Math.min(100, Math.max(0, Math.round((h / total) * 100)));
  return {
    home,
    away: 100 - home,
  };
};

export const getMatchTeamIdentities = async (
  homeTeamId: number,
  awayTeamId: number,
  fallbackHomeName: string,
  fallbackAwayName: string
): Promise<MatchTeamIdentities> => {
  const defaultResult: MatchTeamIdentities = {
    home: { footballDataId: homeTeamId, teamName: fallbackHomeName },
    away: { footballDataId: awayTeamId, teamName: fallbackAwayName },
  };

  try {
    const ids = [homeTeamId, awayTeamId].filter((id) => Boolean(id));
    if (ids.length === 0) return defaultResult;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/team_map?football_data_id=in.(${ids.join(',')})&select=football_data_id,team_name,espn_id,espn_name,api_football_id`,
      { method: 'GET', headers: SUPABASE_HEADERS }
    );

    if (!res.ok) return defaultResult;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return defaultResult;

    const mapRow = (row: any, fallbackId: number, fallbackName: string): TeamIdentity => {
      if (!row) return { footballDataId: fallbackId, teamName: fallbackName };
      return {
        footballDataId: row.football_data_id ?? fallbackId,
        espnId: row.espn_id != null ? Number(row.espn_id) : undefined,
        apiFootballId: row.api_football_id != null ? Number(row.api_football_id) : undefined,
        teamName: row.team_name || fallbackName,
        espnName: row.espn_name || undefined,
      };
    };

    const homeRow = rows.find((r: any) => Number(r.football_data_id) === Number(homeTeamId));
    const awayRow = rows.find((r: any) => Number(r.football_data_id) === Number(awayTeamId));

    return {
      home: mapRow(homeRow, homeTeamId, fallbackHomeName),
      away: mapRow(awayRow, awayTeamId, fallbackAwayName),
    };
  } catch (error) {
    console.error('Lỗi getMatchTeamIdentities:', error);
    return defaultResult;
  }
};

export const getMatchStats = async (
  eventId: string | number
): Promise<MatchStats | null> => {
  try {
    const cleanEventId = String(eventId).trim();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/match_details?event_id=eq.${encodeURIComponent(cleanEventId)}&select=*`,
      { method: 'GET', headers: SUPABASE_HEADERS }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const raw = { ...data[0] };
        const rawHomePos =
          raw.home_possession ?? raw.possession_home ?? raw.homePossession;
        const rawAwayPos =
          raw.away_possession ?? raw.possession_away ?? raw.awayPossession;

        if (rawHomePos != null || rawAwayPos != null) {
          const { home, away } = normalizePossession(rawHomePos, rawAwayPos);
          if ('home_possession' in raw || 'away_possession' in raw) {
            raw.home_possession = home;
            raw.away_possession = away;
          }
          if ('possession_home' in raw || 'possession_away' in raw) {
            raw.possession_home = home;
            raw.possession_away = away;
          }
          if ('homePossession' in raw || 'awayPossession' in raw) {
            raw.homePossession = home;
            raw.awayPossession = away;
          }
        }

        return raw as MatchStats;
      }
    }
    return null;
  } catch (error) {
    console.error('Lỗi getMatchStats:', error);
    return null;
  }
};

export const getMatchEventsFromSupabase = async (
  eventId: string | number
): Promise<MatchEventItem[]> => {
  try {
    const cleanEventId = String(eventId).trim();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/match_events?event_id=eq.${encodeURIComponent(cleanEventId)}&select=events`,
      { method: 'GET', headers: SUPABASE_HEADERS }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0 && Array.isArray(data[0].events)) {
        return data[0].events;
      }
    }
    return [];
  } catch (error) {
    console.error('Lỗi getMatchEventsFromSupabase:', error);
    return [];
  }
};

export const getMatchLineupsFromSupabase = async (
  eventId: string | number
): Promise<TeamLineup[]> => {
  try {
    const cleanEventId = String(eventId).trim();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/match_lineups?event_id=eq.${encodeURIComponent(cleanEventId)}&select=lineups`,
      { method: 'GET', headers: SUPABASE_HEADERS }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0 && Array.isArray(data[0].lineups)) {
        return data[0].lineups;
      }
    }
    return [];
  } catch (error) {
    console.error('Lỗi getMatchLineupsFromSupabase:', error);
    return [];
  }
};