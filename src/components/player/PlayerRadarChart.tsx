import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { PlayerRadarAxes } from '../../types/playerAnalytics';

interface PlayerRadarChartProps {
  primaryName: string;
  primaryRadar: PlayerRadarAxes;
  secondaryName?: string;
  secondaryRadar?: PlayerRadarAxes;
}

const AXES: Array<{ key: keyof PlayerRadarAxes; label: string }> = [
  { key: 'shooting', label: 'Dứt điểm' },
  { key: 'creativity', label: 'Kiến tạo' },
  { key: 'passing', label: 'Chuyền bóng' },
  { key: 'dribbling', label: 'Rê bóng' },
  { key: 'defending', label: 'Phòng ngự' },
  { key: 'discipline', label: 'Kỷ luật' },
];

export const PlayerRadarChart: React.FC<PlayerRadarChartProps> = ({
  primaryName,
  primaryRadar,
  secondaryName,
  secondaryRadar,
}) => {
  const size = 270;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = 86;
  const levels = [25, 50, 75, 100];

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / AXES.length - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * maxRadius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const buildPolygonPoints = (radar: PlayerRadarAxes) =>
    AXES.map((axis, idx) => {
      const pt = getPoint(idx, radar[axis.key]);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }).join(' ');

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {levels.map((lvl) => {
          const pts = AXES.map((_, idx) => {
            const p = getPoint(idx, lvl);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          }).join(' ');
          return (
            <Polygon
              key={lvl}
              points={pts}
              fill="none"
              stroke="#2C2C2C"
              strokeWidth={1}
            />
          );
        })}

        {AXES.map((axis, idx) => {
          const outer = getPoint(idx, 100);
          const labelPt = getPoint(idx, 124);
          return (
            <React.Fragment key={axis.key}>
              <Line
                x1={cx}
                y1={cy}
                x2={outer.x}
                y2={outer.y}
                stroke="#2C2C2C"
                strokeWidth={1}
              />
              <SvgText
                x={labelPt.x}
                y={labelPt.y + 4}
                fill="#CBD5E1"
                fontSize={10.5}
                fontWeight="700"
                textAnchor="middle"
              >
                {axis.label}
              </SvgText>
            </React.Fragment>
          );
        })}

        {secondaryRadar && (
          <Polygon
            points={buildPolygonPoints(secondaryRadar)}
            fill="rgba(255, 82, 82, 0.22)"
            stroke="#FF5252"
            strokeWidth={2}
          />
        )}

        <Polygon
          points={buildPolygonPoints(primaryRadar)}
          fill="rgba(0, 230, 118, 0.26)"
          stroke="#00E676"
          strokeWidth={2.2}
        />

        {AXES.map((axis, idx) => {
          const pt = getPoint(idx, primaryRadar[axis.key]);
          return <Circle key={axis.key} cx={pt.x} cy={pt.y} r={3.2} fill="#00E676" />;
        })}
      </Svg>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#00E676' }]} />
          <Text style={styles.legendText} numberOfLines={1}>
            {primaryName}
          </Text>
        </View>
        {secondaryName && secondaryRadar && (
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#FF5252' }]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {secondaryName}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 6 },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 140 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { color: '#E2E8F0', fontSize: 12, fontWeight: '700' },
});