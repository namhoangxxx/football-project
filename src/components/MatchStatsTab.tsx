import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MatchStats } from '../types/matchDetail';
import { StatBar } from './StatBar';

interface MatchStatsTabProps {
  stats: MatchStats | null;
}

export const MatchStatsTab: React.FC<MatchStatsTabProps> = ({ stats }) => {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>📊 Thông số trận đấu</Text>
      {stats ? (
        <View style={styles.statsList}>
          <StatBar
            label="Kiểm soát bóng"
            homeValue={stats.home_possession}
            awayValue={stats.away_possession}
            isPercentage
          />
          <StatBar
            label="Tổng số cú sút"
            homeValue={stats.home_shots}
            awayValue={stats.away_shots}
          />
          <StatBar
            label="Sút trúng đích"
            homeValue={stats.home_shots_on_target}
            awayValue={stats.away_shots_on_target}
          />
          <StatBar
            label="Phạt góc"
            homeValue={stats.home_corners}
            awayValue={stats.away_corners}
          />
          <StatBar
            label="Phạm lỗi"
            homeValue={stats.home_fouls}
            awayValue={stats.away_fouls}
          />
        </View>
      ) : (
        <Text style={styles.emptyText}>Chưa có dữ liệu thống kê cho trận đấu này.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionCard: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  statsList: { marginTop: 4 },
  emptyText: { color: '#888', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
});