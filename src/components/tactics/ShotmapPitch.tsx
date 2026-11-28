import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Circle } from 'react-native-svg';
import { ShotPoint } from '../../types/tactical';
import { AppIcon } from '../common/AppIcon';
import { PitchBase } from './PitchBase';

interface ShotmapPitchProps {
  teamName: string;
  shots: ShotPoint[];
  xgTotal: number;
}

const OUTCOME_Z_ORDER: Record<ShotPoint['outcome'], number> = {
  OFF_TARGET: 0,
  SAVED: 1,
  GOAL: 2,
};

export const ShotmapPitch: React.FC<ShotmapPitchProps> = ({ teamName, shots, xgTotal }) => {
  const goalsCount = shots.filter((s) => s.outcome === 'GOAL').length;
  const savedCount = shots.filter((s) => s.outcome === 'SAVED').length;

  // Vẽ cú sút ra ngoài ở lớp dưới, bàn thắng luôn nổi ở lớp trên cùng
  const orderedShots = useMemo(
    () => [...shots].sort((a, b) => OUTCOME_Z_ORDER[a.outcome] - OUTCOME_Z_ORDER[b.outcome]),
    [shots]
  );

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <AppIcon name="target" size={15} color="#00E676" />
          <Text style={styles.title} numberOfLines={1}>
            Bản đồ Sút bóng & xG
          </Text>
        </View>
        <View style={styles.xgBadge}>
          <Text style={styles.xgBadgeText}>Tổng xG: {xgTotal.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.subRow}>
        <Text style={styles.subText} numberOfLines={1}>
          {teamName} • {shots.length} cú sút ({goalsCount} bàn, {savedCount} trúng đích)
        </Text>
        <Text style={styles.dirText}>Tấn công →</Text>
      </View>

      <View style={styles.pitchWrapper}>
        <PitchBase>
          {orderedShots.map((shot) => {
            const radius = Math.max(1.4, Math.min(4.0, 1.3 + shot.xg * 3.8));
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
                stroke={shot.outcome === 'GOAL' ? '#FFFFFF' : 'rgba(0,0,0,0.55)'}
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
          <Text style={styles.legendText}>Trúng đích</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: 'rgba(255,255,255,0.4)' }]} />
          <Text style={styles.legendText}>Ra ngoài</Text>
        </View>
        <Text style={styles.scaleNote}>Cỡ vòng = xG</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 14, marginBottom: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 8 },
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
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  subText: { color: '#AAAAAA', fontSize: 11, flex: 1 },
  dirText: { color: '#64748B', fontSize: 10, fontWeight: '700' },
  pitchWrapper: { alignItems: 'center' },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#282828',
    flexWrap: 'wrap',
    gap: 6,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  legendText: { color: '#BBBBBB', fontSize: 10 },
  scaleNote: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
});