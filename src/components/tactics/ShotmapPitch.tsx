import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Circle } from 'react-native-svg';
import { ShotPoint } from '../../types/tactical';
import { PitchBase } from './PitchBase';

interface ShotmapPitchProps {
  teamName: string;
  shots: ShotPoint[];
  xgTotal: number;
}

export const ShotmapPitch: React.FC<ShotmapPitchProps> = ({
  teamName,
  shots,
  xgTotal,
}) => {
  const goalsCount = shots.filter((s) => s.outcome === 'GOAL').length;
  const savedCount = shots.filter((s) => s.outcome === 'SAVED').length;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>🎯 Bản đồ Sút bóng & xG</Text>
        <View style={styles.xgBadge}>
          <Text style={styles.xgBadgeText}>Tổng xG: {xgTotal.toFixed(2)}</Text>
        </View>
      </View>

      <Text style={styles.subText}>
        {teamName} • {shots.length} cú sút ({goalsCount} bàn thắng, {savedCount} trúng đích)
      </Text>

      <View style={styles.pitchWrapper}>
        <PitchBase>
          {shots.map((shot) => {
            // Bán kính tỷ lệ thuận với giá trị xG của cú sút
            const radius = Math.max(1.4, Math.min(4.2, 1.3 + shot.xg * 4.2));
            const fill =
              shot.outcome === 'GOAL'
                ? '#00E676'
                : shot.outcome === 'SAVED'
                ? '#FFD600'
                : 'rgba(255, 255, 255, 0.35)';

            return (
              <Circle
                key={shot.id}
                cx={shot.x}
                cy={shot.y}
                r={radius}
                fill={fill}
                stroke={shot.outcome === 'GOAL' ? '#FFFFFF' : 'rgba(0,0,0,0.5)'}
                strokeWidth={shot.outcome === 'GOAL' ? '0.6' : '0.3'}
              />
            );
          })}
        </PitchBase>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#00E676' }]} />
          <Text style={styles.legendText}>Bàn thắng</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#FFD600' }]} />
          <Text style={styles.legendText}>Cản phá / Trúng đích</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: 'rgba(255,255,255,0.4)' }]} />
          <Text style={styles.legendText}>Ra ngoài (Kích thước = xG)</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  xgBadge: {
    backgroundColor: '#00E67622',
    borderWidth: 1,
    borderColor: '#00E676',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  xgBadgeText: { color: '#00E676', fontSize: 11, fontWeight: 'bold' },
  subText: { color: '#AAAAAA', fontSize: 11, marginBottom: 10 },
  pitchWrapper: { alignItems: 'center' },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  legendText: { color: '#BBBBBB', fontSize: 10 },
});