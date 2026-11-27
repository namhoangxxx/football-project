import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ClubPlayerItem, fetchClubSquadFromLineups } from '../../services/clubStatsService';
import { Match } from '../../types/football';
import { PlayerPositionCode, POS_META, POS_ORDER, PositionGroup } from '../../utils/playerPosition';

export interface SelectedPlayerPayload {
  id: number;
  name: string;
  number: number;
  pos: PlayerPositionCode;
  teamName: string;
  photoUrl?: string;
  nationality?: string;
  age?: number;
}

interface ClubSquadTabProps {
  matches: Match[];
  teamId?: number;
  teamName: string;
  onSelectPlayer: (player: SelectedPlayerPayload) => void;
}

const FILTER_CHIPS: Array<{ key: PositionGroup; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'GK', label: 'Thủ môn' },
  { key: 'DEF', label: 'Hậu vệ' },
  { key: 'MID', label: 'Tiền vệ' },
  { key: 'FWD', label: 'Tiền đạo' },
];

export const ClubSquadTab: React.FC<ClubSquadTabProps> = ({
  matches,
  teamId,
  teamName,
  onSelectPlayer,
}) => {
  const [players, setPlayers] = useState<ClubPlayerItem[]>([]);
  const [groupFilter, setGroupFilter] = useState<PositionGroup>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchClubSquadFromLineups(matches, teamName, teamId)
      .then((list) => isMounted && setPlayers(list))
      .finally(() => isMounted && setLoading(false));
    return () => {
      isMounted = false;
    };
  }, [matches, teamName, teamId]);

  const groupCounts = useMemo(() => {
    const counts: Record<PositionGroup, number> = {
      ALL: players.length,
      GK: 0,
      DEF: 0,
      MID: 0,
      FWD: 0,
    };
    players.forEach((p) => {
      const grp = (POS_META[p.pos] || POS_META.CM).group;
      counts[grp] += 1;
    });
    return counts;
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return [...players]
      .filter((p) => {
        if (groupFilter === 'ALL') return true;
        const grp = (POS_META[p.pos] || POS_META.CM).group;
        return grp === groupFilter;
      })
      .sort(
        (a, b) =>
          POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) ||
          b.appearances - a.appearances ||
          a.number - b.number
      );
  }, [players, groupFilter]);

  if (loading) {
    return <ActivityIndicator size="small" color="#00E676" style={{ marginTop: 30 }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {FILTER_CHIPS.map((chip) => {
            const isActive = groupFilter === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                style={[styles.chip, isActive && styles.activeChip]}
                onPress={() => setGroupFilter(chip.key)}
              >
                <Text style={[styles.chipText, isActive && styles.activeChipText]}>
                  {chip.label} ({groupCounts[chip.key]})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredPlayers}
        keyExtractor={(item) => `${item.id}-${item.name}`}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>Chưa có dữ liệu cầu thủ.</Text>}
        renderItem={({ item }) => {
          const meta = POS_META[item.pos] || POS_META.CM;
          return (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.75}
              onPress={() =>
                onSelectPlayer({
                  id: item.id,
                  name: item.name,
                  number: item.number,
                  pos: item.pos,
                  teamName,
                  photoUrl: item.photoUrl,
                  nationality: item.nationality,
                  age: item.age,
                })
              }
            >
              <View style={styles.numBadge}>
                <Text style={styles.numText}>{item.number || '-'}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.posRow}>
                  <View style={[styles.posTag, { borderColor: meta.color }]}>
                    <Text style={[styles.posCode, { color: meta.color }]}>{item.pos}</Text>
                  </View>
                  <Text style={styles.posLabel}>{meta.label}</Text>
                </View>
              </View>
              <View style={styles.appBadge}>
                <Text style={styles.appText}>{item.appearances} trận</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  filterBar: { marginBottom: 10 },
  chip: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 7,
    borderWidth: 1,
    borderColor: '#282828',
  },
  activeChip: { backgroundColor: '#00E676', borderColor: '#00E676' },
  chipText: { color: '#999', fontSize: 11.5, fontWeight: '600' },
  activeChipText: { color: '#121212', fontWeight: '700' },
  list: { paddingBottom: 24 },
  emptyText: { textAlign: 'center', color: '#777', marginTop: 30, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 11,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#262626',
  },
  numBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  numText: { color: '#00E676', fontSize: 12, fontWeight: '800' },
  info: { flex: 1 },
  name: { color: '#F8FAFC', fontSize: 13.5, fontWeight: '600' },
  posRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  posTag: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  posCode: { fontSize: 9.5, fontWeight: '800' },
  posLabel: { color: '#888', fontSize: 11 },
  appBadge: { backgroundColor: '#242424', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  appText: { color: '#CBD5E1', fontSize: 11, fontWeight: '600' },
});