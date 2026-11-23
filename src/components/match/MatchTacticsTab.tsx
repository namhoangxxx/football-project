import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Match } from '../../types/football';
import { MatchEventItem, MatchStats, TeamLineup } from '../../types/matchDetail';
import { MatchTeamIdentities, TeamSide } from '../../types/tactical';
import { shareMatchTacticalReport } from '../../utils/shareReport';
import { generateMatchTacticalReport } from '../../utils/tactical';
import { AppIcon } from '../common/AppIcon';
import { BoxEntryPitch } from '../tactics/BoxEntryPitch';
import { DefensiveMapPitch } from '../tactics/DefensiveMapPitch';
import { HeatmapPitch } from '../tactics/HeatmapPitch';
import { MomentumChart } from '../tactics/MomentumChart';
import { PassingSonarChart } from '../tactics/PassingSonarChart';
import { PassNetworkPitch } from '../tactics/PassNetworkPitch';
import { ShotmapPitch } from '../tactics/ShotmapPitch';
import { TacticalComparisonCard } from '../tactics/TacticalComparisonCard';
import { ThreatMatrixPitch } from '../tactics/ThreatMatrixPitch';

interface MatchTacticsTabProps {
  match: Match;
  stats: MatchStats | null;
  events: MatchEventItem[];
  lineups: TeamLineup[];
  teamIdentities?: MatchTeamIdentities;
}

type ChartCategory = 'ALL' | 'ATTACK' | 'PASSING' | 'DEFENSE';

const CATEGORIES: Array<{ key: ChartCategory; label: string }> = [
  { key: 'ALL', label: 'Tất cả (7)' },
  { key: 'ATTACK', label: 'Tấn công & xG' },
  { key: 'PASSING', label: 'Chuyền bóng' },
  { key: 'DEFENSE', label: 'Pressing & Nhiệt' },
];

export const MatchTacticsTab: React.FC<MatchTacticsTabProps> = ({
  match,
  stats,
  events,
  lineups,
  teamIdentities,
}) => {
  const [selectedSide, setSelectedSide] = useState<TeamSide>('HOME');
  const [category, setCategory] = useState<ChartCategory>('ALL');

  const report = useMemo(
    () => generateMatchTacticalReport(match, stats, events, lineups, teamIdentities),
    [match, stats, events, lineups, teamIdentities]
  );

  const activeProfile = selectedSide === 'HOME' ? report.home : report.away;

  return (
    <View>
      <TouchableOpacity
        style={styles.shareBanner}
        activeOpacity={0.75}
        onPress={() => shareMatchTacticalReport(match, report)}
      >
        <AppIcon name="zap" size={14} color="#00E676" />
        <Text style={styles.shareText}>Báo cáo Chiến thuật</Text>
      </TouchableOpacity>

      <TacticalComparisonCard home={report.home} away={report.away} insights={report.storyInsights} />
      <MomentumChart data={report.momentum} homeName={match.home_team} awayName={match.away_team} />

      <View style={styles.teamSwitcher}>
        {(['HOME', 'AWAY'] as TeamSide[]).map((side) => {
          const active = selectedSide === side;
          const label = side === 'HOME' ? match.home_team : match.away_team;
          return (
            <TouchableOpacity
              key={side}
              style={[styles.switchBtn, active && styles.activeSwitchBtn]}
              onPress={() => setSelectedSide(side)}
            >
              <AppIcon name={side === 'HOME' ? 'home' : 'plane'} size={13} color={active ? '#121212' : '#999'} />
              <Text style={[styles.switchText, active && styles.activeSwitchText]} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.kpiRow}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiValue}>{activeProfile.xgTotal.toFixed(2)}</Text>
          <Text style={styles.kpiLabel}>Bàn thắng kỳ vọng (xG)</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={[styles.kpiValue, { color: '#FF5252' }]}>+{activeProfile.xtTotal.toFixed(2)}</Text>
          <Text style={styles.kpiLabel}>Mối đe dọa (xT)</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={[styles.kpiValue, { color: '#38BDF8' }]}>{activeProfile.ppda}</Text>
          <Text style={styles.kpiLabel}>Pressing (PPDA)</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
        {CATEGORIES.map((c) => {
          const active = category === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              style={[styles.catChip, active && styles.activeCatChip]}
              onPress={() => setCategory(c.key)}
            >
              <Text style={[styles.catText, active && styles.activeCatText]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {(category === 'ALL' || category === 'ATTACK') && (
        <>
          <ShotmapPitch teamName={activeProfile.teamName} shots={activeProfile.shots} xgTotal={activeProfile.xgTotal} />
          <ThreatMatrixPitch teamName={activeProfile.teamName} grid={activeProfile.xtGrid} xtTotal={activeProfile.xtTotal} />
          <BoxEntryPitch teamName={activeProfile.teamName} entries={activeProfile.boxEntries} />
        </>
      )}

      {(category === 'ALL' || category === 'PASSING') && (
        <>
          <PassNetworkPitch teamName={activeProfile.teamName} network={activeProfile.passNetwork} />
          <PassingSonarChart teamName={activeProfile.teamName} bins={activeProfile.sonarBins} />
        </>
      )}

      {(category === 'ALL' || category === 'DEFENSE') && (
        <>
          <DefensiveMapPitch teamName={activeProfile.teamName} actions={activeProfile.defensiveActions} ppda={activeProfile.ppda} pressingStyle={activeProfile.pressingStyle} />
          <HeatmapPitch teamName={activeProfile.teamName} zones={activeProfile.heatmapZones} fieldTilt={activeProfile.fieldTilt} />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  shareBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderWidth: 1,
    borderColor: '#00E676',
    borderRadius: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  shareText: { color: '#00E676', fontSize: 12, fontWeight: '700' },
  teamSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  switchBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeSwitchBtn: { backgroundColor: '#00E676' },
  switchText: { color: '#999', fontSize: 12, fontWeight: '700', flexShrink: 1 },
  activeSwitchText: { color: '#121212' },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  kpiBox: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#262626',
  },
  kpiValue: { color: '#00E676', fontSize: 16, fontWeight: '800' },
  kpiLabel: { color: '#888', fontSize: 9.5, marginTop: 3, textAlign: 'center' },
  catScroll: { marginBottom: 12 },
  catChip: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#282828',
  },
  activeCatChip: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  catText: { color: '#94A3B8', fontSize: 11.5, fontWeight: '600' },
  activeCatText: { color: '#121212', fontWeight: '700' },
});