import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Circle, Line } from 'react-native-svg';
import { BoxEntryArrow } from '../../types/tactical';
import { AppIcon } from '../common/AppIcon';
import { PitchBase } from './PitchBase';

interface BoxEntryPitchProps {
  teamName: string;
  entries: BoxEntryArrow[];
}

export const BoxEntryPitch: React.FC<BoxEntryPitchProps> = ({ teamName, entries }) => {
  const crosses = entries.filter((e) => e.type === 'CROSS').length;
  const centralEntries = entries.length - crosses;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <AppIcon name="tactics" size={15} color="#00E676" />
          <Text style={styles.title}>Tạt bóng & Xâm nhập Vòng cấm</Text>
        </View>
        <Text style={styles.countText}>{entries.length} pha bóng</Text>
      </View>

      <Text style={styles.subText}>
        {teamName} • Tạt cánh: {crosses} | Trung lộ / Chọc khe: {centralEntries}
      </Text>

      <View style={styles.pitchWrapper}>
        <PitchBase>
          {entries.map((entry, idx) => {
            const color =
              entry.type === 'CROSS' ? '#38BDF8' : entry.type === 'THROUGH_BALL' ? '#00E676' : '#F59E0B';
            return (
              <React.Fragment key={idx}>
                <Line
                  x1={entry.startX}
                  y1={entry.startY}
                  x2={entry.endX}
                  y2={entry.endY}
                  stroke={color}
                  strokeWidth="0.75"
                  strokeDasharray={entry.successful ? undefined : '1.5,1'}
                  opacity={entry.successful ? 0.95 : 0.55}
                />
                <Circle cx={entry.startX} cy={entry.startY} r="0.8" fill={color} />
                <Circle
                  cx={entry.endX}
                  cy={entry.endY}
                  r="1.3"
                  fill={entry.successful ? color : 'none'}
                  stroke={color}
                  strokeWidth="0.5"
                />
              </React.Fragment>
            );
          })}
        </PitchBase>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#38BDF8' }]} />
          <Text style={styles.legendText}>Tạt bóng (Cross)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#00E676' }]} />
          <Text style={styles.legendText}>Chọc khe</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>Dẫn bóng xâm nhập</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 14, marginBottom: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: '#FFFFFF', fontSize: 13.5, fontWeight: 'bold' },
  countText: { color: '#38BDF8', fontSize: 12, fontWeight: 'bold' },
  subText: { color: '#AAAAAA', fontSize: 11, marginBottom: 10 },
  pitchWrapper: { alignItems: 'center' },
  legendRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  legendText: { color: '#BBBBBB', fontSize: 10 },
});