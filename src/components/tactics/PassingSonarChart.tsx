import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { SonarBin } from '../../types/tactical';
import { AppIcon } from '../common/AppIcon';

interface PassingSonarChartProps {
  teamName: string;
  bins: SonarBin[];
}

const normalizeAngle = (deg: number) => ((deg % 360) + 360) % 360;

export const PassingSonarChart: React.FC<PassingSonarChartProps> = ({ teamName, bins }) => {
  const width = 268;
  const height = 224;
  const cx = width / 2;
  const cy = height / 2;
  const maxR = 68;
  const diagOffset = Math.round(maxR * 0.707);

  const { forwardPct, avgPassDist } = useMemo(() => {
    if (bins.length === 0) return { forwardPct: 0, avgPassDist: 0 };
    let totalFreq = 0;
    let forwardFreq = 0;
    let weightedDist = 0;

    bins.forEach((b) => {
      const freq = Math.max(0, b.frequency);
      const norm = normalizeAngle(b.angleDeg);
      totalFreq += freq;
      weightedDist += b.avgDistance * freq;
      if (norm === 0 || norm === 30 || norm === 330) {
        forwardFreq += freq;
      }
    });

    return {
      forwardPct: totalFreq > 0 ? Math.round((forwardFreq / totalFreq) * 100) : 0,
      avgPassDist: totalFreq > 0 ? Math.round(weightedDist / totalFreq) : 0,
    };
  }, [bins]);

  const createWedgePath = (angleDeg: number, radius: number) => {
    const startRad = ((angleDeg - 13) * Math.PI) / 180;
    const endRad = ((angleDeg + 13) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <AppIcon name="compass" size={15} color="#38BDF8" />
          <Text style={styles.title} numberOfLines={1}>
            Biểu đồ Hướng chuyền (Sonar 360°)
          </Text>
        </View>
        {avgPassDist > 0 && (
          <View style={styles.distBadge}>
            <Text style={styles.distBadgeText}>TB {avgPassDist}m</Text>
          </View>
        )}
      </View>

      <Text style={styles.subText} numberOfLines={1}>
        {teamName} • Chuyền tịnh tiến: {forwardPct}% tổng khối lượng
      </Text>

      <View style={styles.chartWrapper}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {[0.33, 0.66, 1].map((scale, i) => (
            <Circle
              key={i}
              cx={cx}
              cy={cy}
              r={maxR * scale}
              fill="none"
              stroke="#333333"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          ))}

          {/* Trục chính & trục chéo 45° */}
          <Line x1={cx - maxR} y1={cy} x2={cx + maxR} y2={cy} stroke="#3A3A3A" strokeWidth="1" />
          <Line x1={cx} y1={cy - maxR} x2={cx} y2={cy + maxR} stroke="#3A3A3A" strokeWidth="1" />
          <Line
            x1={cx - diagOffset}
            y1={cy - diagOffset}
            x2={cx + diagOffset}
            y2={cy + diagOffset}
            stroke="#2A2A2A"
            strokeWidth="0.8"
            strokeDasharray="2,3"
          />
          <Line
            x1={cx - diagOffset}
            y1={cy + diagOffset}
            x2={cx + diagOffset}
            y2={cy - diagOffset}
            stroke="#2A2A2A"
            strokeWidth="0.8"
            strokeDasharray="2,3"
          />

          {bins.map((bin) => {
            const normAngle = normalizeAngle(bin.angleDeg);
            const r = Math.max(12, Math.min(maxR, bin.frequency * maxR));
            const isForward = normAngle === 0 || normAngle === 30 || normAngle === 330;
            const distOpacity = Math.max(0.58, Math.min(0.92, 0.48 + bin.avgDistance / 45));

            return (
              <Path
                key={normAngle}
                d={createWedgePath(normAngle, r)}
                fill={isForward ? '#00E676' : '#38BDF8'}
                opacity={distOpacity}
                stroke="#121212"
                strokeWidth="0.8"
              />
            );
          })}

          <Circle cx={cx} cy={cy} r="4" fill="#FFFFFF" />

          {/* Nhãn 4 hướng đặt hoàn toàn ngoài bán kính maxR để không đè cánh quạt */}
          <SvgText x={cx} y={32} fontSize="8.5" fill="#94A3B8" textAnchor="middle">
            Cánh trái
          </SvgText>
          <SvgText x={cx} y={196} fontSize="8.5" fill="#94A3B8" textAnchor="middle">
            Cánh phải
          </SvgText>
          <SvgText
            x={cx + maxR + 6}
            y={cy + 3}
            fontSize="9"
            fill="#00E676"
            fontWeight="bold"
            textAnchor="start"
          >
            Tiến công →
          </SvgText>
          <SvgText
            x={cx - maxR - 6}
            y={cy + 3}
            fontSize="9"
            fill="#94A3B8"
            textAnchor="end"
          >
            ← Chuyền về
          </SvgText>
        </Svg>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#00E676' }]} />
          <Text style={styles.legendText}>Hướng tịnh tiến (±30°)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#38BDF8' }]} />
          <Text style={styles.legendText}>Chuyền ngang / Lùi</Text>
        </View>
        <Text style={styles.scaleNote}>Độ dài = Tần suất</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 14, marginBottom: 14 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 8 },
  title: { color: '#FFFFFF', fontSize: 13.5, fontWeight: 'bold' },
  distBadge: {
    backgroundColor: '#38BDF822',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  distBadgeText: { color: '#38BDF8', fontSize: 11, fontWeight: 'bold' },
  subText: { color: '#AAAAAA', fontSize: 11, marginBottom: 10 },
  chartWrapper: {
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 8,
    paddingVertical: 6,
  },
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