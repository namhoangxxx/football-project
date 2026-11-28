import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { buildScoreMatrix } from './poissonMatrix';

interface ScoreChipItem {
  score: string;
  probability: number;
}

interface ScorelineHeatmapProps {
  homeTeam: string;
  awayTeam: string;
  homeXg: number;
  awayXg: number;
  mostLikelyScore: string;
  topScores: ScoreChipItem[];
  insights: string[];
}

const GOALS = [0, 1, 2, 3, 4];

export const ScorelineHeatmap: React.FC<ScorelineHeatmapProps> = ({
  homeTeam,
  awayTeam,
  homeXg,
  awayXg,
  mostLikelyScore,
  topScores,
  insights,
}) => {
  const { matrix, maxProb } = useMemo(() => buildScoreMatrix(homeXg, awayXg), [homeXg, awayXg]);
  const normalizedBest = mostLikelyScore.replace(/\s+/g, '');

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Ma trận tỷ số (%)</Text>
        <Text style={styles.hintText} numberOfLines={1}>
          Hàng: {homeTeam} | Cột: {awayTeam}
        </Text>
      </View>

      <View style={styles.gridRow}>
        <View style={styles.cornerCell}>
          <Text style={styles.axisText}>H \ A</Text>
        </View>
        {GOALS.map((a) => (
          <View key={`c-${a}`} style={styles.axisCell}>
            <Text style={styles.axisText}>{a}</Text>
          </View>
        ))}
      </View>

      {GOALS.map((h) => (
        <View key={`r-${h}`} style={styles.gridRow}>
          <View style={styles.axisCell}>
            <Text style={styles.axisText}>{h}</Text>
          </View>
          {GOALS.map((a) => {
            const val = matrix[h]?.[a] ?? 0;
            const intensity = maxProb > 0 ? val / maxProb : 0;
            const isBest = `${h}-${a}` === normalizedBest;

            return (
              <View
                key={`${h}-${a}`}
                style={[
                  styles.cell,
                  { backgroundColor: `rgba(16, 185, 129, ${Math.max(0.08, intensity * 0.85)})` },
                  isBest && styles.bestCell,
                ]}>
                <Text style={[styles.cellText, intensity > 0.55 && styles.cellTextBold]}>{val}%</Text>
              </View>
            );
          })}
        </View>
      ))}

      {topScores.length > 0 && (
        <View style={styles.chipsRow}>
          {topScores.map((item, index) => (
            <View key={item.score} style={[styles.chip, index === 0 && styles.chipPrimary]}>
              <Text style={styles.chipText}>
                {item.score} ({item.probability}%)
              </Text>
            </View>
          ))}
        </View>
      )}

      {insights.length > 0 && (
        <View style={styles.insightsBox}>
          {insights.map((line, idx) => (
            <Text key={idx} style={styles.insightLine}>
              • {line}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { borderTopWidth: 1, borderTopColor: '#1F2937', paddingTop: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: '700' },
  hintText: { color: '#64748B', fontSize: 10, maxWidth: '52%' },
  gridRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  cornerCell: { width: 32, height: 26, justifyContent: 'center', alignItems: 'center' },
  axisCell: { flex: 1, height: 26, backgroundColor: '#0F172A', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  axisText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  cell: { flex: 1, height: 32, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  bestCell: { borderWidth: 1.5, borderColor: '#FBBF24' },
  cellText: { color: '#CBD5E1', fontSize: 10, fontWeight: '600' },
  cellTextBold: { color: '#FFFFFF', fontWeight: '800' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { backgroundColor: '#1E293B', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  chipPrimary: { borderWidth: 1, borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  chipText: { color: '#E2E8F0', fontSize: 11, fontWeight: '600' },
  insightsBox: { borderTopWidth: 1, borderTopColor: '#1F2937', paddingTop: 8, marginTop: 10, gap: 4 },
  insightLine: { color: '#CBD5E1', fontSize: 12, lineHeight: 17 },
});