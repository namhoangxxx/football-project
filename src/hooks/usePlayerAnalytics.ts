import { useEffect, useMemo, useState } from 'react';
import { buildPlayerAnalyticsProfile } from '../services/playerAnalyticsEngine';
import { fetchPlayerProfileSummary, PlayerProfileSummary } from '../services/playerService';
import { Match } from '../types/football';
import { normalizePositionCode } from '../utils/playerPosition';

export function usePlayerAnalytics(params: {
  playerName: string;
  teamName: string;
  number?: number;
  pos?: string;
  allMatches: Match[];
}) {
  const { playerName, teamName, number = 0, pos = 'CM', allMatches } = params;
  const [summary, setSummary] = useState<PlayerProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchPlayerProfileSummary(
      playerName,
      teamName,
      allMatches,
      number,
      normalizePositionCode(pos)
    )
      .then((res) => {
        if (isMounted) {
          setSummary(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [playerName, teamName, number, pos, allMatches]);

  const profile = useMemo(() => {
    const totalApps = summary ? summary.starts + summary.subAppearances : undefined;
    const estMinutes = summary
      ? summary.starts * 82 + summary.subAppearances * 24
      : undefined;

    return buildPlayerAnalyticsProfile(
      {
        name: playerName,
        teamName,
        number: summary?.number || number,
        pos: summary?.pos || pos,
        rawStats: summary
          ? {
              appearances: totalApps && totalApps > 0 ? totalApps : undefined,
              minutes: estMinutes && estMinutes > 0 ? estMinutes : undefined,
              goals: summary.goals,
              assists: summary.assists,
              yellow_cards: summary.yellowCards,
              red_cards: summary.redCards,
            }
          : undefined,
      },
      allMatches
    );
  }, [summary, playerName, teamName, number, pos, allMatches]);

  return { profile, summary, loading };
}