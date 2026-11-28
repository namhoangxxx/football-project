import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

interface WinProbDonutChartProps {
  homeTeam: string;
  awayTeam: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  homeXg: number;
  awayXg: number;
}

export const WinProbDonutChart: React.FC<WinProbDonutChartProps> = ({
  homeTeam,
  awayTeam,
  homeWinProb,
  drawProb,
  awayWinProb,
  homeXg,
  awayXg,
}) => {
  const size = 148;
  const strokeWidth = 15;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const total = Math.max(1, homeWinProb + drawProb + awayWinProb);
  const homeLen = (homeWinProb / total) * circumference;
  const drawLen = (drawProb / total) * circumference;
  const awayLen = (awayWinProb / total) * circumference;

  const segments = [
    { key: 'home', label: homeTeam, prob: homeWinProb, len: homeLen, offset: 0, color: '#10B981' },
    { key: 'draw', label: 'Hòa', prob: drawProb, len: drawLen, offset: -homeLen, color: '#F59E0B' },
    { key: 'away', label: awayTeam, prob: awayWinProb, len: awayLen, offset: -(homeLen + drawLen), color: '#3B82F6' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.ringWrapper}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            <Circle cx={center} cy={center} r={radius} stroke="#1E293B" strokeWidth={strokeWidth} fill="transparent" />
            {segments.map((seg) =>
              seg.len > 0 ? (
                <Circle
                  key={seg.key}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${Math.max(0, seg.len - 2)} ${circumference}`}
                  strokeDashoffset={seg.offset}
                  fill="transparent"
                />
              ) : null
            )}
          </G>
        </Svg>
        <View style={styles.centerBox}>
          <Text style={styles.centerLabel}>xG Kỳ vọng</Text>
          <Text style={styles.centerValue}>
            {homeXg.toFixed(2)} - {awayXg.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.legendRow}>
        {segments.map((seg) => (
          <View key={seg.key} style={styles.legendCard}>
            <View style={styles.legendHeader}>
              <View style={[styles.dot, { backgroundColor: seg.color }]} />
              <Text style={styles.legendName} numberOfLines={1}>
                {seg.label}
              </Text>
            </View>
            <Text style={[styles.legendPct, { color: seg.color }]}>{seg.prob}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 12 },
  ringWrapper: { width: 148, height: 148, justifyContent: 'center', alignItems: 'center' },
  centerBox: { position: 'absolute', alignItems: 'center' },
  centerLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  centerValue: { color: '#F8FAFC', fontSize: 15, fontWeight: '800', marginTop: 2 },
  legendRow: { flexDirection: 'row', gap: 8, marginTop: 12, width: '100%' },
  legendCard: { flex: 1, backgroundColor: '#0F172A', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
  legendHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  legendName: { color: '#CBD5E1', fontSize: 11, fontWeight: '600', maxWidth: 72 },
  legendPct: { fontSize: 14, fontWeight: '800' },
});