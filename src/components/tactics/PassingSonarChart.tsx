import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { SonarBin } from '../../types/tactical';
import { AppIcon } from '../common/AppIcon';

interface PassingSonarChartProps {
  teamName: string;
  bins: SonarBin[];
}

export const PassingSonarChart: React.FC<PassingSonarChartProps> = ({ teamName, bins }) => {
  const size = 210;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 76;

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
      <View style={styles.titleRow}>
        <AppIcon name="compass" size={15} color="#38BDF8" />
        <Text style={styles.title}>Biểu đồ Hướng chuyền (Passing Sonar 360°)</Text>
      </View>
      <Text style={styles.subText}>
        {teamName} • Cánh quạt dài thể hiện hướng chuyền chủ đạo (→ Hướng tấn công)
      </Text>

      <View style={styles.chartWrapper}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {[0.33, 0.66, 1].map((scale, i) => (
            <Circle key={i} cx={cx} cy={cy} r={maxR * scale} fill="none" stroke="#333333" strokeWidth="1" strokeDasharray="3,3" />
          ))}
          <Line x1={cx - maxR} y1={cy} x2={cx + maxR} y2={cy} stroke="#333333" strokeWidth="1" />
          <Line x1={cx} y1={cy - maxR} x2={cx} y2={cy + maxR} stroke="#333333" strokeWidth="1" />

          {bins.map((bin) => {
            const r = Math.max(14, bin.frequency * maxR);
            const isForward = bin.angleDeg === 0 || bin.angleDeg === 30 || bin.angleDeg === 330;
            return (
              <Path
                key={bin.angleDeg}
                d={createWedgePath(bin.angleDeg, r)}
                fill={isForward ? '#00E676' : '#38BDF8'}
                opacity={0.78}
                stroke="#121212"
                strokeWidth="0.8"
              />
            );
          })}

          <Circle cx={cx} cy={cy} r="4" fill="#FFFFFF" />
          <SvgText x={size - 16} y={cy - 5} fontSize="9" fill="#00E676" fontWeight="bold" textAnchor="end">
            Tiến công →
          </SvgText>
          <SvgText x={16} y={cy - 5} fontSize="9" fill="#888888" textAnchor="start">
            ← Chuyền về
          </SvgText>
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 14, marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  title: { color: '#FFFFFF', fontSize: 13.5, fontWeight: 'bold' },
  subText: { color: '#AAAAAA', fontSize: 11, marginBottom: 10 },
  chartWrapper: { alignItems: 'center', backgroundColor: '#161616', borderRadius: 8, paddingVertical: 8 },
});