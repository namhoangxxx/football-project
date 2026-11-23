import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TeamTacticalProfile } from '../../types/tactical';
import { AppIcon } from '../common/AppIcon';

interface TacticalComparisonCardProps {
  home: TeamTacticalProfile;
  away: TeamTacticalProfile;
  insights: string[];
}

export const TacticalComparisonCard: React.FC<TacticalComparisonCardProps> = ({
  home,
  away,
  insights,
}) => {
  const renderCompareBar = (
    label: string,
    homeVal: number,
    awayVal: number,
    formatFn: (v: number) => string,
    lowerIsBetter = false
  ) => {
    const total = homeVal + awayVal || 1;
    const homeFlex = Math.max(0.12, homeVal / total);
    const awayFlex = Math.max(0.12, awayVal / total);
    const homeBetter = lowerIsBetter ? homeVal < awayVal : homeVal > awayVal;
    const awayBetter = lowerIsBetter ? awayVal < homeVal : awayVal > homeVal;

    return (
      <View style={styles.metricRow}>
        <View style={styles.metricLabelRow}>
          <Text style={[styles.valText, homeBetter && styles.winnerText]}>{formatFn(homeVal)}</Text>
          <Text style={styles.metricTitle}>{label}</Text>
          <Text style={[styles.valText, awayBetter && styles.winnerText]}>{formatFn(awayVal)}</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.homeFill, { flex: homeFlex }]} />
          <View style={[styles.awayFill, { flex: awayFlex }]} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.storyCard}>
        <View style={styles.titleRow}>
          <AppIcon name="brain" size={15} color="#00E676" />
          <Text style={styles.sectionTitle}>Tóm tắt Diễn biến & Chiến thuật</Text>
        </View>
        {insights.map((line, idx) => (
          <View key={idx} style={styles.insightRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.insightText}>{line}</Text>
          </View>
        ))}
      </View>

      <View style={styles.compareCard}>
        <View style={styles.titleRow}>
          <AppIcon name="swords" size={15} color="#38BDF8" />
          <Text style={styles.sectionTitle}>So sánh Chỉ số Chuyên sâu (H2H)</Text>
        </View>
        <View style={styles.teamHeaderRow}>
          <Text style={[styles.teamName, { color: '#00E676' }]} numberOfLines={1}>{home.teamName}</Text>
          <Text style={styles.vsBadge}>VS</Text>
          <Text style={[styles.teamName, { color: '#FF5252', textAlign: 'right' }]} numberOfLines={1}>{away.teamName}</Text>
        </View>

        {renderCompareBar('Bàn thắng kỳ vọng (xG)', home.xgTotal, away.xgTotal, (v) => v.toFixed(2))}
        {renderCompareBar('Mối đe dọa tấn công (xT)', home.xtTotal, away.xtTotal, (v) => `+${v.toFixed(2)}`)}
        {renderCompareBar('Cường độ Pressing (PPDA - thấp hơn = ép mạnh hơn)', home.ppda, away.ppda, (v) => v.toFixed(1), true)}
        {renderCompareBar('Kiểm soát 1/3 sân đối phương (Field Tilt)', home.fieldTilt.attThird, away.fieldTilt.attThird, (v) => `${v}%`)}
        {renderCompareBar('Pha xâm nhập vòng cấm 16m50', home.boxEntries.length, away.boxEntries.length, (v) => `${v}`)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: 4 },
  storyCard: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 14, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#00E676' },
  compareCard: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 14, marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#161616', borderRadius: 8, padding: 10, marginBottom: 7 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00E676', marginTop: 6 },
  insightText: { color: '#E2E8F0', fontSize: 12, lineHeight: 18, flex: 1 },
  teamHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  teamName: { flex: 1, fontSize: 12, fontWeight: 'bold' },
  vsBadge: { color: '#777777', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 8 },
  metricRow: { marginVertical: 6 },
  metricLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  metricTitle: { color: '#AAAAAA', fontSize: 10.5, textAlign: 'center', flex: 1, paddingHorizontal: 4 },
  valText: { color: '#CCCCCC', fontSize: 12, fontWeight: '600', width: 44 },
  winnerText: { color: '#FFFFFF', fontWeight: 'bold' },
  barTrack: { height: 6, flexDirection: 'row', borderRadius: 3, overflow: 'hidden', backgroundColor: '#2C2C2C' },
  homeFill: { backgroundColor: '#00E676' },
  awayFill: { backgroundColor: '#FF5252' },
});