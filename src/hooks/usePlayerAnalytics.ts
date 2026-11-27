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
  const officialPos = normalizePositionCode(pos);
  const [summary, setSummary] = useState<PlayerProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setSummary(null);
    setLoading(true);

    fetchPlayerProfileSummary(playerName, teamName, allMatches, number, officialPos)
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
  }, [playerName, teamName, number, officialPos, allMatches]);

  const profile = useMemo(() => {
    const totalApps = summary ? summary.starts + summary.subAppearances : 0;
    const estMinutes = summary
      ? summary.starts * 82 + summary.subAppearances * 24
      : 0;

    return buildPlayerAnalyticsProfile(
      {
        name: playerName,
        teamName,
        number: summary?.number || number,
        pos: officialPos,
        recentMatches: summary?.recentMatches,
        rawStats:
          summary && totalApps > 0
            ? {
                appearances: totalApps,
                minutes: estMinutes > 0 ? estMinutes : undefined,
                goals: summary.goals,
                assists: summary.assists,
                yellow_cards: summary.yellowCards,
                red_cards: summary.redCards,
              }
            : undefined,
      },
      allMatches
    );
  }, [summary, playerName, teamName, number, officialPos, allMatches]);

  return { profile, summary, loading };
}