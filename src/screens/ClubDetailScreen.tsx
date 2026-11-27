import React, { ComponentRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClubHeaderBanner } from '../components/club/ClubHeaderBanner';
import { ClubSquadTab, SelectedPlayerPayload } from '../components/club/ClubSquadTab';
import { ClubStatsTab } from '../components/club/ClubStatsTab';
import { AppIcon, IconName } from '../components/common/AppIcon';
import { MatchCard } from '../components/common/MatchCard';
import { fetchClubMatchesFromSupabase } from '../services/footballApi';
import { Match } from '../types/football';
import { buildClubTimeline } from '../utils/matchTimeline';

interface ClubDetailProps {
  teamId: number;
  teamName: string;
  logoUrl?: string;
  onBack: () => void;
  onSelectMatch: (match: Match) => void;
  onSelectPlayer: (player: SelectedPlayerPayload) => void;
}

type ClubTab = 'MATCHES' | 'STATS' | 'SQUAD';

const CLUB_TABS: Array<{ key: ClubTab; label: string; icon: IconName }> = [
  { key: 'MATCHES', label: 'Trận đấu', icon: 'calendar' },
  { key: 'STATS', label: 'Thống kê', icon: 'chart' },
  { key: 'SQUAD', label: 'Đội hình', icon: 'jersey' },
];

export const ClubDetailScreen: React.FC<ClubDetailProps> = ({
  teamId,
  teamName,
  logoUrl,
  onBack,
  onSelectMatch,
  onSelectPlayer,
}) => {
  const [activeTab, setActiveTab] = useState<ClubTab>('MATCHES');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const scrollViewRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const anchorYRef = useRef<number | null>(null);
  const userScrolledRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    anchorYRef.current = null;
    userScrolledRef.current = false;

    fetchClubMatchesFromSupabase(teamId, teamName)
      .then((data) => {
        if (isMounted) setMatches(data || []);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [teamId, teamName]);

  const { sortedMatches, anchorIndex, anchorLabel } = useMemo(
    () => buildClubTimeline(matches),
    [matches]
  );

  const scrollToAnchorPosition = useCallback(() => {
    if (userScrolledRef.current || anchorYRef.current == null) return;
    const targetOffset = Math.max(0, anchorYRef.current - 56);
    scrollViewRef.current?.scrollTo({ y: targetOffset, animated: false });
  }, []);

  const handleAnchorLayout = (e: LayoutChangeEvent) => {
    anchorYRef.current = e.nativeEvent.layout.y;
    scrollToAnchorPosition();
  };

  const handleTabChange = (tab: ClubTab) => {
    if (tab === 'MATCHES') {
      anchorYRef.current = null;
      userScrolledRef.current = false;
    }
    setActiveTab(tab);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <AppIcon name="back" size={18} color="#00E676" />
          <Text style={styles.backText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Hồ sơ Câu lạc bộ</Text>
        <View style={{ width: 72 }} />
      </View>

      <ClubHeaderBanner teamId={teamId} teamName={teamName} logoUrl={logoUrl} matches={sortedMatches} />

      <View style={styles.tabBar}>
        {CLUB_TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, isActive && styles.activeTabBtn]}
              onPress={() => handleTabChange(t.key)}
            >
              <AppIcon name={t.icon} size={13} color={isActive ? '#00E676' : '#777'} />
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#00E676" style={{ marginTop: 30 }} />
        ) : activeTab === 'MATCHES' ? (
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToAnchorPosition}
            onScrollBeginDrag={() => {
              userScrolledRef.current = true;
            }}
          >
            {sortedMatches.length === 0 ? (
              <Text style={styles.emptyText}>Chưa có dữ liệu trận đấu cho CLB này.</Text>
            ) : (
              sortedMatches.map((item, index) => {
                const isAnchor = index === anchorIndex;
                return (
                  <View
                    key={String(item.event_id || item.id || index)}
                    onLayout={isAnchor ? handleAnchorLayout : undefined}
                  >
                    {isAnchor && anchorLabel ? (
                      <View style={styles.timelineDivider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>{anchorLabel}</Text>
                        <View style={styles.dividerLine} />
                      </View>
                    ) : null}
                    <MatchCard item={item} onPress={() => onSelectMatch(item)} />
                  </View>
                );
              })
            )}
          </ScrollView>
        ) : activeTab === 'STATS' ? (
          <ClubStatsTab matches={sortedMatches} teamId={teamId} teamName={teamName} />
        ) : (
          <ClubSquadTab
            matches={sortedMatches}
            teamId={teamId}
            teamName={teamName}
            onSelectPlayer={onSelectPlayer}
          />
        )}
      </View>
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
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 72 },
  backText: { fontSize: 14, color: '#00E676', fontWeight: '600' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', flex: 1, textAlign: 'center' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 12,
    marginTop: 10,
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262626',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 7,
  },
  activeTabBtn: { backgroundColor: '#282828' },
  tabText: { fontSize: 11.5, color: '#777', fontWeight: '600' },
  activeTabText: { color: '#00E676', fontWeight: '700' },
  content: { flex: 1, paddingHorizontal: 12, paddingTop: 12 },
  list: { paddingBottom: 320 },
  timelineDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#2A2A2A' },
  dividerText: { fontSize: 10, fontWeight: '800', color: '#00E676', letterSpacing: 0.8 },
  emptyText: { textAlign: 'center', color: '#777777', marginTop: 30, fontSize: 13 },
});