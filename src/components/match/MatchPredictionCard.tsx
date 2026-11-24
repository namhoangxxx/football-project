import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fetchExpandedPredictionData, TeamXgMap } from '../../services/predictionDataLoader';
import { predictMatchOutcome } from '../../services/predictionEngine';
import { Match } from '../../types/football';

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

      <View style={styles.probLabelsRow}>
        <Text style={styles.probLabelHome} numberOfLines={1}>
          {resolvedHome} ({prediction.homeWinProb}%)
        </Text>
        <Text style={styles.probLabelDraw}>Hòa ({prediction.drawProb}%)</Text>
        <Text style={styles.probLabelAway} numberOfLines={1}>
          ({prediction.awayWinProb}%) {resolvedAway}
        </Text>
      </View>

      <View style={styles.barContainer}>
        <View style={[styles.barSegment, { flex: Math.max(prediction.homeWinProb, 6), backgroundColor: '#10B981' }]} />
        <View style={[styles.barSegment, { flex: Math.max(prediction.drawProb, 6), backgroundColor: '#F59E0B' }]} />
        <View style={[styles.barSegment, { flex: Math.max(prediction.awayWinProb, 6), backgroundColor: '#3B82F6' }]} />
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricTitle}>Chỉ số Elo</Text>
          <Text style={styles.metricValue}>
            {prediction.homeElo} <Text style={styles.metricDivider}>vs</Text> {prediction.awayElo}
          </Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricTitle}>Kỳ vọng bàn thắng (xG)</Text>
          <Text style={styles.metricValue}>
            {prediction.homeExpectedGoals.toFixed(2)}{' '}
            <Text style={styles.metricDivider}>-</Text>{' '}
            {prediction.awayExpectedGoals.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.subStatsRow}>
        <View style={styles.subStatItem}>
          <Text style={styles.subStatLabel}>Tỷ số dễ xảy ra</Text>
          <Text style={styles.subStatValue}>{prediction.mostLikelyScore}</Text>
        </View>
        <View style={styles.subStatDivider} />
        <View style={styles.subStatItem}>
          <Text style={styles.subStatLabel}>Tài 2.5 bàn</Text>
          <Text style={styles.subStatValue}>{prediction.over25Prob}%</Text>
        </View>
        <View style={styles.subStatDivider} />
        <View style={styles.subStatItem}>
          <Text style={styles.subStatLabel}>2 đội ghi bàn</Text>
          <Text style={styles.subStatValue}>{prediction.bttsProb}%</Text>
        </View>
      </View>

      {prediction.topScores.length > 0 && (
        <View style={styles.topScoresRow}>
          <Text style={styles.topScoresTitle}>Kịch bản tỷ số:</Text>
          <View style={styles.topScoresChips}>
            {prediction.topScores.map((item) => (
              <View key={item.score} style={styles.scoreChip}>
                <Text style={styles.scoreChipText}>
                  {item.score} ({item.probability}%)
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {prediction.insights.length > 0 && (
        <View style={styles.insightsBox}>
          {prediction.insights.map((line, idx) => (
            <Text key={idx} style={styles.insightLine}>
              - {line}
            </Text>
          ))}
        </View>
      )}
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
  probLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  probLabelHome: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  probLabelDraw: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  probLabelAway: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  barContainer: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
    gap: 2,
    marginBottom: 12,
  },
  barSegment: {
    height: '100%',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  metricTitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 3,
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  metricDivider: {
    color: '#64748B',
    fontWeight: '500',
  },
  subStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  subStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  subStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#1E293B',
  },
  subStatLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 2,
  },
  subStatValue: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  topScoresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  topScoresTitle: {
    color: '#94A3B8',
    fontSize: 12,
  },
  topScoresChips: {
    flexDirection: 'row',
    gap: 6,
  },
  scoreChip: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scoreChipText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  insightsBox: {
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    paddingTop: 8,
    gap: 4,
  },
  insightLine: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 17,
  },
});