import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MatchCard } from './src/components/MatchCard';
import { ClubDetailScreen } from './src/screens/ClubDetailScreen';
import { MatchDetailScreen } from './src/screens/MatchDetailScreen';
import StandingsScreen from './src/screens/StandingsScreen';
import { fetchMatchesFromSupabase } from './src/services/footballApi';
import { Match } from './src/types/football';

type TabType = 'LIVE' | 'UPCOMING' | 'STANDINGS';

export default function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('LIVE');

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedClub, setSelectedClub] = useState<{ teamName: string; logoUrl?: string } | null>(null);

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

  const filteredMatches = matches.filter((match) => {
    if (activeTab === 'LIVE') return match.status === 'IN_PLAY' || match.status === 'PAUSED';
    if (activeTab === 'UPCOMING') return match.status === 'SCHEDULED' || match.status === 'TIMED';
    return true;
  });

  // ƯU TIÊN 1: Màn hình Chi tiết Trận đấu (Mở từ HomeScreen hoặc từ ClubDetailScreen)
  if (selectedMatch) {
    return (
      <MatchDetailScreen
        match={selectedMatch}
        onBack={() => setSelectedMatch(null)}
        onSelectClub={(teamName, logoUrl) => {
          setSelectedMatch(null); // Đóng trận đấu để xem CLB
          setSelectedClub({ teamName, logoUrl });
        }}
      />
    );
  }

  // ƯU TIÊN 2: Màn hình Chi tiết CLB
  if (selectedClub) {
    return (
      <ClubDetailScreen
        teamName={selectedClub.teamName}
        logoUrl={selectedClub.logoUrl}
        onBack={() => setSelectedClub(null)}
        onSelectMatch={(match) => setSelectedMatch(match)} // Chuyển sang selectedMatch
      />
    );
  }

  // MÀN HÌNH CHÍNH (3 Tab)
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Football Analytics ⚽</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'LIVE' && styles.activeTab]}
            onPress={() => setActiveTab('LIVE')}
          >
            <Text style={[styles.tabText, activeTab === 'LIVE' && styles.activeTabText]}>
              🔴 Trực tiếp
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'UPCOMING' && styles.activeTab]}
            onPress={() => setActiveTab('UPCOMING')}
          >
            <Text style={[styles.tabText, activeTab === 'UPCOMING' && styles.activeTabText]}>
              📅 Sắp diễn ra
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'STANDINGS' && styles.activeTab]}
            onPress={() => setActiveTab('STANDINGS')}
          >
            <Text style={[styles.tabText, activeTab === 'STANDINGS' && styles.activeTabText]}>
              🏆 BXH
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'STANDINGS' ? (
          <StandingsScreen onSelectTeam={(teamName, logoUrl) => setSelectedClub({ teamName, logoUrl })} />
        ) : loading ? (
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
              <Text style={styles.emptyText}>Hiện không có trận đấu nào ở mục này.</Text>
            }
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { height: 50, backgroundColor: '#1E1E1E', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#2C2C2C' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#1E1E1E', padding: 6, marginHorizontal: 12, marginTop: 10, borderRadius: 8 },
  tabButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: '#2C2C2C' },
  tabText: { fontSize: 13, color: '#888888', fontWeight: '600' },
  activeTabText: { color: '#00E676' },
  listContainer: { padding: 12 },
  emptyText: { color: '#888888', textAlign: 'center', marginTop: 40 },
});