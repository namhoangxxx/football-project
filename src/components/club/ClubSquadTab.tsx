import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import {
    ClubPlayerItem,
    fetchClubSquadFromLineups,
    PlayerPositionCode,
} from '../../services/clubStatsService';
import { Match } from '../../types/football';

interface ClubSquadTabProps {
  matches: Match[];
  teamName: string;
}

const POS_META: Record<PlayerPositionCode, { label: string; color: string }> = {
  GK: { label: 'Thủ môn', color: '#FFD600' },
  CB: { label: 'Trung vệ', color: '#38BDF8' },
  LB: { label: 'Hậu vệ trái', color: '#38BDF8' },
  RB: { label: 'Hậu vệ phải', color: '#38BDF8' },
  CDM: { label: 'Tiền vệ phòng ngự', color: '#00E676' },
  CM: { label: 'Tiền vệ trung tâm', color: '#00E676' },
  RM: { label: 'Tiền vệ phải', color: '#00E676' },
  LM: { label: 'Tiền vệ trái', color: '#00E676' },
  AM: { label: 'Tiền vệ tấn công', color: '#00E676' },
  CF: { label: 'Trung phong', color: '#FF5252' },
  RF: { label: 'Tiền đạo phải', color: '#FF5252' },
  LF: { label: 'Tiền đạo trái', color: '#FF5252' },
};

const POS_ORDER: PlayerPositionCode[] = [
  'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'RM', 'LM', 'AM', 'CF', 'RF', 'LF',
];

export const ClubSquadTab: React.FC<ClubSquadTabProps> = ({ matches, teamName }) => {
  const [players, setPlayers] = useState<ClubPlayerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchClubSquadFromLineups(matches, teamName)
      .then((list) => {
        if (isMounted) setPlayers(list);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [matches, teamName]);

  const sortedPlayers = useMemo(
    () =>
      [...players].sort(
        (a, b) =>
          POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) ||
          b.appearances - a.appearances ||
          a.number - b.number
      ),
    [players]
  );

  if (loading) {
    return <ActivityIndicator size="small" color="#00E676" style={{ marginTop: 30 }} />;
  }

  return (
    <FlatList
      data={sortedPlayers}
      keyExtractor={(item) => `${item.id}-${item.name}`}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Text style={styles.emptyText}>Chưa có dữ liệu đội hình các trận gần đây của CLB.</Text>
      }
      renderItem={({ item }) => {
        const meta = POS_META[item.pos];
        return (
          <View style={styles.row}>
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
          </View>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
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