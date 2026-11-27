import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { filterPlayersPool } from '../../services/playerPoolService';
import { PlayerAnalyticsProfile, PlayerRadarAxes } from '../../types/playerAnalytics';
import { normalizePositionCode, POS_META, PositionGroup } from '../../utils/playerPosition';
import { isSamePlayer } from '../../utils/textNormalize';
import { AppIcon } from '../common/AppIcon';
import { PlayerRadarChart } from './PlayerRadarChart';

interface PlayerCompareTabProps {
  primary: PlayerAnalyticsProfile;
  pool: PlayerAnalyticsProfile[];
  initialOpponentId?: string;
}

type TacticalGroup = Exclude<PositionGroup, 'ALL'>;

const NEUTRAL_COMPARE_ROWS: Array<{ key: keyof PlayerRadarAxes; label: string }> = [
  { key: 'shooting', label: 'Dứt điểm & xG' },
  { key: 'creativity', label: 'Kiến tạo & Cơ hội' },
  { key: 'passing', label: 'Chuyền bóng' },
  { key: 'dribbling', label: 'Rê bóng 1v1' },
  { key: 'defending', label: 'Phòng ngự & Thu hồi' },
  { key: 'discipline', label: 'Kỷ luật chiến thuật' },
];

const COMPARE_ROWS_BY_GROUP: Record<TacticalGroup, Array<{ key: keyof PlayerRadarAxes; label: string }>> = {
  GK: [
    { key: 'defending', label: 'Phản xạ & Cản phá' },
    { key: 'passing', label: 'Phát động bóng' },
    { key: 'creativity', label: 'Phân phối bóng dài' },
    { key: 'dribbling', label: 'Xử lý bóng bằng chân' },
    { key: 'discipline', label: 'Tâm lý & Kỷ luật' },
    { key: 'shooting', label: 'Phát bóng lực mạnh' },
  ],
  DEF: [
    { key: 'defending', label: 'Phòng ngự & Tranh chấp' },
    { key: 'passing', label: 'Triển khai bóng tuyến dưới' },
    { key: 'dribbling', label: 'Thoát pressing & Giữ bóng' },
    { key: 'creativity', label: 'Hỗ trợ biên & Tạt bóng' },
    { key: 'shooting', label: 'Không chiến & Cố định' },
    { key: 'discipline', label: 'Kỷ luật & Bọc lót' },
  ],
  MID: [
    { key: 'passing', label: 'Chuyền bóng & Điều tiết' },
    { key: 'creativity', label: 'Kiến thiết & Mở khóa' },
    { key: 'defending', label: 'Thu hồi & Đánh chặn' },
    { key: 'dribbling', label: 'Kéo bóng & Thoát vây' },
    { key: 'shooting', label: 'Sút xa & Xâm nhập tuyến hai' },
    { key: 'discipline', label: 'Kỷ luật chiến thuật' },
  ],
  FWD: [
    { key: 'shooting', label: 'Dứt điểm & xG' },
    { key: 'creativity', label: 'Kiến tạo & Cơ hội' },
    { key: 'dribbling', label: 'Rê bóng & Đột phá 1v1' },
    { key: 'passing', label: 'Chuyền liên kết' },
    { key: 'defending', label: 'Pressing tầm cao' },
    { key: 'discipline', label: 'Kỷ luật chiến thuật' },
  ],
};

const GROUP_SHORT_LABEL: Record<TacticalGroup, string> = {
  GK: 'Thủ môn',
  DEF: 'Hậu vệ',
  MID: 'Tiền vệ',
  FWD: 'Tiền đạo',
};

