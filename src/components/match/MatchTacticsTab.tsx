import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Match } from '../../types/football';
import { MatchEventItem, MatchStats, TeamLineup } from '../../types/matchDetail';
import { MatchTeamIdentities, TeamSide } from '../../types/tactical';
import { shareMatchTacticalReport } from '../../utils/shareReport';
import { generateMatchTacticalReport } from '../../utils/tactical';
import { AppIcon, IconName } from '../common/AppIcon';
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

type TacticalSection = 'OVERVIEW' | 'ATTACK' | 'PASSING' | 'DEFENSE';

const SECTIONS: Array<{ key: TacticalSection; label: string; icon: IconName }> = [
  { key: 'OVERVIEW', label: 'Tổng quan', icon: 'brain' },
  { key: 'ATTACK', label: 'Tấn công', icon: 'target' },
  { key: 'PASSING', label: 'Chuyền bóng', icon: 'network' },
  { key: 'DEFENSE', label: 'Phòng ngự', icon: 'shield' },
];

export const MatchTacticsTab: React.FC<MatchTacticsTabProps> = ({
  match,
  stats,
  events,
  lineups,
  teamIdentities,
}) => {
  const [section, setSection] = useState<TacticalSection>('OVERVIEW');
  const [selectedSide, setSelectedSide] = useState<TeamSide>('HOME');

  const isScheduled =
    match.status === 'SCHEDULED' ||
    match.status === 'TIMED' ||
    match.status === 'NOT_STARTED';
  const hasRealMatchData = Boolean(stats) || events.length > 0;

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
        <Text style={styles.shareText}>Chia sẻ Báo cáo Chiến thuật</Text>
      </TouchableOpacity>

      {!hasRealMatchData && (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            {isScheduled
              ? 'Trận đấu chưa diễn ra — Hiển thị cấu trúc sơ đồ & mô hình dự phóng chiến thuật.'
              : 'Chưa đồng bộ đủ thống kê chi tiết — Biểu đồ được ước tính từ dữ liệu đội hình & kết quả trận.'}
          </Text>
        </View>
      )}

      {/* Thanh chia 4 ngăn chiến thuật */}
      <View style={styles.sectionBar}>
        {SECTIONS.map((item) => {
          const active = section === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.8}
              style={[styles.sectionTab, active && styles.activeSectionTab]}
              onPress={() => setSection(item.key)}
            >
              <AppIcon
                name={item.icon}
                size={14}
                color={active ? '#00E676' : '#888888'}
              />
              <Text
                style={[styles.sectionTabText, active && styles.activeSectionTabText]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Ngăn 1: Tổng quan & Diễn biến 2 đội */}
      {section === 'OVERVIEW' && (
        <>
          <TacticalComparisonCard
            home={report.home}
            away={report.away}
            insights={report.storyInsights}
          />
          {!isScheduled && (
            <MomentumChart
              data={report.momentum}
              homeName={match.home_team}
              awayName={match.away_team}
            />
          )}
        </>
      )}

      {/* Bộ chọn đội + KPI nhanh chỉ hiển thị ở 3 ngăn chuyên sâu từng đội */}
      {section !== 'OVERVIEW' && (
        <>
          <View style={styles.teamSwitcher}>
            {(['HOME', 'AWAY'] as TeamSide[]).map((side) => {
              const active = selectedSide === side;
              const isHome = side === 'HOME';
              const label = isHome ? match.home_team : match.away_team;
              const accentColor = isHome ? '#00E676' : '#FF5252';

              return (
                <TouchableOpacity
                  key={side}
                  activeOpacity={0.8}
                  style={[
                    styles.switchBtn,
                    active && {
                      backgroundColor: isHome
                        ? 'rgba(0, 230, 118, 0.14)'
                        : 'rgba(255, 82, 82, 0.14)',
                      borderColor: accentColor,
                    },
                  ]}
                  onPress={() => setSelectedSide(side)}
                >
                  <View style={[styles.teamDot, { backgroundColor: accentColor }]} />
                  <Text
                    style={[
                      styles.switchText,
                      active && { color: accentColor, fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.kpiRow}>
            <View
              style={[
                styles.kpiBox,
                section === 'ATTACK' && styles.kpiBoxHighlight,
              ]}
            >
              <Text style={styles.kpiValue}>{activeProfile.xgTotal.toFixed(2)}</Text>
              <Text style={styles.kpiLabel}>Bàn thắng kỳ vọng (xG)</Text>
            </View>
            <View
              style={[
                styles.kpiBox,
                section === 'ATTACK' && styles.kpiBoxHighlight,
              ]}
            >
              <Text style={[styles.kpiValue, { color: '#FF5252' }]}>
                +{activeProfile.xtTotal.toFixed(2)}
              </Text>
              <Text style={styles.kpiLabel}>Mối đe dọa (xT)</Text>
            </View>
            <View
              style={[
                styles.kpiBox,
                section === 'DEFENSE' && styles.kpiBoxHighlight,
              ]}
            >
              <Text style={[styles.kpiValue, { color: '#38BDF8' }]}>
                {activeProfile.ppda}
              </Text>
              <Text style={styles.kpiLabel}>Pressing (PPDA)</Text>
            </View>
          </View>
        </>
      )}

      {/* Ngăn 2: Tấn công & Dứt điểm */}
      {section === 'ATTACK' && (
        <>
          <ShotmapPitch
            teamName={activeProfile.teamName}
            shots={activeProfile.shots}
            xgTotal={activeProfile.xgTotal}
          />
          <ThreatMatrixPitch
            teamName={activeProfile.teamName}
            grid={activeProfile.xtGrid}
            xtTotal={activeProfile.xtTotal}
          />
          <BoxEntryPitch
            teamName={activeProfile.teamName}
            entries={activeProfile.boxEntries}
          />
        </>
      )}

      {/* Ngăn 3: Kiểm soát & Chuyền bóng */}
      {section === 'PASSING' && (
        <>
          <PassNetworkPitch
            teamName={activeProfile.teamName}
            network={activeProfile.passNetwork}
          />
          <PassingSonarChart
            teamName={activeProfile.teamName}
            bins={activeProfile.sonarBins}
          />
        </>
      )}

      {/* Ngăn 4: Phòng ngự & Lãnh thổ */}
      {section === 'DEFENSE' && (
        <>
          <DefensiveMapPitch
            teamName={activeProfile.teamName}
            actions={activeProfile.defensiveActions}
            ppda={activeProfile.ppda}
            pressingStyle={activeProfile.pressingStyle}
          />
          <HeatmapPitch
            teamName={activeProfile.teamName}
            zones={activeProfile.heatmapZones}
            fieldTilt={activeProfile.fieldTilt}
          />
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
    marginBottom: 10,
  },
  shareText: { color: '#00E676', fontSize: 12, fontWeight: '700' },
  noticeBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
  },
  noticeText: {
    color: '#93C5FD',
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
  },
  sectionBar: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262626',
    gap: 4,
  },
  sectionTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 7,
  },
  activeSectionTab: {
    backgroundColor: '#282828',
    borderWidth: 1,
    borderColor: '#363636',
  },
  sectionTabText: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '600',
  },
  activeSectionTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  teamSwitcher: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  switchBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1A1A',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#262626',
  },
  teamDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  switchText: {
    color: '#999999',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 6,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
  },
  kpiBoxHighlight: {
    borderColor: '#383838',
    backgroundColor: '#202020',
  },
  kpiValue: { color: '#00E676', fontSize: 16, fontWeight: '800' },
  kpiLabel: { color: '#888888', fontSize: 9.5, marginTop: 3, textAlign: 'center' },
});