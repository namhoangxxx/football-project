import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PlayerAnalyticsProfile, PlayerRadarAxes } from '../../types/playerAnalytics';
import { AppIcon } from '../common/AppIcon';
import { PlayerRadarChart } from './PlayerRadarChart';

interface PlayerCompareTabProps {
  primary: PlayerAnalyticsProfile;
  pool: PlayerAnalyticsProfile[];
}

const COMPARE_ROWS: Array<{ key: keyof PlayerRadarAxes; label: string }> = [
  { key: 'shooting', label: 'Dứt điểm & xG' },
  { key: 'creativity', label: 'Kiến tạo & Cơ hội' },
  { key: 'passing', label: 'Chuyền bóng' },
  { key: 'dribbling', label: 'Rê bóng 1v1' },
  { key: 'defending', label: 'Phòng ngự & Thu hồi' },
  { key: 'discipline', label: 'Kỷ luật chiến thuật' },
];

export const PlayerCompareTab: React.FC<PlayerCompareTabProps> = ({ primary, pool }) => {
  const [query, setQuery] = useState('');

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    const others = pool.filter((p) => p.id !== primary.id);
    if (!q) {
      const samePos = others.filter((p) => p.pos === primary.pos);
      const rest = others.filter((p) => p.pos !== primary.pos);
      return [...samePos, ...rest].slice(0, 25);
    }
    return others
      .filter((p) => p.name.toLowerCase().includes(q) || p.teamName.toLowerCase().includes(q))
      .slice(0, 25);
  }, [pool, primary.id, primary.pos, query]);

  const [selectedId, setSelectedId] = useState<string>('');

  const opponent = useMemo(
    () => candidates.find((c) => c.id === selectedId) || candidates[0],
    [candidates, selectedId]
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>So sánh Biểu đồ Ra-đa 6 chiều ({pool.length} cầu thủ)</Text>

      <View style={styles.searchBox}>
        <AppIcon name="search" size={14} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm cầu thủ hoặc CLB để so sánh..."
          placeholderTextColor="#64748B"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {candidates.map((cand) => {
          const active = opponent?.id === cand.id;
          return (
            <TouchableOpacity
              key={cand.id}
              style={[styles.chip, active && styles.activeChip]}
              onPress={() => setSelectedId(cand.id)}
            >
              <Text style={[styles.chipText, active && styles.activeChipText]}>
                {cand.name} ({cand.pos})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <PlayerRadarChart
        primaryName={primary.name}
        primaryRadar={primary.radar}
        secondaryName={opponent?.name}
        secondaryRadar={opponent?.radar}
      />

      {opponent && (
        <View style={styles.table}>
          {COMPARE_ROWS.map((row) => {
            const v1 = primary.radar[row.key];
            const v2 = opponent.radar[row.key];
            return (
              <View key={row.key} style={styles.row}>
                <Text style={[styles.val, v1 >= v2 && styles.winGreen]}>{v1}</Text>
                <Text style={styles.axisLabel}>{row.label}</Text>
                <Text style={[styles.val, v2 > v1 && styles.winRed]}>{v2}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262626',
  },
  title: { color: '#FFF', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131313',
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 8,
    gap: 6,
  },
  searchInput: { flex: 1, height: 34, color: '#FFF', fontSize: 12 },
  chipScroll: { marginBottom: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#131313',
    borderWidth: 1,
    borderColor: '#2B2B2B',
    marginRight: 8,
  },
  activeChip: { borderColor: '#FF5252', backgroundColor: 'rgba(255, 82, 82, 0.14)' },
  chipText: { color: '#94A3B8', fontSize: 11.5, fontWeight: '600' },
  activeChipText: { color: '#FF5252', fontWeight: '700' },
  table: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#262626', paddingTop: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  axisLabel: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
  val: { color: '#94A3B8', fontSize: 13, fontWeight: '700', width: 36, textAlign: 'center' },
  winGreen: { color: '#00E676' },
  winRed: { color: '#FF5252' },
});