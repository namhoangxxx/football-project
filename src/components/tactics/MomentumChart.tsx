import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { MomentumPoint } from '../../types/tactical';
import { AppIcon } from '../common/AppIcon';

interface MomentumChartProps {
  data: MomentumPoint[];
  homeName: string;
  awayName: string;
}

export const MomentumChart: React.FC<MomentumChartProps> = ({ data, homeName, awayName }) => {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.max(240, Math.min(windowWidth - 60, 420));
  const height = 148;
  const midY = height / 2;
  const maxBarHeight = 46;

  if (data.length === 0) {
    return null;
  }

  const barSlotWidth = width / data.length;
  const gap = barSlotWidth > 8 ? 3 : barSlotWidth > 4 ? 1.5 : 0.6;
  const barW = Math.max(1.5, barSlotWidth - gap);

  const htIndex = data.findIndex((pt) => pt.minute > 45);
  const htX = htIndex > 0 ? htIndex * barSlotWidth : width / 2;

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <AppIcon name="zap" size={15} color="#FFD600" />
        <Text style={styles.title}>Match Momentum (Áp lực 90')</Text>
      </View>

      <View style={styles.legendRow}>
        <Text style={[styles.teamLabel, { color: '#00E676' }]} numberOfLines={1}>
          ▲ {homeName}
        </Text>
        <Text style={[styles.teamLabel, { color: '#FF5252' }]} numberOfLines={1}>
          ▼ {awayName}
        </Text>
      </View>

      <View style={styles.chartWrapper}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Line x1="0" y1={midY} x2={width} y2={midY} stroke="#444444" strokeWidth="1" />
          <Line
            x1={htX}
            y1="14"
            x2={htX}
            y2={height - 14}
            stroke="#555555"
            strokeWidth="1"
            strokeDasharray="3,3"
          />

          {data.map((pt, idx) => {
            const absVal = Math.abs(pt.value);
            const isNeutral = absVal < 1;
            const isHome = pt.value >= 0;
            const barH = isNeutral ? 2 : Math.max(4, (Math.min(100, absVal) / 100) * maxBarHeight);
            const x = idx * barSlotWidth + gap / 2;
            const y = isNeutral ? midY - 1 : isHome ? midY - barH : midY;
            const cx = x + barW / 2;
            const fillColor = isNeutral ? '#475569' : isHome ? '#00E676' : '#FF5252';

            return (
              <React.Fragment key={`${pt.minute}-${idx}`}>
                <Rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={Math.min(2, barW / 2)}
                  fill={fillColor}
                  opacity={isNeutral ? 0.6 : 0.85}
                />

                {pt.goals &&
                  pt.goals.length > 0 &&
                  pt.goals.map((scorerSide, gIdx) => {
                    const cy = scorerSide === 'HOME' ? 8 + gIdx * 9 : height - 8 - gIdx * 9;
                    const accent = scorerSide === 'HOME' ? '#00E676' : '#FF5252';
                    return (
                      <Circle
                        key={`g-${gIdx}`}
                        cx={cx}
                        cy={cy}
                        r="3.4"
                        fill="#FFFFFF"
                        stroke={accent}
                        strokeWidth="1.5"
                      />
                    );
                  })}

                {(!pt.goals || pt.goals.length === 0) && pt.hasCard && (
                  <Rect
                    x={cx - 2.4}
                    y={pt.hasCard === 'HOME' ? 5 : height - 12}
                    width="4.8"
                    height="7"
                    rx="1"
                    fill="#FFD600"
                  />
                )}
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      <View style={styles.timeAxis}>
        <Text style={styles.axisText}>0'</Text>
        <Text style={styles.axisText}>HT (45')</Text>
        <Text style={styles.axisText}>90'</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 14, marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  title: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  teamLabel: { fontSize: 11, fontWeight: '600', maxWidth: '48%' },
  chartWrapper: { alignItems: 'center', backgroundColor: '#161616', borderRadius: 8, paddingVertical: 6 },
  timeAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 },
  axisText: { color: '#888888', fontSize: 10 },
});