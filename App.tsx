import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  ListRenderItem,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SelectedPlayerPayload } from './src/components/club/ClubSquadTab';
import { AppIcon } from './src/components/common/AppIcon';
import { MatchCard } from './src/components/common/MatchCard';
import { HomeHeaderTabs, HomeTabType } from './src/components/home/HomeHeaderTabs';
import { MatchFilterBar } from './src/components/home/MatchFilterBar';
import { PlayerSearchModal } from './src/components/player/PlayerSearchModal';
import { LEAGUE_FILTERS } from './src/constants/leagues';
import { ClubDetailScreen } from './src/screens/ClubDetailScreen';
import { MatchDetailScreen } from './src/screens/MatchDetailScreen';
import { PlayerDetailScreen } from './src/screens/PlayerDetailScreen';
import { StandingsScreen } from './src/screens/StandingsScreen';
import { fetchMatchesFromSupabase } from './src/services/footballApi';
import { fetchAllPlayersAnalyticsPool } from './src/services/playerPoolService';
import { getFullSeasonMatches } from './src/services/seasonHistoryService';
import { Match } from './src/types/football';
import { matchesSearchTokens } from './src/utils/textNormalize';

const LIVE_STATUSES = new Set(['IN_PLAY', 'PAUSED', 'HALFTIME']);

