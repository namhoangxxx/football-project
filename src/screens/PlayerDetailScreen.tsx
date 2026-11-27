import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../components/common/AppIcon';
import { PlayerCompareTab } from '../components/player/PlayerCompareTab';
import { PlayerHeroHeader } from '../components/player/PlayerHeroHeader';
import { PlayerOverviewTab } from '../components/player/PlayerOverviewTab';
import { usePlayerAnalytics } from '../hooks/usePlayerAnalytics';
import { resolveOfficialPlayerPosition } from '../services/clubStatsService';
import { fetchAllPlayersAnalyticsPool } from '../services/playerPoolService';
import { Match } from '../types/football';
import { PlayerAnalyticsProfile } from '../types/playerAnalytics';
import { findSimilarPlayers } from '../utils/playerInsights';
import { normalizePositionCode, PlayerPositionCode } from '../utils/playerPosition';
import { sharePlayerAnalyticsReport } from '../utils/shareReport';

interface PlayerDetailProps {
  playerName: string;
  teamName: string;
  number?: number;
  pos?: string;
  allMatches: Match[];
  onBack: () => void;
}

type PlayerTab = 'OVERVIEW' | 'COMPARE' | 'SIMILAR';

export const PlayerDetailScreen: React.FC<PlayerDetailProps> = ({
  playerName,
  teamName,
  number = 0,
  pos = 'CM',
  allMatches,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<PlayerTab>('OVERVIEW');
  const [compareTargetId, setCompareTargetId] = useState<string>('');
  const [realPool, setRealPool] = useState<PlayerAnalyticsProfile[]>([]);
  const [officialPos, setOfficialPos] = useState<PlayerPositionCode | null>(null);

  useEffect(() => {
    let isMounted = true;
    setOfficialPos(null);
    setCompareTargetId('');
    resolveOfficialPlayerPosition(undefined, playerName, teamName).then((resolvedPos) => {
      if (isMounted) setOfficialPos(resolvedPos);
    });
    return () => {
      isMounted = false;
    };
  }, [playerName, teamName]);

  const effectivePos = officialPos || normalizePositionCode(pos);

  const { profile, summary, loading } = usePlayerAnalytics({
    playerName,
    teamName,
    number,
    pos: effectivePos,
    allMatches,
  });

  const resolvedProfile: PlayerAnalyticsProfile = useMemo(
    () => ({
      ...profile,
      pos: officialPos || normalizePositionCode(profile.pos || pos),
      number: profile.number || number,
    }),
    [profile, officialPos, pos, number]
  );

  useEffect(() => {
    let isMounted = true;
    fetchAllPlayersAnalyticsPool(allMatches).then((pool) => {
      if (isMounted) setRealPool(pool);
    });
    return () => {
      isMounted = false;
    };
  }, [allMatches]);

  const comparisonPool = useMemo(() => {
    const others = realPool.filter((p) => p.id !== resolvedProfile.id);
    return [resolvedProfile, ...others];
  }, [resolvedProfile, realPool]);

  const similarPlayers = useMemo(
    () => findSimilarPlayers(resolvedProfile, comparisonPool, 6),
    [resolvedProfile, comparisonPool]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <AppIcon name="back" size={18} color="#00E676" />
          <Text style={styles.backText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Hồ sơ Cầu thủ</Text>
        <TouchableOpacity
          style={styles.shareBtn}
          activeOpacity={0.75}
          onPress={() => sharePlayerAnalyticsReport(resolvedProfile)}
        >
          <AppIcon name="zap" size={16} color="#38BDF8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <PlayerHeroHeader
          name={resolvedProfile.name}
          teamName={resolvedProfile.teamName}
          number={resolvedProfile.number}
          pos={resolvedProfile.pos}
          nationality={summary?.nationality}
          age={summary?.age}
          height={summary?.height}
          photoUrl={summary?.photoUrl}
        />

        <View style={styles.tabBar}>
          {[
            { key: 'OVERVIEW', label: 'Tổng quan' },
            { key: 'COMPARE', label: 'So sánh Radar' },
            { key: 'SIMILAR', label: 'Tương đồng' },
          ].map((t) => {
            const active = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, active && styles.activeTabBtn]}
                onPress={() => setActiveTab(t.key as PlayerTab)}
              >
                <Text style={[styles.tabText, active && styles.activeTabText]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#00E676" style={{ marginTop: 24 }} />
        ) : activeTab === 'OVERVIEW' ? (
          <PlayerOverviewTab profile={resolvedProfile} recentMatches={summary?.recentMatches} />
        ) : activeTab === 'COMPARE' ? (
          <PlayerCompareTab
            primary={resolvedProfile}
            pool={comparisonPool}
            initialOpponentId={compareTargetId}
          />
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Cầu thủ tương đồng từ dữ liệu giải ({similarPlayers.length})
            </Text>
            {similarPlayers.map((item) => (
              <TouchableOpacity
                key={item.profile.id}
                style={styles.simRow}
                activeOpacity={0.75}
                onPress={() => {
                  setCompareTargetId(item.profile.id);
                  setActiveTab('COMPARE');
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.simName}>
                    {item.profile.name} ({normalizePositionCode(item.profile.pos)})
                  </Text>
                  <Text style={styles.simSub}>
                    {item.profile.teamName} • Nổi bật: {item.sharedStrength}
                  </Text>
                </View>
                <View style={styles.simBadge}>
                  <Text style={styles.simScore}>{item.similarity}%</Text>
                </View>
              </TouchableOpacity>
            ))}
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
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 72 },
  backText: { fontSize: 14, color: '#00E676', fontWeight: '600' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', flex: 1, textAlign: 'center' },
  shareBtn: { width: 72, alignItems: 'flex-end' },
  scrollContent: { padding: 12, paddingBottom: 30 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    padding: 4,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 7 },
  activeTabBtn: { backgroundColor: '#282828' },
  tabText: { fontSize: 12, color: '#777', fontWeight: '600' },
  activeTabText: { color: '#00E676', fontWeight: '700' },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262626',
  },
  cardTitle: { color: '#FFF', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  simRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  simName: { color: '#FFF', fontSize: 13.5, fontWeight: '700' },
  simSub: { color: '#94A3B8', fontSize: 11.5, marginTop: 2 },
  simBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderWidth: 1,
    borderColor: '#00E676',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  simScore: { color: '#00E676', fontSize: 12.5, fontWeight: '800' },
});