export const PlayerCompareTab: React.FC<PlayerCompareTabProps> = ({
  primary,
  pool,
  initialOpponentId,
}) => {
  const [query, setQuery] = useState('');
  const [posFilter, setPosFilter] = useState<string>('SAME');
  const [selectedId, setSelectedId] = useState<string>(initialOpponentId || '');

  const primaryPos = normalizePositionCode(primary.pos);
  const primaryGroup = POS_META[primaryPos].group;
  const isPrimaryGK = primaryGroup === 'GK';

  useEffect(() => {
    if (!initialOpponentId) return;
    setSelectedId(initialOpponentId);
    setQuery('');

    const target = pool.find((p) => p.id === initialOpponentId);
    if (!target) return;
    const tPos = normalizePositionCode(target.pos);
    const tGroup = POS_META[tPos].group;

    if (tPos === primaryPos) setPosFilter('SAME');
    else if (tGroup === primaryGroup) setPosFilter('GROUP');
    else setPosFilter('ALL');
  }, [initialOpponentId, pool, primaryPos, primaryGroup]);

  const posFilters = useMemo(() => {
    if (isPrimaryGK) {
      return [
        { key: 'SAME', label: 'Thủ môn (GK)' },
        { key: 'ALL', label: 'Tất cả' },
      ];
    }
    return [
      { key: 'SAME', label: `Cùng vị trí (${primaryPos})` },
      { key: 'GROUP', label: `Cùng tuyến (${GROUP_SHORT_LABEL[primaryGroup]})` },
      { key: 'ALL', label: 'Tất cả' },
      { key: 'FWD', label: 'Tiền đạo' },
      { key: 'MID', label: 'Tiền vệ' },
      { key: 'DEF', label: 'Hậu vệ' },
      { key: 'GK', label: 'Thủ môn' },
    ];
  }, [isPrimaryGK, primaryPos, primaryGroup]);

  const candidates = useMemo(() => {
    const others = pool.filter((p) => !isSamePlayer(p, primary));
    const targetFilter =
      posFilter === 'SAME'
        ? primaryPos
        : posFilter === 'GROUP'
        ? primaryGroup
        : posFilter;

    let filtered = filterPlayersPool(others, query, targetFilter);

    if (filtered.length === 0 && posFilter === 'SAME' && !query.trim()) {
      filtered = filterPlayersPool(others, query, primaryGroup);
    }

    const sortByDefOrRating =
      isPrimaryGK || primaryGroup === 'DEF' || primaryPos === 'CDM';

    return filtered
      .sort((a, b) => {
        if (sortByDefOrRating) {
          return (
            b.seasonRating - a.seasonRating ||
            b.appearances - a.appearances ||
            b.goals + b.assists - (a.goals + a.assists)
          );
        }
        return (
          b.goals + b.assists - (a.goals + a.assists) ||
          b.seasonRating - a.seasonRating ||
          b.appearances - a.appearances
        );
      })
      .slice(0, 80);
  }, [pool, primary, primaryPos, primaryGroup, isPrimaryGK, query, posFilter]);

  const opponent = useMemo(
    () =>
      candidates.find((c) => c.id === selectedId) ||
      (selectedId
        ? pool.find((p) => p.id === selectedId && !isSamePlayer(p, primary))
        : undefined) ||
      candidates[0],
    [candidates, selectedId, pool, primary]
  );

  const displayedCandidates = useMemo(() => {
    if (!opponent || candidates.some((c) => c.id === opponent.id)) {
      return candidates;
    }
    return [opponent, ...candidates];
  }, [candidates, opponent]);

  const opponentPos = opponent ? normalizePositionCode(opponent.pos) : null;
  const opponentGroup = opponentPos ? POS_META[opponentPos].group : null;

  const sharedGroup: TacticalGroup | undefined =
    !opponentGroup || opponentGroup === primaryGroup ? primaryGroup : undefined;

  const compareRows = sharedGroup
    ? COMPARE_ROWS_BY_GROUP[sharedGroup]
    : NEUTRAL_COMPARE_ROWS;

  const formatCandidateSummary = (cand: PlayerAnalyticsProfile): string => {
    const cPos = normalizePositionCode(cand.pos);
    const cGroup = POS_META[cPos].group;
    if (cGroup === 'GK' || cGroup === 'DEF' || cPos === 'CDM') {
      return `${cPos} • ${cand.appearances} trận • ${cand.seasonRating.toFixed(1)}`;
    }
    return `${cPos} • ${cand.goals}G/${cand.assists}A`;
  };

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
        {posFilters.map((pf) => {
          const active = posFilter === pf.key;
          return (
            <TouchableOpacity
              key={pf.key}
              style={[styles.posChip, active && styles.activePosChip]}
              onPress={() => setPosFilter(pf.key)}
            >
              <Text style={[styles.posText, active && styles.activePosText]}>{pf.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {displayedCandidates.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {displayedCandidates.map((cand) => {
            const active = opponent?.id === cand.id;
            return (
              <TouchableOpacity
                key={cand.id}
                style={[styles.chip, active && styles.activeChip]}
                onPress={() => setSelectedId(cand.id)}
              >
                <Text style={[styles.chipText, active && styles.activeChipText]}>
                  {cand.name} • {cand.teamName} ({formatCandidateSummary(cand)})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.emptyText}>Không tìm thấy cầu thủ phù hợp với bộ lọc hiện tại.</Text>
      )}

      <PlayerRadarChart
        primaryName={primary.name}
        primaryRadar={primary.radar}
        secondaryName={opponent?.name}
        secondaryRadar={opponent?.radar}
        positionGroup={sharedGroup}
      />

      {opponent && opponentPos && (
        <View style={styles.table}>
          <View style={styles.matchupHeader}>
            <View style={styles.sideCol}>
              <Text style={[styles.playerTag, styles.winGreen]} numberOfLines={1}>
                {primary.name}
              </Text>
              <Text style={styles.subMeta}>
                {primaryPos} • Điểm {primary.seasonRating.toFixed(1)}
              </Text>
            </View>
            <Text style={styles.vsLabel}>VS</Text>
            <View style={[styles.sideCol, styles.rightCol]}>
              <Text style={[styles.playerTag, styles.winRed]} numberOfLines={1}>
                {opponent.name}
              </Text>
              <Text style={styles.subMeta}>
                {opponentPos} • Điểm {opponent.seasonRating.toFixed(1)}
              </Text>
            </View>
          </View>

          {compareRows.map((row) => {
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
  posScroll: { marginBottom: 8 },
  posChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#131313',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#252525',
  },
  activePosChip: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  posText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  activePosText: { color: '#121212', fontWeight: '700' },
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
  emptyText: { color: '#64748B', fontSize: 12, textAlign: 'center', marginVertical: 10 },
  table: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#262626', paddingTop: 10 },
  matchupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  sideCol: { flex: 1 },
  rightCol: { alignItems: 'flex-end' },
  playerTag: { fontSize: 12.5, fontWeight: '700' },
  subMeta: { color: '#94A3B8', fontSize: 10.5, marginTop: 2 },
  vsLabel: { color: '#64748B', fontSize: 11, fontWeight: '800', marginHorizontal: 8 },
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