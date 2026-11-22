import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Match } from '../types/football';
import { MatchEventItem, MatchStats, TeamLineup } from '../types/matchDetail';
import { MatchTeamIdentities, TeamSide } from '../types/tactical';
import { generateMatchTacticalReport } from '../utils/tacticalAnalyticsEngine';
import { BoxEntryPitch } from './tactics/BoxEntryPitch';
import { DefensiveMapPitch } from './tactics/DefensiveMapPitch';
import { HeatmapPitch } from './tactics/HeatmapPitch';
import { MomentumChart } from './tactics/MomentumChart';
import { PassingSonarChart } from './tactics/PassingSonarChart';
import { PassNetworkPitch } from './tactics/PassNetworkPitch';
import { ShotmapPitch } from './tactics/ShotmapPitch';
import { ThreatMatrixPitch } from './tactics/ThreatMatrixPitch';

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
      {/* 1. Biểu đồ Momentum 90 phút của cả 2 đội */}
      <MomentumChart
        data={report.momentum}
        homeName={match.home_team}
        awayName={match.away_team}
      />

      {/* Bộ chọn đội nhà / đội khách cho 7 bản đồ sân cỏ bên dưới */}
      <View style={styles.teamSwitcher}>
        <TouchableOpacity
          style={[styles.switchBtn, selectedSide === 'HOME' && styles.activeSwitchBtn]}
          onPress={() => setSelectedSide('HOME')}
        >
          <Text
            style={[styles.switchText, selectedSide === 'HOME' && styles.activeSwitchText]}
            numberOfLines={1}
          >
            🏠 {match.home_team}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.switchBtn, selectedSide === 'AWAY' && styles.activeSwitchBtn]}
          onPress={() => setSelectedSide('AWAY')}
        >
          <Text
            style={[styles.switchText, selectedSide === 'AWAY' && styles.activeSwitchText]}
            numberOfLines={1}
          >
            ✈️ {match.away_team}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Thanh tóm tắt 3 chỉ số nâng cao (xG - xT - PPDA) */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiValue}>{activeProfile.xgTotal.toFixed(2)}</Text>
          <Text style={styles.kpiLabel}>Bàn thắng kỳ vọng (xG)</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={[styles.kpiValue, { color: '#FF5252' }]}>
            +{activeProfile.xtTotal.toFixed(2)}
          </Text>
          <Text style={styles.kpiLabel}>Mối đe dọa (xT)</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={[styles.kpiValue, { color: '#38BDF8' }]}>
            {activeProfile.ppda}
          </Text>
          <Text style={styles.kpiLabel}>Cường độ Pressing (PPDA)</Text>
        </View>
      </View>

      {/* 2. Bản đồ Sút bóng & xG */}
      <ShotmapPitch
        teamName={activeProfile.teamName}
        shots={activeProfile.shots}
        xgTotal={activeProfile.xgTotal}
      />

      {/* 3. Mạng lưới Chuyền bóng */}
      <PassNetworkPitch
        teamName={activeProfile.teamName}
        network={activeProfile.passNetwork}
      />

      {/* 4. Ma trận Mối đe dọa xT 12x8 */}
      <ThreatMatrixPitch
        teamName={activeProfile.teamName}
        grid={activeProfile.xtGrid}
        xtTotal={activeProfile.xtTotal}
      />

      {/* 5. Bản đồ Nhiệt & Kiểm soát 3 khu vực */}
      <HeatmapPitch
        teamName={activeProfile.teamName}
        zones={activeProfile.heatmapZones}
        fieldTilt={activeProfile.fieldTilt}
      />

      {/* 6. Biểu đồ Hướng chuyền 360° */}
      <PassingSonarChart
        teamName={activeProfile.teamName}
        bins={activeProfile.sonarBins}
      />

      {/* 7. Bản đồ Tranh chấp & PPDA */}
      <DefensiveMapPitch
        teamName={activeProfile.teamName}
        actions={activeProfile.defensiveActions}
        ppda={activeProfile.ppda}
        pressingStyle={activeProfile.pressingStyle}
      />

      {/* 8. Bản đồ Tạt bóng & Xâm nhập vòng cấm */}
      <BoxEntryPitch
        teamName={activeProfile.teamName}
        entries={activeProfile.boxEntries}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  teamSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeSwitchBtn: {
    backgroundColor: '#00E676',
  },
  switchText: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeSwitchText: {
    color: '#121212',
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  kpiValue: {
    color: '#00E676',
    fontSize: 16,
    fontWeight: 'bold',
  },
  kpiLabel: {
    color: '#999999',
    fontSize: 9.5,
    marginTop: 3,
    textAlign: 'center',
  },
});