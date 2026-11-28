import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { normalizePossession } from '../../services/matchDetailService';
import { MatchStats } from '../../types/matchDetail';
import { AppIcon } from '../common/AppIcon';
import { StatBar } from '../common/StatBar';

interface MatchStatsTabProps {
  stats: MatchStats | null;
  homeName?: string;
  awayName?: string;
}

export const MatchStatsTab: React.FC<MatchStatsTabProps> = ({
  stats,
  homeName,
  awayName,
}) => {
  const resolvedHome = homeName?.trim() || 'Chủ nhà';
  const resolvedAway = awayName?.trim() || 'Đội khách';

  if (!stats) {
    return (
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <AppIcon name="chart" size={16} color="#00E676" />
          <Text style={styles.title}>Thông số trận đấu</Text>
        </View>
        <Text style={styles.emptyText}>Chưa có dữ liệu thống kê cho trận đấu này.</Text>
      </View>
    );
  }

  const possession = normalizePossession(stats.home_possession, stats.away_possession);

  const homeAccuracy =
    stats.home_shots > 0
      ? Math.round((stats.home_shots_on_target / stats.home_shots) * 100)
      : 0;
  const awayAccuracy =
    stats.away_shots > 0
      ? Math.round((stats.away_shots_on_target / stats.away_shots) * 100)
      : 0;

  const diff = possession.home - possession.away;
  const tempoText =
    Math.abs(diff) <= 4
      ? 'Thế trận cân bằng'
      : diff > 0
      ? `${resolvedHome} kiểm soát bóng`
      : `${resolvedAway} kiểm soát bóng`;

  return (
    <View style={styles.wrapper}>
      {/* 1. Hero Card: Kiểm soát bóng */}
      <View style={styles.card}>
        <View style={styles.headerBetween}>
          <View style={styles.titleRowNoMargin}>
            <AppIcon name="chart" size={16} color="#00E676" />
            <Text style={styles.title}>Kiểm soát bóng</Text>
          </View>
          <View style={styles.tempoBadge}>
            <Text style={styles.tempoText} numberOfLines={1}>
              {tempoText}
            </Text>
          </View>
        </View>

        <View style={styles.possessionNumbers}>
          <View style={styles.sideCol}>
            <Text style={[styles.bigPct, { color: '#00E676' }]}>{possession.home}%</Text>
            <Text style={styles.sideCaption} numberOfLines={1}>
              {resolvedHome}
            </Text>
          </View>
          <View style={[styles.sideCol, { alignItems: 'flex-end' }]}>
            <Text style={[styles.bigPct, { color: '#FF5252' }]}>{possession.away}%</Text>
            <Text style={[styles.sideCaption, { textAlign: 'right' }]} numberOfLines={1}>
              {resolvedAway}
            </Text>
          </View>
        </View>

        <View style={styles.possessionTrack}>
          <View style={[styles.possessionHome, { width: `${possession.home}%` }]} />
          <View style={styles.possessionDivider} />
          <View style={[styles.possessionAway, { flex: 1 }]} />
        </View>
      </View>

      {/* 2. Hiệu quả dứt điểm */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Hiệu quả dứt điểm</Text>
        <View style={styles.efficiencyContainer}>
          <View style={styles.effColumn}>
            <Text style={[styles.effPct, { color: '#00E676' }]}>{homeAccuracy}%</Text>
            <Text style={styles.effDetail}>
              Trúng đích ({stats.home_shots_on_target}/{stats.home_shots})
            </Text>
            <View style={styles.miniTrack}>
              <View
                style={[
                  styles.miniFill,
                  { width: `${homeAccuracy}%`, backgroundColor: '#00E676' },
                ]}
              />
            </View>
          </View>

          <View style={styles.verticalDivider} />

          <View style={styles.effColumn}>
            <Text style={[styles.effPct, { color: '#FF5252' }]}>{awayAccuracy}%</Text>
            <Text style={styles.effDetail}>
              Trúng đích ({stats.away_shots_on_target}/{stats.away_shots})
            </Text>
            <View style={styles.miniTrack}>
              <View
                style={[
                  styles.miniFill,
                  { width: `${awayAccuracy}%`, backgroundColor: '#FF5252' },
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      {/* 3. Nhóm chỉ số Tấn công & Kỷ luật */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tấn công & Tình huống cố định</Text>
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

        <View style={styles.groupSeparator} />

        <Text style={styles.sectionTitle}>Tranh chấp & Kỷ luật</Text>
        <StatBar
          label="Phạm lỗi"
          homeValue={stats.home_fouls}
          awayValue={stats.away_fouls}
          lowerIsBetter
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
  },
  titleRowNoMargin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  headerBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    color: '#FFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  tempoBadge: {
    maxWidth: '56%',
    backgroundColor: '#242424',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  tempoText: {
    color: '#A3A3A3',
    fontSize: 11,
    fontWeight: '600',
  },
  possessionNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  sideCol: {
    maxWidth: '46%',
  },
  bigPct: {
    fontSize: 26,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  sideCaption: {
    color: '#9E9E9E',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  possessionTrack: {
    height: 10,
    flexDirection: 'row',
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#262626',
  },
  possessionHome: {
    height: '100%',
    backgroundColor: '#00E676',
  },
  possessionDivider: {
    width: 3,
    backgroundColor: '#1A1A1A',
  },
  possessionAway: {
    height: '100%',
    backgroundColor: '#FF5252',
  },
  sectionTitle: {
    color: '#E5E5E5',
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 10,
  },
  efficiencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  effColumn: {
    flex: 1,
    alignItems: 'center',
  },
  effPct: {
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  effDetail: {
    color: '#888',
    fontSize: 11.5,
    marginTop: 2,
    marginBottom: 8,
  },
  miniTrack: {
    width: '78%',
    height: 5,
    borderRadius: 3,
    backgroundColor: '#262626',
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    borderRadius: 3,
  },
  verticalDivider: {
    width: 1,
    height: 44,
    backgroundColor: '#262626',
  },
  groupSeparator: {
    height: 1,
    backgroundColor: '#262626',
    marginVertical: 12,
  },
  emptyText: {
    color: '#777',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
});