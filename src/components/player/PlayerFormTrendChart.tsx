import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { MatchRatingPoint } from '../../types/playerAnalytics';

interface PlayerFormTrendChartProps {
  points: MatchRatingPoint[];
  seasonRating: number;
}

export const PlayerFormTrendChart: React.FC<PlayerFormTrendChartProps> = ({
  points,
  seasonRating,
}) => {
  if (!points || points.length === 0) {
    return <Text style={styles.empty}>Chưa đủ dữ liệu vòng đấu để vẽ biểu đồ phong độ.</Text>;
  }

  const width = 310;
  const height = 155;
  const padLeft = 28;
  const padRight = 16;
  const padTop = 20;
  const padBottom = 26;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const minVal = 5.0;
  const maxVal = 10.0;

  const getY = (val: number) => {
    const ratio = (Math.max(minVal, Math.min(maxVal, val)) - minVal) / (maxVal - minVal);
    return padTop + plotH * (1 - ratio);
  };

  const getX = (idx: number) => {
    if (points.length === 1) return padLeft + plotW / 2;
    return padLeft + (idx / (points.length - 1)) * plotW;
  };

  const lineCoords = points
    .map((pt, idx) => `${getX(idx).toFixed(1)},${getY(pt.rating).toFixed(1)}`)
    .join(' ');

  const avgY = getY(seasonRating);

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {[6.0, 7.5, 9.0].map((tick) => {
          const y = getY(tick);
          return (
            <React.Fragment key={tick}>
              <Line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#262626" strokeWidth={1} />
              <SvgText x={4} y={y + 3} fill="#64748B" fontSize={9.5}>
                {tick.toFixed(1)}
              </SvgText>
            </React.Fragment>
          );
        })}

        <Line
          x1={padLeft}
          y1={avgY}
          x2={width - padRight}
          y2={avgY}
          stroke="#FACC15"
          strokeWidth={1.2}
          strokeDasharray="4,4"
        />

        <Polyline
          points={lineCoords}
          fill="none"
          stroke="#00E676"
          strokeWidth={2.4}
        />

        {points.map((pt, idx) => {
          const x = getX(idx);
          const y = getY(pt.rating);
          const color = pt.rating >= 7.5 ? '#00E676' : pt.rating >= 6.8 ? '#38BDF8' : '#FB923C';
          return (
            <React.Fragment key={pt.matchId + idx}>
              <Circle cx={x} cy={y} r={4} fill={color} stroke="#121212" strokeWidth={1.5} />
              <SvgText x={x} y={y - 8} fill="#FFF" fontSize={9.5} fontWeight="700" textAnchor="middle">
                {pt.rating.toFixed(1)}
              </SvgText>
              <SvgText x={x} y={height - 8} fill="#94A3B8" fontSize={9} textAnchor="middle">
                {pt.dateLabel}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={styles.footerNote}>
        <View style={styles.dashSample} />
        <Text style={styles.noteText}>Đường đứt vàng: Trung bình mùa giải ({seasonRating.toFixed(2)})</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  empty: { color: '#777', fontSize: 12.5, textAlign: 'center', paddingVertical: 12 },
  footerNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dashSample: { width: 14, height: 2, backgroundColor: '#FACC15' },
  noteText: { color: '#94A3B8', fontSize: 11 },
});