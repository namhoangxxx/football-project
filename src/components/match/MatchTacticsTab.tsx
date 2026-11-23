import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Match } from '../../types/football';
import { MatchEventItem, MatchStats, TeamLineup } from '../../types/matchDetail';
import { MatchTeamIdentities, TeamSide } from '../../types/tactical';
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

export const MatchTacticsTab: React.FC<MatchTacticsTabProps> = ({
  match,
  stats,
  events,
  lineups,
  teamIdentities,
}) => {
  const [selectedSide, setSelectedSide] = useState<TeamSide>('HOME');

  const report = useMemo(
    () => generateMatchTacticalReport(match, stats, events, lineups, teamIdentities),
    [match, stats, events, lineups, teamIdentities]
  );

  const activeProfile = selectedSide === 'HOME' ? report.home : report.away;

  return (
    <View>
      <TacticalComparisonCard home={report.home} away={report.away} insights={report.storyInsights} />
      <MomentumChart data={report.momentum} homeName={match.home_team} awayName={match.away_team} />

      <View style={styles.teamSwitcher}>
        <TouchableOpacity
          style={[styles.switchBtn, selectedSide === 'HOME' && styles.activeSwitchBtn]}
          onPress={() => setSelectedSide('HOME')}
        >
          <AppIcon name="home" size={13} color={selectedSide === 'HOME' ? '#121212' : '#999'} />
          <Text
            style={[styles.switchText, selectedSide === 'HOME' && styles.activeSwitchText]}
            numberOfLines={1}
          >
            {match.home_team}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.switchBtn, selectedSide === 'AWAY' && styles.activeSwitchBtn]}
          onPress={() => setSelectedSide('AWAY')}
        >
          <AppIcon name="plane" size={13} color={selectedSide === 'AWAY' ? '#121212' : '#999'} />
          <Text
            style={[styles.switchText, selectedSide === 'AWAY' && styles.activeSwitchText]}
            numberOfLines={1}
          >
            {match.away_team}
          </Text>
        </TouchableOpacity>
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

      <ShotmapPitch teamName={activeProfile.teamName} shots={activeProfile.shots} xgTotal={activeProfile.xgTotal} />
      <PassNetworkPitch teamName={activeProfile.teamName} network={activeProfile.passNetwork} />
      <ThreatMatrixPitch teamName={activeProfile.teamName} grid={activeProfile.xtGrid} xtTotal={activeProfile.xtTotal} />
      <HeatmapPitch teamName={activeProfile.teamName} zones={activeProfile.heatmapZones} fieldTilt={activeProfile.fieldTilt} />
      <PassingSonarChart teamName={activeProfile.teamName} bins={activeProfile.sonarBins} />
      <DefensiveMapPitch teamName={activeProfile.teamName} actions={activeProfile.defensiveActions} ppda={activeProfile.ppda} pressingStyle={activeProfile.pressingStyle} />
      <BoxEntryPitch teamName={activeProfile.teamName} entries={activeProfile.boxEntries} />
    </View>
  );
};

const styles = StyleSheet.create({
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
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
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
});