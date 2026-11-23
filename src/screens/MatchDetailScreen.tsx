import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, IconName } from '../components/common/AppIcon';
import { MatchEventsTab } from '../components/match/MatchEventsTab';
import { MatchLineupsTab } from '../components/match/MatchLineupsTab';
import { MatchScoreboard } from '../components/match/MatchScoreboard';
import { MatchStatsTab } from '../components/match/MatchStatsTab';
import { MatchTacticsTab } from '../components/match/MatchTacticsTab';
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

const TABS: Array<{ key: DetailTab; label: string; icon: IconName }> = [
  { key: 'STATS', label: 'Thông số', icon: 'chart' },
  { key: 'TACTICS', label: 'Chiến thuật', icon: 'tactics' },
  { key: 'EVENTS', label: 'Diễn biến', icon: 'clock' },
  { key: 'LINEUPS', label: 'Đội hình', icon: 'jersey' },
];

export const MatchDetailScreen: React.FC<MatchDetailProps> = ({
  match,
  onBack,
  onSelectClub,
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('STATS');
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [events, setEvents] = useState<MatchEventItem[]>([]);
  const [lineups, setLineups] = useState<TeamLineup[]>([]);
  const [teamIdentities, setTeamIdentities] = useState<MatchTeamIdentities | undefined>();
  const [loading, setLoading] = useState(false);

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
    if (!isFinishedOrLive) return;

    setLoading(true);
    Promise.all([
      getMatchStats(match.event_id),
      getMatchEventsFromSupabase(match.event_id),
      getMatchLineupsFromSupabase(match.event_id),
      getMatchTeamIdentities(match.home_team_id, match.away_team_id, match.home_team, match.away_team),
    ])
      .then(([statsData, eventsData, lineupsData, identitiesData]) => {
        if (!isMounted) return;
        setStats(statsData);
        setEvents(eventsData);
        setLineups(lineupsData);
        setTeamIdentities(identitiesData);
        setLoading(false);
      })
      .catch(() => isMounted && setLoading(false));

    return () => {
      isMounted = false;
    };
  }, [match, isFinishedOrLive]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <AppIcon name="back" size={18} color="#00E676" />
          <Text style={styles.backText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {match.league || 'Chi tiết trận đấu'}
        </Text>
        <View style={{ width: 74 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <MatchScoreboard
          match={match}
          isFinishedOrLive={isFinishedOrLive}
          matchDate={matchDate}
          onSelectClub={onSelectClub}
        />

        {isFinishedOrLive ? (
          <>
            <View style={styles.tabBar}>
              {TABS.map((t) => {
                const isActive = activeTab === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.tab, isActive && styles.activeTab]}
                    onPress={() => setActiveTab(t.key)}
                  >
                    <AppIcon name={t.icon} size={13} color={isActive ? '#00E676' : '#777'} />
                    <Text style={[styles.tabText, isActive && styles.activeTabText]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
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
          <View style={styles.card}>
            <View style={styles.titleRow}>
              <AppIcon name="brain" size={16} color="#00E676" />
              <Text style={styles.sectionTitle}>Dự đoán & Phân tích</Text>
            </View>
            <View style={styles.predictionBar}>
              <View style={[styles.predSegment, { flex: 50, backgroundColor: '#00E676' }]}>
                <Text style={[styles.predText, { color: '#121212' }]}>Chủ 50%</Text>
              </View>
              <View style={[styles.predSegment, { flex: 25, backgroundColor: '#475569' }]}>
                <Text style={styles.predText}>Hòa 25%</Text>
              </View>
              <View style={[styles.predSegment, { flex: 25, backgroundColor: '#FF5252' }]}>
                <Text style={styles.predText}>Khách 25%</Text>
              </View>
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
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: '#161616',
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 74 },
  backText: { color: '#00E676', fontSize: 14, fontWeight: '600' },
  headerTitle: { color: '#FFF', fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },
  content: { padding: 12 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 7 },
  activeTab: { backgroundColor: '#282828' },
  tabText: { color: '#777', fontSize: 11, fontWeight: '600' },
  activeTabText: { color: '#00E676', fontWeight: '700' },
  loadingBox: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 20, alignItems: 'center' },
  loadingText: { color: '#999', marginTop: 8, fontSize: 13 },
  card: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#262626' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  sectionTitle: { color: '#FFF', fontSize: 14.5, fontWeight: '700' },
  predictionBar: { height: 24, flexDirection: 'row', borderRadius: 6, overflow: 'hidden' },
  predSegment: { justifyContent: 'center', alignItems: 'center' },
  predText: { color: '#FFF', fontSize: 10.5, fontWeight: '700' },
});