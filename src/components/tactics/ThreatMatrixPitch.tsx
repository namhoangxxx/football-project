import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Rect, Text as SvgText } from 'react-native-svg';
import { AppIcon } from '../common/AppIcon';
import { PitchBase } from './PitchBase';

interface ThreatMatrixPitchProps {
  teamName: string;
  grid: number[][];
  xtTotal: number;
}

export const ThreatMatrixPitch: React.FC<ThreatMatrixPitchProps> = ({ teamName, grid, xtTotal }) => {
  const cellW = 100 / 12;
  const cellH = 68 / 8;

  const getCellColor = (val: number) => {
    if (val >= 0.08) return 'rgba(255, 23, 68, 0.72)';
    if (val >= 0.05) return 'rgba(255, 145, 0, 0.58)';
    if (val >= 0.025) return 'rgba(255, 234, 0, 0.35)';
    return 'rgba(0, 230, 118, 0.12)';
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <AppIcon name="alert" size={15} color="#FF5252" />
          <Text style={styles.title} numberOfLines={1}>
            Ma trận Mối đe dọa (xT 12×8)
          </Text>
        </View>
        <View style={styles.xtBadge}>
          <Text style={styles.xtText}>Tổng xT: +{xtTotal.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.subRow}>
        <Text style={styles.subText} numberOfLines={1}>
          {teamName} • Giá trị kỳ vọng tịnh tiến bóng theo ô sân
        </Text>
        <Text style={styles.dirText}>Tấn công →</Text>
      </View>

      <View style={styles.pitchWrapper}>
        <PitchBase>
          {grid.map((rowArr, rIdx) =>
            rowArr.map((val, cIdx) => (
              <React.Fragment key={`${rIdx}-${cIdx}`}>
                <Rect
                  x={cIdx * cellW}
                  y={rIdx * cellH}
                  width={cellW}
                  height={cellH}
                  fill={getCellColor(val)}
                  stroke="rgba(255,255,255,0.16)"
                  strokeWidth="0.2"
                />
                {val >= 0.045 && (
                  <SvgText
                    x={cIdx * cellW + cellW / 2}
                    y={rIdx * cellH + cellH / 2 + 0.8}
                    fontSize="1.8"
                    fill="#FFFFFF"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {val.toFixed(2)}
                  </SvgText>
                )}
              </React.Fragment>
            ))
          )}
        </PitchBase>
      </View>

      <View style={styles.scaleRow}>
        <Text style={styles.scaleLabel}>Thấp</Text>
        <View style={styles.scaleSwatches}>
          <View style={[styles.swatch, { backgroundColor: 'rgba(0, 230, 118, 0.28)' }]} />
          <View style={[styles.swatch, { backgroundColor: 'rgba(255, 234, 0, 0.5)' }]} />
          <View style={[styles.swatch, { backgroundColor: 'rgba(255, 145, 0, 0.7)' }]} />
          <View style={[styles.swatch, { backgroundColor: 'rgba(255, 23, 68, 0.85)' }]} />
        </View>
        <Text style={styles.scaleLabel}>Nguy hiểm cao (≥0.08)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 14, marginBottom: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 8 },
  title: { color: '#FFFFFF', fontSize: 13.5, fontWeight: 'bold' },
  xtBadge: {
    backgroundColor: '#FF174422',
    borderWidth: 1,
    borderColor: '#FF5252',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  xtText: { color: '#FF5252', fontSize: 11, fontWeight: 'bold' },
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
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#282828',
  },
  scaleSwatches: { flexDirection: 'row', gap: 3 },
  swatch: { width: 18, height: 6, borderRadius: 2 },
  scaleLabel: { color: '#94A3B8', fontSize: 10 },
});