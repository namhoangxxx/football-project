import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PlayerMatchHistoryItem } from '../../services/playerService';
import { PlayerAnalyticsProfile } from '../../types/playerAnalytics';
import { PlayerFormTrendChart } from './PlayerFormTrendChart';

interface PlayerOverviewTabProps {
  profile: PlayerAnalyticsProfile;
  recentMatches?: PlayerMatchHistoryItem[];
}

export const PlayerOverviewTab: React.FC<PlayerOverviewTabProps> = ({
  profile,
  recentMatches = [],
}) => {
  const isFormUp = profile.formDelta >= 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Phong độ Ngắn hạn vs Cả mùa</Text>
        <View style={styles.formRow}>
          <View style={styles.formBox}>
            <Text style={styles.formLabel}>5 trận gần nhất</Text>
            <Text style={[styles.formValue, { color: '#00E676' }]}>
              {profile.recent5Rating.toFixed(2)}
            </Text>
          </View>
          <View style={styles.formBox}>
            <Text style={styles.formLabel}>TB Mùa giải</Text>
            <Text style={styles.formValue}>{profile.seasonRating.toFixed(2)}</Text>
          </View>
          <View style={styles.formBox}>
            <Text style={styles.formLabel}>Xu hướng</Text>
            <Text style={[styles.formValue, { color: isFormUp ? '#00E676' : '#FF5252' }]}>
              {isFormUp ? `+${profile.formDelta.toFixed(2)}` : profile.formDelta.toFixed(2)}
            </Text>
          </View>
        </View>
        <PlayerFormTrendChart points={profile.formTrend} seasonRating={profile.seasonRating} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nhận diện Điểm mạnh & Điểm yếu</Text>
        <Text style={styles.subLabelPro}>Điểm mạnh nổi bật</Text>
        {profile.pros.map((item, idx) => (
          <View key={`pro-${idx}`} style={styles.bulletRow}>
            <View style={[styles.dot, { backgroundColor: '#00E676' }]} />
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
        <Text style={styles.subLabelCon}>Điểm cần cải thiện</Text>
        {profile.cons.map((item, idx) => (
          <View key={`con-${idx}`} style={styles.bulletRow}>
            <View style={[styles.dot, { backgroundColor: '#FF5252' }]} />
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Chỉ số Chuyên sâu Mùa giải</Text>
        <View style={styles.grid}>
          <StatItem label="Số trận / Phút" value={`${profile.appearances} / ${profile.minutes}'`} />
          <StatItem label="Bàn thắng / xG" value={`${profile.goals} / ${profile.xg}`} />
          <StatItem label="Kiến tạo / xA" value={`${profile.assists} / ${profile.xa}`} />
          <StatItem label="Chuyền chuẩn" value={`${profile.passAccuracy}%`} />
          <StatItem label="Tắc bóng / 90p" value={`${profile.tacklesPer90}`} />
          <StatItem label="Rê bóng / 90p" value={`${profile.dribblesPer90}`} />
        </View>
      </View>

      {recentMatches.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nhật ký Thi đấu Thực tế</Text>
          {recentMatches.map((m, idx) => (
            <View key={`${m.eventId}-${idx}`} style={styles.logRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.logOpp}>{m.opponent} ({m.score})</Text>
                <Text style={styles.logRole}>{m.role}</Text>
              </View>
              <Text style={styles.logStat}>
                {m.goals > 0 ? `${m.goals} bàn ` : ''}
                {m.assists > 0 ? `${m.assists} KT` : m.goals === 0 ? '—' : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const StatItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.statBox}>
    <Text style={styles.statVal}>{value}</Text>
    <Text style={styles.statLbl}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
  card: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#262626' },
  cardTitle: { color: '#FFF', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  formRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  formBox: { flex: 1, backgroundColor: '#131313', borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#252525' },
  formLabel: { color: '#94A3B8', fontSize: 10.5 },
  formValue: { color: '#FFF', fontSize: 16, fontWeight: '800', marginTop: 2 },
  subLabelPro: { color: '#00E676', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  subLabelCon: { color: '#FF5252', fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  bulletText: { color: '#E2E8F0', fontSize: 12.5, flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: { width: '31%', backgroundColor: '#131313', borderRadius: 8, padding: 8, alignItems: 'center' },
  statVal: { color: '#00E676', fontSize: 13.5, fontWeight: '800' },
  statLbl: { color: '#94A3B8', fontSize: 10, marginTop: 2, textAlign: 'center' },
  logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#242424' },
  logOpp: { color: '#F1F5F9', fontSize: 12.5, fontWeight: '600' },
  logRole: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  logStat: { color: '#00E676', fontSize: 12, fontWeight: '700' },
});