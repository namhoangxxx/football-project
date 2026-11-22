import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MatchEventsTab } from '../components/MatchEventsTab';
import { MatchLineupsTab } from '../components/MatchLineupsTab';
import { MatchStatsTab } from '../components/MatchStatsTab';
import { MatchTacticsTab } from '../components/MatchTacticsTab';
import {
  getMatchEventsFromSupabase,
  getMatchLineupsFromSupabase,
  getMatchStats,
  getMatchTeamIdentities,
} from '../services/matchDetailService';
import { Match } from '../types/football';
import { MatchEventItem, MatchStats, TeamLineup } from '../types/matchDetail';
import { MatchTeamIdentities } from '../types/tactical';

interface MatchDetailProps {
  match: Match;
  onBack: () => void;
  onSelectClub: (teamId: number, teamName: string, logoUrl?: string) => void;
}

type DetailTab = 'STATS' | 'TACTICS' | 'EVENTS' | 'LINEUPS';

export const MatchDetailScreen: React.FC<MatchDetailProps> = ({
  match,
  onBack,
  onSelectClub,
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('STATS');
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [events, setEvents] = useState<MatchEventItem[]>([]);
  const [lineups, setLineups] = useState<TeamLineup[]>([]);
  const [teamIdentities, setTeamIdentities] = useState<MatchTeamIdentities | undefined>(
    undefined
  );
  const [loading, setLoading] = useState<boolean>(false);

  const isFinishedOrLive =
    match.status === 'IN_PLAY' ||
    match.status === 'PAUSED' ||
    match.status === 'HALFTIME' ||
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

  useEffect(() => {
    let isMounted = true;

    if (isFinishedOrLive) {
      setLoading(true);
      Promise.all([
        getMatchStats(match.event_id),
        getMatchEventsFromSupabase(match.event_id),
        getMatchLineupsFromSupabase(match.event_id),
        getMatchTeamIdentities(
          match.home_team_id,
          match.away_team_id,
          match.home_team,
          match.away_team
        ),
      ])
        .then(([statsData, eventsData, lineupsData, identitiesData]) => {
          if (isMounted) {
            setStats(statsData);
            setEvents(eventsData);
            setLineups(lineupsData);
            setTeamIdentities(identitiesData);
            setLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) setLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [match]);

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
        {/* Scoreboard */}
        <View style={styles.scoreboardCard}>
          <TouchableOpacity
            style={styles.teamContainer}
            activeOpacity={0.7}
            onPress={() =>
              onSelectClub(match.home_team_id, match.home_team, match.home_icon || undefined)
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

          <TouchableOpacity
            style={styles.teamContainer}
            activeOpacity={0.7}
            onPress={() =>
              onSelectClub(match.away_team_id, match.away_team, match.away_icon || undefined)
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
          <>
            <View style={styles.subTabContainer}>
              {(['STATS', 'TACTICS', 'EVENTS', 'LINEUPS'] as DetailTab[]).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.subTab, activeTab === tab && styles.activeSubTab]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.subTabText, activeTab === tab && styles.activeSubTabText]}>
                    {tab === 'STATS'
                      ? '📊 Thông số'
                      : tab === 'TACTICS'
                      ? '📈 Chiến thuật'
                      : tab === 'EVENTS'
                      ? '⏱ Diễn biến'
                      : '👕 Đội hình'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#00E676" />
                <Text style={styles.loadingText}>Đang tải dữ liệu trận đấu...</Text>
              </View>
            ) : (
              <>
                {activeTab === 'STATS' && <MatchStatsTab stats={stats} />}
                {activeTab === 'TACTICS' && (
                  <MatchTacticsTab
                    match={match}
                    stats={stats}
                    events={events}
                    lineups={lineups}
                    teamIdentities={teamIdentities}
                  />
                )}
                {activeTab === 'EVENTS' && <MatchEventsTab events={events} />}
                {activeTab === 'LINEUPS' && <MatchLineupsTab lineups={lineups} />}
              </>
            )}
          </>
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
  container: { flex: 1, backgroundColor: '#121212' },
  header: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#1E1E1E',
  },
  backButton: { width: 70 },
  backButtonText: { color: '#00E676', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  content: { padding: 16 },
  scoreboardCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  teamContainer: { flex: 1, alignItems: 'center' },
  teamLogo: { width: 48, height: 48, resizeMode: 'contain', marginBottom: 6 },
  logoPlaceholder: { borderRadius: 24, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  logoText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  teamName: { color: '#FFF', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  scoreCenter: { alignItems: 'center', paddingHorizontal: 12 },
  scoreText: { color: '#00E676', fontSize: 22, fontWeight: 'bold' },
  vsText: { color: '#888', fontSize: 18, fontWeight: 'bold' },
  timeText: { color: '#AAA', fontSize: 11, marginTop: 4 },
  statusBadge: { color: '#888', fontSize: 10, marginTop: 4, fontWeight: 'bold' },
  liveBadge: { color: '#FF3B30' },
  subTabContainer: { flexDirection: 'row', backgroundColor: '#1E1E1E', borderRadius: 8, padding: 4, marginBottom: 12 },
  subTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  activeSubTab: { backgroundColor: '#2C2C2C' },
  subTabText: { color: '#888', fontSize: 11, fontWeight: '600' },
  activeSubTabText: { color: '#00E676' },
  loadingBox: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 20, alignItems: 'center' },
  loadingText: { color: '#AAA', marginTop: 8, fontSize: 13 },
  sectionCard: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  subText: { color: '#AAA', fontSize: 12, marginBottom: 8 },
  predictionBar: { height: 24, flexDirection: 'row', borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
  predSegment: { justifyContent: 'center', alignItems: 'center' },
  predText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  infoBox: { backgroundColor: '#2A2A2A', padding: 12, borderRadius: 8 },
  infoTitle: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  infoContent: { color: '#AAA', fontSize: 12, lineHeight: 18 },
});