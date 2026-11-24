import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchAllPlayersAnalyticsPool, filterPlayersPool } from '../../services/playerPoolService';
import { Match } from '../../types/football';
import { PlayerAnalyticsProfile } from '../../types/playerAnalytics';
import { AppIcon } from '../common/AppIcon';

interface PlayerSearchModalProps {
  visible: boolean;
  allMatches: Match[];
  onClose: () => void;
  onSelectPlayer: (player: PlayerAnalyticsProfile) => void;
}

const POSITIONS = ['ALL', 'FW', 'MF', 'DF', 'GK'];

export const PlayerSearchModal: React.FC<PlayerSearchModalProps> = ({
  visible,
  allMatches,
  onClose,
  onSelectPlayer,
}) => {
  const [pool, setPool] = useState<PlayerAnalyticsProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState('ALL');

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    setLoading(true);
    fetchAllPlayersAnalyticsPool(allMatches).then((data) => {
      if (mounted) {
        setPool(data);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [visible, allMatches]);

  const results = useMemo(() => {
    return filterPlayersPool(pool, query, pos)
      .sort((a, b) => b.goals + b.assists - (a.goals + a.assists) || b.seasonRating - a.seasonRating)
      .slice(0, 150);
  }, [pool, query, pos]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Tra cứu Cầu thủ ({pool.length})</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <AppIcon name="close" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <AppIcon name="search" size={16} color="#64748B" />
          <TextInput
            style={styles.input}
            placeholder="Nhập tên cầu thủ, CLB (VD: Mbappe, Arsenal, Odegaard)..."
            placeholderTextColor="#64748B"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <AppIcon name="close" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.posRow}>
          {POSITIONS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.posChip, pos === p && styles.activePos]}
              onPress={() => setPos(p)}
            >
              <Text style={[styles.posText, pos === p && styles.activePosText]}>
                {p === 'ALL' ? 'Tất cả' : p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#00E676" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() => {
                  onClose();
                  onSelectPlayer(item);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {item.name} <Text style={styles.posTag}>({item.pos})</Text>
                  </Text>
                  <Text style={styles.sub}>
                    {item.teamName} • {item.appearances} trận • {item.goals} bàn, {item.assists} KT
                  </Text>
                </View>
                <View style={styles.ratingBox}>
                  <Text style={styles.rating}>{item.seasonRating.toFixed(1)}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#242424' },
  title: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  closeBtn: { padding: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', margin: 12, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2A2A2A', gap: 8 },
  input: { flex: 1, height: 40, color: '#FFF', fontSize: 13.5 },
  posRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 4 },
  posChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#282828' },
  activePos: { backgroundColor: '#00E676', borderColor: '#00E676' },
  posText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  activePosText: { color: '#121212', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#242424' },
  name: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  posTag: { color: '#38BDF8', fontSize: 12 },
  sub: { color: '#94A3B8', fontSize: 11.5, marginTop: 3 },
  ratingBox: { backgroundColor: 'rgba(0, 230, 118, 0.14)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#00E676' },
  rating: { color: '#00E676', fontSize: 13, fontWeight: '800' },
});