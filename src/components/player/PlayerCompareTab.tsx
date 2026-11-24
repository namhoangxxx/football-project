import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { filterPlayersPool } from '../../services/playerPoolService';
import { PlayerAnalyticsProfile, PlayerRadarAxes } from '../../types/playerAnalytics';
import { isSamePlayer } from '../../utils/textNormalize';
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

const POS_FILTERS = ['SAME', 'ALL', 'FW', 'MF', 'DF', 'GK'];

export const PlayerCompareTab: React.FC<PlayerCompareTabProps> = ({ primary, pool }) => {
  const [query, setQuery] = useState('');
  const [posFilter, setPosFilter] = useState<string>('SAME');
  const [selectedId, setSelectedId] = useState<string>('');

  const candidates = useMemo(() => {
    const others = pool.filter((p) => !isSamePlayer(p, primary));
    const targetPos = posFilter === 'SAME' ? primary.pos : posFilter;
    return filterPlayersPool(others, query, targetPos)
      .sort((a, b) => b.goals + b.assists - (a.goals + a.assists) || b.seasonRating - a.seasonRating)
      .slice(0, 80);
  }, [pool, primary, query, posFilter]);

  const opponent = useMemo(
    () => candidates.find((c) => c.id === selectedId) || candidates[0],
    [candidates, selectedId]
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>So sánh Ra-đa 6 chiều ({pool.length} cầu thủ DB)</Text>

      <View style={styles.searchBox}>
        <AppIcon name="search" size={14} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm tên cầu thủ, CLB (hỗ trợ không dấu)..."
          placeholderTextColor="#64748B"
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <AppIcon name="close" size={14} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.posScroll}>
        {POS_FILTERS.map((pf) => {
          const active = posFilter === pf;
          const label = pf === 'SAME' ? `Cùng vị trí (${primary.pos})` : pf === 'ALL' ? 'Tất cả' : pf;
          return (
            <TouchableOpacity
              key={pf}
              style={[styles.posChip, active && styles.activePosChip]}
              onPress={() => setPosFilter(pf)}
            >
              <Text style={[styles.posText, active && styles.activePosText]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
                {cand.name} • {cand.teamName} ({cand.goals}G/{cand.assists}A)
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
  card: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#262626' },
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
  posScroll: { marginBottom: 8 },
  posChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#131313', marginRight: 6, borderWidth: 1, borderColor: '#252525' },
  activePosChip: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  posText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  activePosText: { color: '#121212', fontWeight: '700' },
  chipScroll: { marginBottom: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#131313', borderWidth: 1, borderColor: '#2B2B2B', marginRight: 8 },
  activeChip: { borderColor: '#FF5252', backgroundColor: 'rgba(255, 82, 82, 0.14)' },
  chipText: { color: '#94A3B8', fontSize: 11.5, fontWeight: '600' },
  activeChipText: { color: '#FF5252', fontWeight: '700' },
  table: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#262626', paddingTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#222' },
  axisLabel: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
  val: { color: '#94A3B8', fontSize: 13, fontWeight: '700', width: 36, textAlign: 'center' },
  winGreen: { color: '#00E676' },
  winRed: { color: '#FF5252' },
});