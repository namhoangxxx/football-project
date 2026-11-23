import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LEAGUE_FILTERS } from '../../constants/leagues';
import { AppIcon } from '../common/AppIcon';

interface MatchFilterBarProps {
  searchQuery: string;
  onChangeSearch: (text: string) => void;
  selectedLeague: string;
  onSelectLeague: (leagueKey: string) => void;
}

export const MatchFilterBar: React.FC<MatchFilterBarProps> = ({
  searchQuery,
  onChangeSearch,
  selectedLeague,
  onSelectLeague,
}) => {
  return (
    <>
      <View style={styles.searchWrapper}>
        <AppIcon name="search" size={15} color="#666666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm nhanh đội bóng (vd: Arsenal, Real Madrid)..."
          placeholderTextColor="#666666"
          value={searchQuery}
          onChangeText={onChangeSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onChangeSearch('')} style={styles.clearBtn}>
            <AppIcon name="close" size={14} color="#888888" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.leagueBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.leagueScrollContent}
        >
          {LEAGUE_FILTERS.map((lg) => {
            const isActive = selectedLeague === lg.key;
            return (
              <TouchableOpacity
                key={lg.key}
                style={[styles.leagueChip, isActive && styles.activeLeagueChip]}
                onPress={() => onSelectLeague(lg.key)}
              >
                <Text style={[styles.leagueChipText, isActive && styles.activeLeagueChipText]}>
                  {lg.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#262626',
    gap: 8,
  },
  searchInput: { flex: 1, height: 38, color: '#FFFFFF', fontSize: 12.5 },
  clearBtn: { padding: 4 },
  leagueBarWrapper: { marginTop: 8, marginBottom: 4 },
  leagueScrollContent: { paddingHorizontal: 12, paddingVertical: 4 },
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
  leagueChipText: { color: '#999999', fontSize: 11.5, fontWeight: '600' },
  activeLeagueChipText: { color: '#121212', fontWeight: '700' },
});