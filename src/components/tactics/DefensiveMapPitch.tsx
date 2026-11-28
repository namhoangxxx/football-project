import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Circle, Rect } from 'react-native-svg';
import { DefensiveAction } from '../../types/tactical';
import { AppIcon } from '../common/AppIcon';
import { PitchBase } from './PitchBase';

interface DefensiveMapPitchProps {
  teamName: string;
  actions: DefensiveAction[];
  ppda: number;
  pressingStyle: string;
}

export const DefensiveMapPitch: React.FC<DefensiveMapPitchProps> = ({
  teamName,
  actions,
  ppda,
  pressingStyle,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <AppIcon name="shield" size={15} color="#38BDF8" />
          <Text style={styles.title} numberOfLines={1}>
            Tranh chấp & Pressing (PPDA)
          </Text>
        </View>
        <View style={styles.ppdaBadge}>
          <Text style={styles.ppdaText}>PPDA: {ppda}</Text>
        </View>
      </View>

      <View style={styles.subRow}>
        <Text style={styles.subText} numberOfLines={1}>
          {teamName} • <Text style={styles.highlight}>{pressingStyle}</Text>
        </Text>
        <Text style={styles.dirText}>Tấn công →</Text>
      </View>

      <View style={styles.pitchWrapper}>
        <PitchBase>
          {actions.map((act, idx) => {
            if (act.type === 'TURNOVER') {
              return (
                <Rect
                  key={idx}
                  x={act.x - 1.2}
                  y={act.y - 1.2}
                  width="2.4"
                  height="2.4"
                  fill="#FF5252"
                  opacity={0.85}
                />
              );
            }
            const color =
              act.type === 'TACKLE'
                ? '#00E676'
                : act.type === 'INTERCEPTION'
                ? '#38BDF8'
                : '#FFD600';
            return <Circle key={idx} cx={act.x} cy={act.y} r="1.4" fill={color} opacity={0.9} />;
          })}
        </PitchBase>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#00E676' }]} />
          <Text style={styles.legendText}>Tackle</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#38BDF8' }]} />
          <Text style={styles.legendText}>Cắt bóng</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#FFD600' }]} />
          <Text style={styles.legendText}>Thu hồi</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.square, { backgroundColor: '#FF5252' }]} />
          <Text style={styles.legendText}>Mất bóng</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 14, marginBottom: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 8 },
  title: { color: '#FFFFFF', fontSize: 13.5, fontWeight: 'bold' },
  ppdaBadge: {
    backgroundColor: '#38BDF822',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ppdaText: { color: '#38BDF8', fontSize: 11, fontWeight: 'bold' },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  subText: { color: '#AAAAAA', fontSize: 11, flex: 1 },
  dirText: { color: '#64748B', fontSize: 10, fontWeight: '700' },
  highlight: { color: '#FFFFFF', fontWeight: 'bold' },
  pitchWrapper: { alignItems: 'center' },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#282828',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  square: { width: 8, height: 8, marginRight: 4 },
  legendText: { color: '#BBBBBB', fontSize: 10 },
});