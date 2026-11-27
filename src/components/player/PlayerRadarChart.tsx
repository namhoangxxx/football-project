import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { PlayerRadarAxes } from '../../types/playerAnalytics';
import { PositionGroup } from '../../utils/playerPosition';

type TacticalGroup = Exclude<PositionGroup, 'ALL'>;

interface PlayerRadarChartProps {
  primaryName: string;
  primaryRadar: PlayerRadarAxes;
  secondaryName?: string;
  secondaryRadar?: PlayerRadarAxes;
  positionGroup?: TacticalGroup;
  isGoalkeeper?: boolean;
}

const NEUTRAL_OUTFIELD_AXES: Array<{ key: keyof PlayerRadarAxes; label: string }> = [
  { key: 'shooting', label: 'Dứt điểm' },
  { key: 'creativity', label: 'Kiến tạo' },
  { key: 'passing', label: 'Chuyền bóng' },
  { key: 'dribbling', label: 'Rê bóng' },
  { key: 'defending', label: 'Phòng ngự' },
  { key: 'discipline', label: 'Kỷ luật' },
];

const AXES_BY_GROUP: Record<TacticalGroup, Array<{ key: keyof PlayerRadarAxes; label: string }>> = {
  GK: [
    { key: 'defending', label: 'Phản xạ' },
    { key: 'passing', label: 'Phát động' },
    { key: 'creativity', label: 'Phân phối' },
    { key: 'dribbling', label: 'Chơi chân' },
    { key: 'discipline', label: 'Kỷ luật' },
    { key: 'shooting', label: 'Phát bóng' },
  ],
  DEF: [
    { key: 'shooting', label: 'Không chiến' },
    { key: 'creativity', label: 'Hỗ trợ biên' },
    { key: 'passing', label: 'Triển khai' },
    { key: 'dribbling', label: 'Thoát vây' },
    { key: 'defending', label: 'Phòng ngự' },
    { key: 'discipline', label: 'Kỷ luật' },
  ],
  MID: [
    { key: 'shooting', label: 'Tuyến hai' },
    { key: 'creativity', label: 'Kiến thiết' },
    { key: 'passing', label: 'Chuyền bóng' },
    { key: 'dribbling', label: 'Kéo bóng' },
    { key: 'defending', label: 'Thu hồi' },
    { key: 'discipline', label: 'Kỷ luật' },
  ],
  FWD: [
    { key: 'shooting', label: 'Dứt điểm' },
    { key: 'creativity', label: 'Kiến tạo' },
    { key: 'passing', label: 'Liên kết' },
    { key: 'dribbling', label: 'Đột phá' },
    { key: 'defending', label: 'Pressing' },
    { key: 'discipline', label: 'Kỷ luật' },
  ],
};

export const PlayerRadarChart: React.FC<PlayerRadarChartProps> = ({
  primaryName,
  primaryRadar,
  secondaryName,
  secondaryRadar,
  positionGroup,
  isGoalkeeper = false,
}) => {
  const axes = positionGroup
    ? AXES_BY_GROUP[positionGroup]
    : isGoalkeeper
    ? AXES_BY_GROUP.GK
    : NEUTRAL_OUTFIELD_AXES;

  const size = 270;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = 86;
  const levels = [25, 50, 75, 100];

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * maxRadius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const buildPolygonPoints = (radar: PlayerRadarAxes) =>
    axes.map((axis, idx) => {
      const pt = getPoint(idx, radar[axis.key]);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }).join(' ');

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {levels.map((lvl) => {
          const pts = axes.map((_, idx) => {
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

        {axes.map((axis, idx) => {
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

        {secondaryRadar &&
          axes.map((axis, idx) => {
            const pt = getPoint(idx, secondaryRadar[axis.key]);
            return <Circle key={`sec-${axis.key}`} cx={pt.x} cy={pt.y} r={2.8} fill="#FF5252" />;
          })}

        {axes.map((axis, idx) => {
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