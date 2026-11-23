import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fetchRecentMatchesXg, TeamXgMap } from '../../services/predictionDataLoader';
import { predictMatchOutcome } from '../../services/predictionEngine';
import { Match } from '../../types/football';
import { AppIcon } from '../common/AppIcon';

interface MatchPredictionCardProps {
  match: Match;
  allMatches: Match[];
}

export const MatchPredictionCard: React.FC<MatchPredictionCardProps> = ({
  match,
  allMatches,
}) => {
  const [xgMap, setXgMap] = useState<TeamXgMap>({});

  useEffect(() => {
    let isMounted = true;
    fetchRecentMatchesXg(match.home_team, match.away_team, allMatches).then((data) => {
      if (isMounted) setXgMap(data);
    });
    return () => {
      isMounted = false;
    };
  }, [match.home_team, match.away_team, allMatches]);

  const pred = useMemo(
    () => predictMatchOutcome(match, allMatches, xgMap),
    [match, allMatches, xgMap]
  );

  const renderFormBadges = (form: string[]) => {
    if (form.length === 0) return <Text style={styles.muted}>Đầu mùa giải</Text>;
    return (
      <View style={styles.formList}>
        {form.map((res, idx) => {
          const bg = res === 'W' ? '#00E676' : res === 'D' ? '#64748B' : '#FF5252';
          const fg = res === 'W' ? '#121212' : '#FFFFFF';
          return (
            <View key={idx} style={[styles.badge, { backgroundColor: bg }]}>
              <Text style={[styles.badgeText, { color: fg }]}>{res}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <AppIcon name="brain" size={16} color="#00E676" />
          <Text style={styles.sectionTitle}>Dự đoán Xác suất (Dixon-Coles & Elo)</Text>
        </View>
        <View style={styles.confBadge}>
          <Text style={styles.confText}>Tin cậy {pred.confidence}%</Text>
        </View>
      </View>

      {/* Điểm sức mạnh Elo 2 đội */}
      <View style={styles.eloRow}>
        <Text style={styles.eloText}>Elo Chủ: {pred.homeElo}</Text>
        <Text style={styles.likelyScore}>Tỷ số khả dĩ: {pred.mostLikelyScore}</Text>
        <Text style={styles.eloText}>Elo Khách: {pred.awayElo}</Text>
      </View>

      {/* Thanh xác suất Thắng - Hòa - Thua */}
      <View style={styles.predictionBar}>
        <View style={[styles.predSegment, { flex: pred.homeWinProb, backgroundColor: '#00E676' }]}>
          <Text style={[styles.predText, { color: '#121212' }]}>Chủ {pred.homeWinProb}%</Text>
        </View>
        <View style={[styles.predSegment, { flex: pred.drawProb, backgroundColor: '#475569' }]}>
          <Text style={styles.predText}>Hòa {pred.drawProb}%</Text>
        </View>
        <View style={[styles.predSegment, { flex: pred.awayWinProb, backgroundColor: '#FF5252' }]}>
          <Text style={styles.predText}>Khách {pred.awayWinProb}%</Text>
        </View>
      </View>

      {/* Chỉ số phụ */}
      <View style={styles.subStatsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{pred.expectedHomeGoals} - {pred.expectedAwayGoals}</Text>
          <Text style={styles.statLabel}>Bàn thắng kỳ vọng (xG)</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: '#38BDF8' }]}>{pred.over25Prob}%</Text>
          <Text style={styles.statLabel}>Trên 2.5 bàn</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: '#FACC15' }]}>{pred.bttsProb}%</Text>
          <Text style={styles.statLabel}>2 đội ghi bàn (BTTS)</Text>
        </View>
      </View>

      {/* Phong độ 5 trận gần nhất */}
      <View style={styles.formSection}>
        <View style={styles.formRow}>
          <Text style={styles.teamLabel} numberOfLines={1}>{match.home_team}</Text>
          {renderFormBadges(pred.homeRecentForm)}
        </View>
        <View style={styles.formRow}>
          <Text style={styles.teamLabel} numberOfLines={1}>{match.away_team}</Text>
          {renderFormBadges(pred.awayRecentForm)}
        </View>
      </View>

      <Text style={styles.h2hFooter}>
        {pred.h2hSummary.total > 0
          ? `Đối đầu H2H (${pred.h2hSummary.total} trận): Chủ thắng ${pred.h2hSummary.homeWins} • Hòa ${pred.h2hSummary.draws} • Khách thắng ${pred.h2hSummary.awayWins}`
          : 'Chưa có lịch sử đối đầu trực tiếp trong dữ liệu mùa giải'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  sectionTitle: { color: '#FFF', fontSize: 13.5, fontWeight: '700' },
  confBadge: { backgroundColor: 'rgba(0, 230, 118, 0.14)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  confText: { color: '#00E676', fontSize: 10.5, fontWeight: '700' },
  eloRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  eloText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  likelyScore: { color: '#38BDF8', fontSize: 12, fontWeight: '800' },
  predictionBar: { height: 26, flexDirection: 'row', borderRadius: 6, overflow: 'hidden' },
  predSegment: { justifyContent: 'center', alignItems: 'center' },
  predText: { color: '#FFF', fontSize: 10.5, fontWeight: '800' },
  subStatsGrid: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statBox: {
    flex: 1,
    backgroundColor: '#131313',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252525',
  },
  statVal: { color: '#00E676', fontSize: 14, fontWeight: '800' },
  statLabel: { color: '#94A3B8', fontSize: 10, marginTop: 3, textAlign: 'center' },
  formSection: { marginTop: 14, gap: 8, borderTopWidth: 1, borderTopColor: '#262626', paddingTop: 12 },
  formRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamLabel: { color: '#E2E8F0', fontSize: 12.5, fontWeight: '600', flex: 1, paddingRight: 8 },
  formList: { flexDirection: 'row', gap: 4 },
  badge: { width: 20, height: 20, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  badgeText: { fontSize: 10.5, fontWeight: '800' },
  muted: { color: '#64748B', fontSize: 11.5 },
  h2hFooter: { color: '#94A3B8', fontSize: 11, marginTop: 12, textAlign: 'center' },
});