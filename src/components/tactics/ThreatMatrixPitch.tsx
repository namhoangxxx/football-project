import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Rect, Text as SvgText } from 'react-native-svg';
import { PitchBase } from './PitchBase';

interface ThreatMatrixPitchProps {
  teamName: string;
  grid: number[][]; // 8 hàng x 12 cột
  xtTotal: number;
}

export const ThreatMatrixPitch: React.FC<ThreatMatrixPitchProps> = ({
  teamName,
  grid,
  xtTotal,
}) => {
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
        <Text style={styles.title}>🚨 Ma trận Mối đe dọa (xT Grid 12×8)</Text>
        <View style={styles.xtBadge}>
          <Text style={styles.xtText}>Tổng xT: +{xtTotal.toFixed(2)}</Text>
        </View>
      </View>

      <Text style={styles.subText}>
        {teamName} • Vùng đỏ đậm là khu vực tịnh tiến bóng tạo nguy cơ ghi bàn cao nhất
      </Text>

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
  title: { color: '#FFFFFF', fontSize: 13.5, fontWeight: 'bold', flex: 1 },
  xtBadge: {
    backgroundColor: '#FF174422',
    borderWidth: 1,
    borderColor: '#FF5252',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  xtText: { color: '#FF5252', fontSize: 11, fontWeight: 'bold' },
  subText: { color: '#AAAAAA', fontSize: 11, marginBottom: 10 },
  pitchWrapper: { alignItems: 'center' },
});