export default function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [seasonMatches, setSeasonMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<HomeTabType>('FINISHED');
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [playerSearchOpen, setPlayerSearchOpen] = useState(false);

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedClub, setSelectedClub] = useState<{
    teamId: number;
    teamName: string;
    logoUrl?: string;
  } | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<SelectedPlayerPayload | null>(null);

  useEffect(() => {
    const onHardwareBackPress = () => {
      if (playerSearchOpen) {
        setPlayerSearchOpen(false);
        return true;
      }
      if (selectedPlayer) {
        setSelectedPlayer(null);
        return true;
      }
      if (selectedMatch) {
        setSelectedMatch(null);
        return true;
      }
      if (selectedClub) {
        setSelectedClub(null);
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
    return () => sub.remove();
  }, [playerSearchOpen, selectedPlayer, selectedMatch, selectedClub]);

  const loadMatches = useCallback(async (isPullRefresh = false) => {
    try {
      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await fetchMatchesFromSupabase();
      const list = data || [];
      setMatches(list);

      getFullSeasonMatches(list).then((full) => {
        if (full.length > 0) {
          setSeasonMatches(full);
          fetchAllPlayersAnalyticsPool(full);
        }
      });
    } catch (error) {
      console.error('Lỗi lấy dữ liệu trận đấu:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMatches(false);
  }, [loadMatches]);

  const fullMatchesPool = useMemo(
    () => (seasonMatches.length > 0 ? seasonMatches : matches),
    [seasonMatches, matches]
  );

  const liveCount = useMemo(
    () => matches.filter((m) => LIVE_STATUSES.has(m.status)).length,
    [matches]
  );

  const filteredMatches = useMemo(() => {
    const activeFilter = LEAGUE_FILTERS.find((f) => f.key === selectedLeague);

    return matches.filter((match) => {
      const isLive = LIVE_STATUSES.has(match.status);
      const isUpcoming = match.status === 'SCHEDULED' || match.status === 'TIMED';
      const isFinished = match.status === 'FINISHED';

      if (activeTab === 'LIVE' && !isLive) return false;
      if (activeTab === 'UPCOMING' && !isUpcoming) return false;
      if (activeTab === 'FINISHED' && !isFinished) return false;

      if (activeFilter && activeFilter.keywords.length > 0) {
        const leagueLower = String(match.league || '').toLowerCase();
        if (!activeFilter.keywords.some((kw) => leagueLower.includes(kw))) return false;
      }

      if (searchQuery.trim().length > 0) {
        if (
          !matchesSearchTokens(
            [String(match.home_team || ''), String(match.away_team || '')],
            searchQuery
          )
        ) {
          return false;
        }
      }

      return true;
    });
  }, [matches, activeTab, selectedLeague, searchQuery]);

  const keyExtractor = useCallback(
    (item: Match) => String(item.event_id || item.id),
    []
  );

  const renderMatchItem: ListRenderItem<Match> = useCallback(
    ({ item }) => <MatchCard item={item} onPress={() => setSelectedMatch(item)} />,
    []
  );

  const handleRefresh = useCallback(() => {
    loadMatches(true);
  }, [loadMatches]);

  const renderScreen = () => {
    if (selectedPlayer) {
      return (
        <PlayerDetailScreen
          playerName={selectedPlayer.name}
          teamName={selectedPlayer.teamName}
          number={selectedPlayer.number}
          pos={selectedPlayer.pos}
          allMatches={fullMatchesPool}
          onBack={() => setSelectedPlayer(null)}
        />
      );
    }

    if (selectedMatch) {
      return (
        <MatchDetailScreen
          match={selectedMatch}
          allMatches={fullMatchesPool}
          onBack={() => setSelectedMatch(null)}
          onSelectClub={(teamId, teamName, logoUrl) => {
            setSelectedMatch(null);
            setSelectedClub({ teamId, teamName, logoUrl });
          }}
          onSelectPlayer={(player) => setSelectedPlayer(player)}
        />
      );
    }

    if (selectedClub) {
      return (
        <ClubDetailScreen
          teamId={selectedClub.teamId}
          teamName={selectedClub.teamName}
          logoUrl={selectedClub.logoUrl}
          onBack={() => setSelectedClub(null)}
          onSelectMatch={(match) => setSelectedMatch(match)}
          onSelectPlayer={(player) => setSelectedPlayer(player)}
        />
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        <HomeHeaderTabs
          activeTab={activeTab}
          liveCount={liveCount}
          onSelectTab={setActiveTab}
        />

        <TouchableOpacity
          style={styles.playerSearchTrigger}
          activeOpacity={0.75}
          onPress={() => setPlayerSearchOpen(true)}
        >
          <AppIcon name="jersey" size={15} color="#00E676" />
          <Text style={styles.playerSearchText}>Tra cứu & So sánh Cầu thủ toàn giải...</Text>
          <AppIcon name="search" size={14} color="#64748B" />
        </TouchableOpacity>

        {activeTab === 'STANDINGS' ? (
          <StandingsScreen
            onSelectTeam={(teamId, teamName, logoUrl) =>
              setSelectedClub({ teamId, teamName, logoUrl })
            }
          />
        ) : (
          <>
            <MatchFilterBar
              searchQuery={searchQuery}
              onChangeSearch={setSearchQuery}
              selectedLeague={selectedLeague}
              onSelectLeague={setSelectedLeague}
            />

            {loading ? (
              <ActivityIndicator size="large" color="#00E676" style={styles.loader} />
            ) : (
              <FlatList
                data={filteredMatches}
                keyExtractor={keyExtractor}
                renderItem={renderMatchItem}
                contentContainerStyle={styles.listContainer}
                onRefresh={handleRefresh}
                refreshing={refreshing}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={7}
                removeClippedSubviews
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    Không tìm thấy trận đấu phù hợp với bộ lọc hiện tại.
                  </Text>
                }
              />
            )}
          </>
        )}

        <PlayerSearchModal
          visible={playerSearchOpen}
          allMatches={fullMatchesPool}
          onClose={() => setPlayerSearchOpen(false)}
          onSelectPlayer={(p) => {
            setPlayerSearchOpen(false);
            setSelectedPlayer({
              id: Number(String(p.id).replace(/\D/g, '')) || 0,
              name: p.name,
              teamName: p.teamName,
              number: p.number,
              pos: p.pos,
            });
          }}
        />
      </SafeAreaView>
    );
  };

  return <SafeAreaProvider>{renderScreen()}</SafeAreaProvider>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  playerSearchTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1A1A1A',
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262626',
  },
  playerSearchText: { flex: 1, color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  loader: { marginTop: 40 },
  listContainer: { padding: 12 },
  emptyText: { color: '#777777', textAlign: 'center', marginTop: 40, fontSize: 13 },
});