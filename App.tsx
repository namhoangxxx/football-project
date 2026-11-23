import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MatchCard } from './src/components/common/MatchCard';
import { HomeHeaderTabs, HomeTabType } from './src/components/home/HomeHeaderTabs';
import { MatchFilterBar } from './src/components/home/MatchFilterBar';
import { LEAGUE_FILTERS } from './src/constants/leagues';
import { ClubDetailScreen } from './src/screens/ClubDetailScreen';
import { MatchDetailScreen } from './src/screens/MatchDetailScreen';
import { StandingsScreen } from './src/screens/StandingsScreen';
import { fetchMatchesFromSupabase } from './src/services/footballApi';
import { Match } from './src/types/football';

export default function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<HomeTabType>('FINISHED');
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedClub, setSelectedClub] = useState<{
    teamId: number;
    teamName: string;
    logoUrl?: string;
  } | null>(null);

  // Xử lý nút Back vật lý trên Android
  useEffect(() => {
    const onHardwareBackPress = () => {
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
  }, [selectedMatch, selectedClub]);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const data = await fetchMatchesFromSupabase();
      setMatches(data || []);
    } catch (error) {
      console.error('Lỗi lấy dữ liệu trận đấu:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const liveCount = useMemo(
    () =>
      matches.filter(
        (m) => m.status === 'IN_PLAY' || m.status === 'PAUSED' || m.status === 'HALFTIME'
      ).length,
    [matches]
  );

  const filteredMatches = useMemo(() => {
    const activeFilter = LEAGUE_FILTERS.find((f) => f.key === selectedLeague);
    const q = searchQuery.trim().toLowerCase();

    return matches.filter((match) => {
      const isLive =
        match.status === 'IN_PLAY' || match.status === 'PAUSED' || match.status === 'HALFTIME';
      const isUpcoming = match.status === 'SCHEDULED' || match.status === 'TIMED';
      const isFinished = match.status === 'FINISHED';

      if (activeTab === 'LIVE' && !isLive) return false;
      if (activeTab === 'UPCOMING' && !isUpcoming) return false;
      if (activeTab === 'FINISHED' && !isFinished) return false;

      if (activeFilter && activeFilter.keywords.length > 0) {
        const leagueLower = String(match.league || '').toLowerCase();
        if (!activeFilter.keywords.some((kw) => leagueLower.includes(kw))) return false;
      }

      if (q.length > 0) {
        const home = String(match.home_team || '').toLowerCase();
        const away = String(match.away_team || '').toLowerCase();
        if (!home.includes(q) && !away.includes(q)) return false;
      }

      return true;
    });
  }, [matches, activeTab, selectedLeague, searchQuery]);

  if (selectedMatch) {
    return (
      <MatchDetailScreen
        match={selectedMatch}
        onBack={() => setSelectedMatch(null)}
        onSelectClub={(teamId, teamName, logoUrl) => {
          setSelectedMatch(null);
          setSelectedClub({ teamId, teamName, logoUrl });
        }}
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
      />
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        <HomeHeaderTabs
          activeTab={activeTab}
          liveCount={liveCount}
          onSelectTab={setActiveTab}
        />

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
              <ActivityIndicator size="large" color="#00E676" style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={filteredMatches}
                keyExtractor={(item) => String(item.event_id || item.id)}
                renderItem={({ item }) => (
                  <MatchCard item={item} onPress={() => setSelectedMatch(item)} />
                )}
                contentContainerStyle={styles.listContainer}
                onRefresh={loadMatches}
                refreshing={loading}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    Không tìm thấy trận đấu phù hợp với bộ lọc hiện tại.
                  </Text>
                }
              />
            )}
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  listContainer: { padding: 12 },
  emptyText: { color: '#777777', textAlign: 'center', marginTop: 40, fontSize: 13 },
});