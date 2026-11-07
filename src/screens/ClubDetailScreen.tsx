import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchClubMatchesFromSupabase } from '../services/footballApi';
import { Match } from '../types/football';

interface ClubDetailProps {
  teamName: string;
  logoUrl?: string;
  onBack: () => void;
  onSelectMatch: (match: Match) => void;
}

export const ClubDetailScreen: React.FC<ClubDetailProps> = ({
  teamName,
  logoUrl,
  onBack,
  onSelectMatch,
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadClubData();
  }, [teamName]);

  const loadClubData = async () => {
    setLoading(true);
    try {
      const data = await fetchClubMatchesFromSupabase(teamName);
      setMatches(data || []);
    } catch (error) {
      console.error('Lỗi tải dữ liệu trận đấu của CLB:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMatchItem = ({ item }: { item: Match }) => {
    const isFinished = item.status === 'FINISHED';

    const matchDate = item.match_time
      ? new Date(item.match_time).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Chưa xếp lịch';

    return (
      <TouchableOpacity
        style={styles.matchCard}
        activeOpacity={0.6}
        onPress={() => {
          console.log('Đã bấm vào trận:', item.home_team, 'vs', item.away_team);
          onSelectMatch(item);
        }}
      >
        <Text style={styles.leagueText} pointerEvents="none">
          {item.league || 'Giải đấu'}
        </Text>

        <View style={styles.matchRow} pointerEvents="none">
          <View style={styles.teamContainer}>
            {item.home_icon ? (
              <Image source={{ uri: item.home_icon }} style={styles.miniLogo} />
            ) : null}
            <Text
              style={[
                styles.teamNameText,
                item.home_team === teamName && styles.highlightTeam,
              ]}
              numberOfLines={1}
            >
              {item.home_team}
            </Text>
          </View>

          <View style={styles.scoreContainer}>
            {isFinished ? (
              <Text style={styles.scoreText}>
                {item.home_score ?? 0} - {item.away_score ?? 0}
              </Text>
            ) : (
              <Text style={styles.timeText}>{matchDate}</Text>
            )}
            <Text style={styles.statusBadge}>{item.status}</Text>
          </View>

          <View style={styles.teamContainer}>
            {item.away_icon ? (
              <Image source={{ uri: item.away_icon }} style={styles.miniLogo} />
            ) : null}
            <Text
              style={[
                styles.teamNameText,
                item.away_team === teamName && styles.highlightTeam,
              ]}
              numberOfLines={1}
            >
              {item.away_team}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
          {teamName}
        </Text>
        <View style={{ width: 70 }} />
      </View>

      <View style={styles.profileHeader}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.clubLogo} />
        ) : (
          <View style={[styles.clubLogo, styles.logoPlaceholder]}>
            <Text style={styles.logoText}>{teamName.charAt(0)}</Text>
          </View>
        )}
        <Text style={styles.clubTitle}>{teamName}</Text>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.sectionTitle}>Lịch thi đấu & Kết quả</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={matches}
            keyExtractor={(item, index) =>
              item.event_id
                ? item.event_id.toString()
                : item.id
                ? item.id.toString()
                : index.toString()
            }
            renderItem={renderMatchItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Chưa có dữ liệu trận đấu.</Text>
            }
          />
        )}
      </View>
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
    zIndex: 10,
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
    textAlign: 'center',
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  clubLogo: {
    width: 64,
    height: 64,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  logoPlaceholder: {
    backgroundColor: '#E9ECEF',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6C757D',
  },
  clubTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#343A40',
    marginBottom: 10,
  },
  listContainer: {
    paddingBottom: 20,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
    zIndex: 1,
  },
  leagueText: {
    fontSize: 11,
    color: '#868E96',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamContainer: {
    flex: 1,
    alignItems: 'center',
  },
  miniLogo: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  teamNameText: {
    fontSize: 12,
    color: '#495057',
    textAlign: 'center',
  },
  highlightTeam: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  scoreContainer: {
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212529',
  },
  timeText: {
    fontSize: 11,
    color: '#495057',
  },
  statusBadge: {
    fontSize: 10,
    color: '#868E96',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#868E96',
    marginTop: 30,
  },
});