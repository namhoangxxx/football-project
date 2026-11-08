import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Match } from '../types/football';

interface MatchDetailProps {
  match: Match;
  onBack: () => void;
  // 1. Cập nhật signature để nhận thêm teamId (number)
  onSelectClub: (teamId: number, teamName: string, logoUrl?: string) => void;
}

export const MatchDetailScreen: React.FC<MatchDetailProps> = ({
  match,
  onBack,
  onSelectClub,
}) => {
  const isFinishedOrLive =
    match.status === 'IN_PLAY' ||
    match.status === 'PAUSED' ||
    match.status === 'FINISHED';

  const matchDate = match.match_time
    ? new Date(match.match_time).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      })
    : 'Chưa xếp lịch';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.6}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Text style={styles.backButtonText}>‹ Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {match.league || 'Chi tiết trận đấu'}
        </Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.scoreboardCard}>
          {/* 2. Truyền match.home_team_id cho Đội nhà */}
          <TouchableOpacity
            style={styles.teamContainer}
            activeOpacity={0.7}
            onPress={() =>
              onSelectClub(
                match.home_team_id,
                match.home_team,
                match.home_icon || undefined
              )
            }
          >
            {match.home_icon ? (
              <Image source={{ uri: match.home_icon }} style={styles.teamLogo} />
            ) : (
              <View style={[styles.teamLogo, styles.logoPlaceholder]}>
                <Text style={styles.logoText}>{match.home_team.charAt(0)}</Text>
              </View>
            )}
            <Text style={styles.teamName} numberOfLines={2}>
              {match.home_team}
            </Text>
          </TouchableOpacity>

          <View style={styles.scoreCenter}>
            {isFinishedOrLive ? (
              <>
                <Text style={styles.scoreText}>
                  {match.home_score ?? 0} - {match.away_score ?? 0}
                </Text>
                <Text
                  style={[
                    styles.statusBadge,
                    match.status === 'IN_PLAY' && styles.liveBadge,
                  ]}
                >
                  {match.status === 'IN_PLAY'
                    ? '🔴 LIVE'
                    : match.status === 'FINISHED'
                    ? 'FT (Kết thúc)'
                    : match.status}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.vsText}>VS</Text>
                <Text style={styles.timeText}>{matchDate}</Text>
              </>
            )}
          </View>

          {/* 3. Truyền match.away_team_id cho Đội khách */}
          <TouchableOpacity
            style={styles.teamContainer}
            activeOpacity={0.7}
            onPress={() =>
              onSelectClub(
                match.away_team_id,
                match.away_team,
                match.away_icon || undefined
              )
            }
          >
            {match.away_icon ? (
              <Image source={{ uri: match.away_icon }} style={styles.teamLogo} />
            ) : (
              <View style={[styles.teamLogo, styles.logoPlaceholder]}>
                <Text style={styles.logoText}>{match.away_team.charAt(0)}</Text>
              </View>
            )}
            <Text style={styles.teamName} numberOfLines={2}>
              {match.away_team}
            </Text>
          </TouchableOpacity>
        </View>

        {isFinishedOrLive ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>📊 Thông số trận đấu</Text>
            <View style={styles.statRow}>
              <Text style={styles.statValue}>54%</Text>
              <Text style={styles.statLabel}>Kiểm soát bóng</Text>
              <Text style={styles.statValue}>46%</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Tổng số cú sút</Text>
              <Text style={styles.statValue}>8</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statValue}>5</Text>
              <Text style={styles.statLabel}>Sút trúng đích</Text>
              <Text style={styles.statValue}>3</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statValue}>6</Text>
              <Text style={styles.statLabel}>Phạt góc</Text>
              <Text style={styles.statValue}>4</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statValue}>11</Text>
              <Text style={styles.statLabel}>Phạm lỗi</Text>
              <Text style={styles.statValue}>14</Text>
            </View>
          </View>
        ) : (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🔮 Dự đoán & Phân tích</Text>
            <Text style={styles.subText}>Tỷ lệ chiến thắng dự đoán:</Text>
            <View style={styles.predictionBar}>
              <View style={[styles.predSegment, { flex: 50, backgroundColor: '#007AFF' }]}>
                <Text style={styles.predText}>Chủ 50%</Text>
              </View>
              <View style={[styles.predSegment, { flex: 25, backgroundColor: '#868E96' }]}>
                <Text style={styles.predText}>Hòa 25%</Text>
              </View>
              <View style={[styles.predSegment, { flex: 25, backgroundColor: '#FF3B30' }]}>
                <Text style={styles.predText}>Khách 25%</Text>
              </View>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>💡 Nhận định trước trận</Text>
              <Text style={styles.infoContent}>
                {match.home_team} có lợi thế sân nhà và phong độ tốt hơn. Trong khi đó {match.away_team} đang gặp thiếu hụt lực lượng ở hàng thủ.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
 

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  scoreboardCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    elevation: 2,
  },
  teamContainer: {
    flex: 1,
    alignItems: 'center',
  },
  teamLogo: {
    width: 52,
    height: 52,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  logoPlaceholder: {
    backgroundColor: '#E9ECEF',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6C757D',
  },
  teamName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
  },
  scoreCenter: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#212529',
  },
  vsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#868E96',
  },
  timeText: {
    fontSize: 11,
    color: '#495057',
    marginTop: 4,
    textAlign: 'center',
  },
  statusBadge: {
    fontSize: 10,
    color: '#007AFF',
    fontWeight: 'bold',
    marginTop: 4,
  },
  liveBadge: {
    color: '#FF3B30',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 14,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  statLabel: {
    fontSize: 13,
    color: '#6C757D',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212529',
  },
  subText: {
    fontSize: 13,
    color: '#6C757D',
    marginBottom: 8,
  },
  predictionBar: {
    flexDirection: 'row',
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  predSegment: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  predText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  infoContent: {
    fontSize: 12,
    color: '#495057',
    lineHeight: 18,
  },
});