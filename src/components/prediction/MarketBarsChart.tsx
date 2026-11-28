import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface MarketBarsChartProps {
  homeTeam: string;
  awayTeam: string;
  homeElo: number;
  awayElo: number;
  over25Prob: number;
  bttsProb: number;
}

interface RatioBarProps {
  title: string;
  leftText: string;
  rightText: string;
  leftRatio: number;
  leftColor: string;
  rightColor: string;
}

const RatioBar: React.FC<RatioBarProps> = ({
  title,
  leftText,
  rightText,
  leftRatio,
  leftColor,
  rightColor,
}) => {
  const safeRatio = Math.min(94, Math.max(6, leftRatio));
  return (
    <View style={styles.block}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.rowText}>
        <Text style={[styles.sideLabel, { color: leftColor }]} numberOfLines={1}>
          {leftText}
        </Text>
        <Text style={[styles.sideLabel, { color: rightColor }]} numberOfLines={1}>
          {rightText}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={{ width: `${safeRatio}%`, backgroundColor: leftColor }} />
        <View style={{ flex: 1, backgroundColor: rightColor }} />
      </View>
    </View>
  );
};

export const MarketBarsChart: React.FC<MarketBarsChartProps> = ({
  homeTeam,
  awayTeam,
  homeElo,
  awayElo,
  over25Prob,
  bttsProb,
}) => {
  const eloDiff = Math.round(homeElo - awayElo);
  const diffLabel = eloDiff >= 0 ? `+${eloDiff}` : `${eloDiff}`;
  const homeEloPct = (homeElo / Math.max(1, homeElo + awayElo)) * 100;
  const under25Prob = Math.max(0, Number((100 - over25Prob).toFixed(1)));
  const bttsNoProb = Math.max(0, Number((100 - bttsProb).toFixed(1)));

  return (
    <View style={styles.container}>
      <RatioBar
        title={`Tương quan Elo động (Chênh lệch: ${diffLabel})`}
        leftText={`${homeTeam} (${homeElo})`}
        rightText={`(${awayElo}) ${awayTeam}`}
        leftRatio={homeEloPct}
        leftColor="#10B981"
        rightColor="#3B82F6"
      />
      <RatioBar
        title="Tổng bàn thắng (Tài / Xỉu 2.5)"
        leftText={`Tài 2.5: ${over25Prob}%`}
        rightText={`Xỉu 2.5: ${under25Prob}%`}
        leftRatio={over25Prob}
        leftColor="#8B5CF6"
        rightColor="#475569"
      />
      <RatioBar
        title="Hai đội cùng ghi bàn (BTTS)"
        leftText={`Có: ${bttsProb}%`}
        rightText={`Không: ${bttsNoProb}%`}
        leftRatio={bttsProb}
        leftColor="#F59E0B"
        rightColor="#475569"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { borderTopWidth: 1, borderTopColor: '#1F2937', paddingTop: 12, gap: 10, marginBottom: 12 },
  block: { gap: 4 },
  title: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  rowText: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  sideLabel: { fontSize: 12, fontWeight: '700', maxWidth: '48%' },
  track: { flexDirection: 'row', height: 7, borderRadius: 4, overflow: 'hidden', gap: 2 },
});