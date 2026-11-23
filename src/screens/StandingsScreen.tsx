import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StandingsTableRow } from '../components/standings/StandingsTableRow';
import {
  fetchLeagueStandings,
  STANDINGS_LEAGUES,
} from '../services/standingsService';
import { StandingRow } from '../types/football';

export interface StandingsScreenProps {
  onSelectTeam?: (teamId: number, teamName: string, logoUrl?: string) => void;
}

export const StandingsScreen: React.FC<StandingsScreenProps> = ({ onSelectTeam }) => {
  const [selectedLeague, setSelectedLeague] = useState('PL');
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchLeagueStandings(selectedLeague).then((table) => {
      if (isMounted) {
        setStandings(table);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedLeague]);

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, styles.posCol]}>#</Text>
      <Text style={[styles.headerCell, styles.teamCol]}>Đội bóng</Text>
      <Text style={styles.headerCell}>ST</Text>
      <Text style={styles.headerCell}>T</Text>
      <Text style={styles.headerCell}>H</Text>
      <Text style={styles.headerCell}>B</Text>
      <Text style={[styles.headerCell, styles.gdCol]}>HS</Text>
      <Text style={[styles.headerCell, styles.ptsCol]}>Đ</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.leagueBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.leagueScroll}
        >
          {STANDINGS_LEAGUES.map((league) => {
            const isActive = selectedLeague === league.id;
            return (
              <TouchableOpacity
                key={league.id}
                style={[styles.leagueChip, isActive && styles.activeLeagueChip]}
                onPress={() => setSelectedLeague(league.id)}
              >
                <Text style={[styles.leagueText, isActive && styles.activeLeagueText]}>
                  {league.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#00E676" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={standings}
          keyExtractor={(item) => item.team.id.toString()}
          ListHeaderComponent={renderHeader}
          stickyHeaderIndices={[0]}
          renderItem={({ item }) => (
            <StandingsTableRow
              item={item}
              totalTeams={standings.length}
              isChampionsLeague={selectedLeague === 'CL'}
              onPress={() =>
                onSelectTeam?.(item.team.id, item.team.name, item.team.crest)
              }
            />
          )}
          ListFooterComponent={
            <View style={styles.legendFooter}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: '#00E676' }]} />
                <Text style={styles.legendText}>
                  {selectedLeague === 'CL' ? 'Vòng 1/8' : 'Champions League'}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: '#38BDF8' }]} />
                <Text style={styles.legendText}>
                  {selectedLeague === 'CL' ? 'Play-off' : 'Europa / Conference'}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: '#FF5252' }]} />
                <Text style={styles.legendText}>
                  {selectedLeague === 'CL' ? 'Bị loại' : 'Xuống hạng'}
                </Text>
              </View>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', marginTop: 8 },
  leagueBar: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#242424' },
  leagueScroll: { paddingHorizontal: 12 },
  leagueChip: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#282828',
  },
  activeLeagueChip: { backgroundColor: '#00E676', borderColor: '#00E676' },
  leagueText: { fontSize: 11.5, fontWeight: '600', color: '#999999' },
  activeLeagueText: { color: '#121212', fontWeight: '700' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    paddingVertical: 9,
    paddingLeft: 10,
    paddingRight: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#777777', textAlign: 'center', width: 25 },
  posCol: { width: 22 },
  teamCol: { flex: 1, textAlign: 'left', paddingLeft: 4 },
  gdCol: { width: 30 },
  ptsCol: { width: 32, color: '#00E676' },
  legendFooter: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#888888', fontSize: 11 },
});