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
import { StandingRow } from '../types/football';

const FOOTBALL_API_KEY = '35d5e00fd47d4770895bcf02b6e76d0b';

const TOP_LEAGUES = [
  { id: 'PL', name: 'Premier League' },
  { id: 'PD', name: 'La Liga' },
  { id: 'SA', name: 'Serie A' },
  { id: 'BL1', name: 'Bundesliga' },
  { id: 'FL1', name: 'Ligue 1' },
];

export interface StandingsScreenProps {
  onSelectTeam?: (teamName: string, logoUrl?: string) => void;
}

export const StandingsScreen: React.FC<StandingsScreenProps> = ({ onSelectTeam }) => {
  const [selectedLeague, setSelectedLeague] = useState('PL');
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStandings = async (leagueCode: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.football-data.org/v4/competitions/${leagueCode}/standings`,
        {
          headers: {
            'X-Auth-Token': FOOTBALL_API_KEY,
          },
        }
      );
      const data = await response.json();
      if (data.standings && data.standings.length > 0) {
        setStandings(data.standings[0].table || []);
      }
    } catch (error) {
      console.error('Lỗi lấy bảng xếp hạng:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStandings(selectedLeague);
  }, [selectedLeague]);

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, styles.posCol]}>#</Text>
      <Text style={[styles.headerCell, styles.teamCol]}>Đội bóng</Text>
      <Text style={styles.headerCell}>P</Text>
      <Text style={styles.headerCell}>W</Text>
      <Text style={styles.headerCell}>D</Text>
      <Text style={styles.headerCell}>L</Text>
      <Text style={[styles.headerCell, styles.ptsCol]}>PTS</Text>
    </View>
  );

  const renderItem = ({ item }: { item: StandingRow }) => (
    <TouchableOpacity
      style={styles.tableRow}
      activeOpacity={0.7}
      onPress={() => onSelectTeam && onSelectTeam(item.team.name, item.team.crest)}
    >
      <Text style={[styles.cell, styles.posCol, styles.posText]}>{item.position}</Text>
      <View style={[styles.cell, styles.teamCol, styles.teamInfo]}>
        {item.team.crest ? (
          <Image source={{ uri: item.team.crest }} style={styles.crest} />
        ) : null}
        <Text style={styles.teamName} numberOfLines={1}>
          {item.team.name}
        </Text>
      </View>
      <Text style={styles.cell}>{item.playedGames}</Text>
      <Text style={styles.cell}>{item.won}</Text>
      <Text style={styles.cell}>{item.draw}</Text>
      <Text style={styles.cell}>{item.lost}</Text>
      <Text style={[styles.cell, styles.ptsCol, styles.ptsText]}>{item.points}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.leagueSelector}>
        {TOP_LEAGUES.map((league) => (
          <TouchableOpacity
            key={league.id}
            style={[
              styles.leagueTab,
              selectedLeague === league.id && styles.activeLeagueTab,
            ]}
            onPress={() => setSelectedLeague(league.id)}
          >
            <Text
              style={[
                styles.leagueTabText,
                selectedLeague === league.id && styles.activeLeagueTabText,
              ]}
            >
              {league.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={standings}
          keyExtractor={(item) => item.team.id.toString()}
          ListHeaderComponent={renderHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

export default StandingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  leagueSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  leagueTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 6,
  },
  activeLeagueTab: {
    backgroundColor: '#007AFF',
  },
  leagueTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#495057',
  },
  activeLeagueTabText: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#E9ECEF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  headerCell: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#495057',
    textAlign: 'center',
    width: 30,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  cell: {
    fontSize: 13,
    color: '#212529',
    textAlign: 'center',
    width: 30,
  },
  posCol: {
    width: 26,
  },
  posText: {
    fontWeight: 'bold',
    color: '#6C757D',
  },
  teamCol: {
    flex: 1,
    width: 'auto',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 6,
  },
  crest: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    marginRight: 8,
  },
  teamName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#212529',
    flex: 1,
  },
  ptsCol: {
    width: 36,
  },
  ptsText: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
});