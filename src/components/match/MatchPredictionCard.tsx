import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fetchExpandedPredictionData, TeamXgMap } from '../../services/predictionDataLoader';
import { predictMatchOutcome } from '../../services/predictionEngine';
import { Match } from '../../types/football';
import { MarketBarsChart } from '../prediction/MarketBarsChart';
import { ScorelineHeatmap } from '../prediction/ScorelineHeatmap';
import { WinProbDonutChart } from '../prediction/WinProbDonutChart';

export interface MatchPredictionCardProps {
  match?: Match;
  homeTeam?: string;
  awayTeam?: string;
  leagueCode?: string;
  allMatches?: Match[];
}

export const MatchPredictionCard: React.FC<MatchPredictionCardProps> = ({
  match,
  homeTeam,
  awayTeam,
  allMatches = [],
}) => {
  const resolvedHome = match?.home_team || homeTeam || 'Đội nhà';
  const resolvedAway = match?.away_team || awayTeam || 'Đội khách';

  const [xgMap, setXgMap] = useState<TeamXgMap>({});
  const [expandedMatches, setExpandedMatches] = useState<Match[]>(allMatches);

  useEffect(() => {
    setExpandedMatches(allMatches);
  }, [allMatches]);

  useEffect(() => {
    let active = true;
    setXgMap({});

    fetchExpandedPredictionData(
      resolvedHome,
      resolvedAway,
      allMatches,
      match?.home_team_id || 0,
      match?.away_team_id || 0
    )
      .then((data) => {
        if (!active) return;
        if (data.matches && data.matches.length > 0) {
          setExpandedMatches(data.matches);
        }
        setXgMap(data.xgMap && Object.keys(data.xgMap).length > 0 ? data.xgMap : {});
      })
      .catch(() => {
        if (active) setXgMap({});
      });

    return () => {
      active = false;
    };
  }, [resolvedHome, resolvedAway, allMatches, match?.home_team_id, match?.away_team_id]);

  const prediction = useMemo(
    () => predictMatchOutcome(resolvedHome, resolvedAway, expandedMatches, xgMap),
    [resolvedHome, resolvedAway, expandedMatches, xgMap]
  );

  const confidenceColor =
    prediction.confidence === 'Cao'
      ? '#10B981'
      : prediction.confidence === 'Trung bình'
      ? '#F59E0B'
      : '#94A3B8';

  const subtitleText = prediction.usedRealXg
    ? `xG thực tế + Elo động (${prediction.sampleMatchesUsed} trận)`
    : prediction.usedStatsXg
    ? `Thống kê cú sút/xG + Elo động (${prediction.sampleMatchesUsed} trận)`
    : `Mô hình Poisson + Elo động (${prediction.sampleMatchesUsed} trận)`;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Dự đoán Xác suất & AI</Text>
          <Text style={styles.subtitle}>{subtitleText}</Text>
        </View>
        <View style={[styles.badge, { borderColor: confidenceColor }]}>
          <Text style={[styles.badgeText, { color: confidenceColor }]}>
            Tin cậy: {prediction.confidence} ({prediction.confidenceScore}%)
          </Text>
        </View>
      </View>

      <WinProbDonutChart
        homeTeam={resolvedHome}
        awayTeam={resolvedAway}
        homeWinProb={prediction.homeWinProb}
        drawProb={prediction.drawProb}
        awayWinProb={prediction.awayWinProb}
        homeXg={prediction.homeExpectedGoals}
        awayXg={prediction.awayExpectedGoals}
      />

      <MarketBarsChart
        homeTeam={resolvedHome}
        awayTeam={resolvedAway}
        homeElo={prediction.homeElo}
        awayElo={prediction.awayElo}
        over25Prob={prediction.over25Prob}
        bttsProb={prediction.bttsProb}
      />

      <ScorelineHeatmap
        homeTeam={resolvedHome}
        awayTeam={resolvedAway}
        homeXg={prediction.homeExpectedGoals}
        awayXg={prediction.awayExpectedGoals}
        mostLikelyScore={prediction.mostLikelyScore}
        topScores={prediction.topScores}
        insights={prediction.insights}
      />
    </View>
  );
};

export default MatchPredictionCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#0F172A',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});