import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { computeClubSeasonSummary } from '../../services/clubStatsService';
import { Match } from '../../types/football';
import { AppIcon } from '../common/AppIcon';

interface ClubStatsTabProps {
  matches: Match[];
  teamId: number;
  teamName: string;
}

export const ClubStatsTab: React.FC<ClubStatsTabProps> = ({
  matches,
  teamId,
  teamName,
}) => {
  const stats = useMemo(
    () => computeClubSeasonSummary(matches, teamId, teamName),
    [matches, teamId, teamName]
  );

  const winRate = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  const avgGf = stats.played > 0 ? (stats.gf / stats.played).toFixed(2) : '0.00';
  const avgGa = stats.played > 0 ? (stats.ga / stats.played).toFixed(2) : '0.00';

  if (stats.played === 0) {
    return <Text style={styles.emptyText}>Chưa có trận đấu hoàn thành để thống kê.</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.kpiRow}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiVal}>{winRate}%</Text>
          <Text style={styles.kpiLabel}>Tỷ lệ thắng</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={[styles.kpiVal, { color: '#38BDF8' }]}>{avgGf}</Text>
          <Text style={styles.kpiLabel}>Bàn thắng / trận</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={[styles.kpiVal, { color: '#FFD600' }]}>{stats.cleanSheets}</Text>
          <Text style={styles.kpiLabel}>Giữ sạch lưới</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.titleRow}>
          <AppIcon name="chart" size={15} color="#00E676" />
          <Text style={styles.cardTitle}>Tổng quan ({stats.played} trận đã đấu)</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Thắng / Hòa / Thua</Text>
          <Text style={styles.val}>
            {stats.won}T - {stats.draw}H - {stats.lost}B
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tổng bàn thắng / Bàn thua</Text>
          <Text style={styles.val}>
            {stats.gf} / {stats.ga} (TB thủng lưới: {avgGa})
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Thành tích Sân nhà</Text>
          <Text style={[styles.val, { color: '#00E676' }]}>{stats.homeRecord}</Text>
        </View>
        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <Text style={styles.label}>Thành tích Sân khách</Text>
          <Text style={[styles.val, { color: '#38BDF8' }]}>{stats.awayRecord}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { paddingBottom: 24 },
  emptyText: { textAlign: 'center', color: '#777', marginTop: 30, fontSize: 13 },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpiBox: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
  },
  kpiVal: { fontSize: 18, fontWeight: '800', color: '#00E676' },
  kpiLabel: { fontSize: 10.5, color: '#888', marginTop: 3 },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262626',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cardTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  label: { color: '#94A3B8', fontSize: 12.5 },
  val: { color: '#F8FAFC', fontSize: 12.5, fontWeight: '700' },
});