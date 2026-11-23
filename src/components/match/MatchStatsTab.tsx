import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MatchStats } from '../../types/matchDetail';
import { AppIcon } from '../common/AppIcon';
import { StatBar } from '../common/StatBar';

interface MatchStatsTabProps {
  stats: MatchStats | null;
}

export const MatchStatsTab: React.FC<MatchStatsTabProps> = ({ stats }) => {
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <AppIcon name="chart" size={16} color="#00E676" />
        <Text style={styles.title}>Thông số trận đấu</Text>
      </View>

      {stats ? (
        <View style={styles.list}>
          <StatBar
            label="Kiểm soát bóng"
            homeValue={stats.home_possession}
            awayValue={stats.away_possession}
            isPercentage
          />
          <StatBar label="Tổng số cú sút" homeValue={stats.home_shots} awayValue={stats.away_shots} />
          <StatBar
            label="Sút trúng đích"
            homeValue={stats.home_shots_on_target}
            awayValue={stats.away_shots_on_target}
          />
          <StatBar label="Phạt góc" homeValue={stats.home_corners} awayValue={stats.away_corners} />
          <StatBar label="Phạm lỗi" homeValue={stats.home_fouls} awayValue={stats.away_fouls} />
        </View>
      ) : (
        <Text style={styles.emptyText}>Chưa có dữ liệu thống kê cho trận đấu này.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  title: { color: '#FFF', fontSize: 14.5, fontWeight: '700' },
  list: { marginTop: 2 },
  emptyText: { color: '#777', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
});