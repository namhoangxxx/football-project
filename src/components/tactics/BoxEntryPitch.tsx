import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Circle, Line, Text as SvgText } from 'react-native-svg';
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

  // Vẽ pha bóng không thành công trước để pha thành công nổi lên trên
  const orderedEntries = useMemo(
    () => [...entries].sort((a, b) => Number(a.successful) - Number(b.successful)),
    [entries]
  );

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <AppIcon name="tactics" size={15} color="#00E676" />
          <Text style={styles.title} numberOfLines={1}>
            Tạt bóng & Xâm nhập Vòng cấm
          </Text>
        </View>
        <Text style={styles.countText}>{entries.length} pha</Text>
      </View>

      <View style={styles.subRow}>
        <Text style={styles.subText} numberOfLines={1}>
          {teamName} • Tạt cánh: {crosses} | Trung lộ / Chọc khe: {centralEntries}
        </Text>
        <Text style={styles.dirText}>Tấn công →</Text>
      </View>

      <View style={styles.pitchWrapper}>
        <PitchBase>
          {orderedEntries.length === 0 ? (
            <SvgText
              x="50"
              y="35"
              fontSize="2.8"
              fill="rgba(255,255,255,0.65)"
              textAnchor="middle"
            >
              Chưa có dữ liệu xâm nhập vòng cấm
            </SvgText>
          ) : (
            orderedEntries.map((entry, idx) => {
              const color =
                entry.type === 'CROSS'
                  ? '#38BDF8'
                  : entry.type === 'THROUGH_BALL'
                  ? '#00E676'
                  : '#F59E0B';
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
            })
          )}
        </PitchBase>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#38BDF8' }]} />
          <Text style={styles.legendText}>Tạt bóng</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#00E676' }]} />
          <Text style={styles.legendText}>Chọc khe</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>Dẫn bóng</Text>
        </View>
      </View>
      <Text style={styles.lineStyleNote}>Nét liền: Thành công • Nét đứt: Bị cản phá</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 14, marginBottom: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 8 },
  title: { color: '#FFFFFF', fontSize: 13.5, fontWeight: 'bold' },
  countText: { color: '#38BDF8', fontSize: 12, fontWeight: 'bold' },
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
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#282828',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  legendText: { color: '#BBBBBB', fontSize: 10 },
  lineStyleNote: { color: '#64748B', fontSize: 9.5, textAlign: 'center', marginTop: 4 },
});