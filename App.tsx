import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { fetchMatchesFromSupabase, Match } from './footballApi';

type TabType = 'LIVE' | 'UPCOMING';

export default function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('LIVE');

  const loadMatches = async () => {
    try {
      const data = await fetchMatchesFromSupabase();
      setMatches(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  // Lọc danh sách theo đúng status
  const filteredMatches = matches.filter((match) => {
    if (activeTab === 'LIVE') {
      return match.status === 'IN_PLAY' || match.status === 'PAUSED';
    }
    // Tab UPCOMING: Chỉ lấy các trận chưa đá (SCHEDULED / TIMED)
    return match.status === 'SCHEDULED' || match.status === 'TIMED';
  });

  // Định dạng Ngày/Giờ/Tháng cho các trận sắp đá
  const formatScheduledTime = (timeString?: string) => {
    if (!timeString) return 'Chưa xếp lịch';
    const date = new Date(timeString);
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    return `${hours}:${minutes} - ${day}/${month}`;
  };

  const renderMatchCard = ({ item }: { item: Match }) => {
    const isLive = item.status === 'IN_PLAY' || item.status === 'PAUSED';

    return (
      <View style={styles.card}>
        {item.league && <Text style={styles.leagueText}>{item.league}</Text>}
        
        <View style={styles.matchRow}>
          {/* Đội nhà */}
          <View style={styles.teamContainer}>
            {item.home_icon && <Image source={{ uri: item.home_icon }} style={styles.badge} />}
            <Text style={styles.teamName} numberOfLines={1}>{item.home_team}</Text>
          </View>

          {/* Tỉ số (Nếu LIVE) hoặc Ngày Giờ Tháng (Nếu SẮP ĐÁ) */}
          <View style={styles.scoreContainer}>
            {isLive ? (
              <>
                <Text style={[styles.scoreText, styles.liveScore]}>
                  {item.home_score ?? 0} - {item.away_score ?? 0}
                </Text>
                <Text style={styles.liveBadge}>🔴 LIVE</Text>
              </>
            ) : (
              <>
                <Text style={styles.scheduledTimeText}>
                  {formatScheduledTime(item.match_time)}
                </Text>
                <Text style={styles.statusBadge}>VS</Text>
              </>
            )}
          </View>

          {/* Đội khách */}
          <View style={styles.teamContainer}>
            {item.away_icon && <Image source={{ uri: item.away_icon }} style={styles.badge} />}
            <Text style={styles.teamName} numberOfLines={1}>{item.away_team}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Football Analytics ⚽</Text>
        </View>

        {/* 2 Navigation Tabs */}
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
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#00E676" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredMatches}
            keyExtractor={(item) => String(item.event_id || item.id)}
            renderItem={renderMatchCard}
            contentContainerStyle={styles.listContainer}
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
  header: { padding: 16, backgroundColor: '#1E1E1E', borderBottomWidth: 1, borderBottomColor: '#2C2C2C' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#1E1E1E', padding: 6, margin: 12, borderRadius: 10 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#2C2C2C' },
  tabText: { color: '#888', fontSize: 13, fontWeight: '600' },
  activeTabText: { color: '#00E676', fontWeight: 'bold' },
  listContainer: { paddingHorizontal: 12, paddingBottom: 12 },
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#2C2C2C' },
  leagueText: { color: '#888', fontSize: 11, fontWeight: '600', marginBottom: 10, textAlign: 'center', textTransform: 'uppercase' },
  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamContainer: { flex: 1, alignItems: 'center' },
  badge: { width: 32, height: 32, marginBottom: 6, resizeMode: 'contain' },
  teamName: { color: '#FFF', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  scoreContainer: { width: 110, alignItems: 'center' },
  scoreText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  liveScore: { color: '#00E676' },
  scheduledTimeText: { color: '#FFB74D', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  statusBadge: { color: '#888', fontSize: 10, fontWeight: 'bold', marginTop: 4 },
  liveBadge: { color: '#00E676', fontSize: 10, fontWeight: 'bold', marginTop: 4 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40, fontSize: 14 },
});