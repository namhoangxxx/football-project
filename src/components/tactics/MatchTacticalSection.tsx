import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MomentumPoint, TeamTacticalProfile } from '../../types/tactical';
import { AppIcon } from '../common/AppIcon';
import { BoxEntryPitch } from './BoxEntryPitch';
import { DefensiveMapPitch } from './DefensiveMapPitch';
import { HeatmapPitch } from './HeatmapPitch';
import { MomentumChart } from './MomentumChart';
import { PassingSonarChart } from './PassingSonarChart';
import { PassNetworkPitch } from './PassNetworkPitch';
import { ShotmapPitch } from './ShotmapPitch';
import { TacticalComparisonCard } from './TacticalComparisonCard';
import { ThreatMatrixPitch } from './ThreatMatrixPitch';

type TacticalSubTab = 'OVERVIEW' | 'ATTACK' | 'PASSING' | 'DEFENSE';

interface MatchTacticalSectionProps {
  home: TeamTacticalProfile;
  away: TeamTacticalProfile;
  momentum: MomentumPoint[];
  insights: string[];
}

const SUB_TABS: {
  key: TacticalSubTab;
  label: string;
  icon: 'brain' | 'target' | 'network' | 'shield';
}[] = [
  { key: 'OVERVIEW', label: 'Tổng quan', icon: 'brain' },
  { key: 'ATTACK', label: 'Tấn công', icon: 'target' },
  { key: 'PASSING', label: 'Chuyền bóng', icon: 'network' },
  { key: 'DEFENSE', label: 'Phòng ngự', icon: 'shield' },
];

export const MatchTacticalSection: React.FC<MatchTacticalSectionProps> = ({
  home,
  away,
  momentum,
  insights,
}) => {
  const [activeTab, setActiveTab] = useState<TacticalSubTab>('OVERVIEW');
  const [selectedSide, setSelectedSide] = useState<'HOME' | 'AWAY'>('HOME');

  const activeTeam = selectedSide === 'HOME' ? home : away;
  // Hỗ trợ linh hoạt tên trường trong TeamTacticalProfile
  const profile = activeTeam as any;

  return (
    <View style={styles.container}>
      {/* Thanh chia 4 ngăn chiến thuật */}
      <View style={styles.tabBar}>
        {SUB_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.8}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
            >
              <AppIcon
                name={tab.icon}
                size={13}
                color={isActive ? '#00E676' : '#888888'}
              />
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bộ chọn Đội nhà / Đội khách (chỉ hiện ở 3 ngăn chuyên sâu từng đội) */}
      {activeTab !== 'OVERVIEW' && (
        <View style={styles.teamSwitcher}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedSide('HOME')}
            style={[
              styles.teamBtn,
              selectedSide === 'HOME' && styles.homeBtnActive,
            ]}
          >
            <View style={[styles.teamDot, { backgroundColor: '#00E676' }]} />
            <Text
              style={[
                styles.teamBtnText,
                selectedSide === 'HOME' && { color: '#00E676', fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {home.teamName}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedSide('AWAY')}
            style={[
              styles.teamBtn,
              selectedSide === 'AWAY' && styles.awayBtnActive,
            ]}
          >
            <View style={[styles.teamDot, { backgroundColor: '#FF5252' }]} />
            <Text
              style={[
                styles.teamBtnText,
                selectedSide === 'AWAY' && { color: '#FF5252', fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {away.teamName}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Ngăn 1: Tổng quan & Diễn biến 2 đội */}
      {activeTab === 'OVERVIEW' && (
        <View>
          <TacticalComparisonCard home={home} away={away} insights={insights} />
          <MomentumChart
            data={momentum}
            homeName={home.teamName}
            awayName={away.teamName}
          />
        </View>
      )}

      {/* Ngăn 2: Tấn công & Dứt điểm */}
      {activeTab === 'ATTACK' && (
        <View>
          <ShotmapPitch
            teamName={activeTeam.teamName}
            shots={profile.shots ?? []}
            xgTotal={activeTeam.xgTotal ?? 0}
          />
          <ThreatMatrixPitch
            teamName={activeTeam.teamName}
            grid={profile.threatGrid ?? profile.xtGrid ?? []}
            xtTotal={activeTeam.xtTotal ?? 0}
          />
          <BoxEntryPitch
            teamName={activeTeam.teamName}
            entries={activeTeam.boxEntries ?? []}
          />
        </View>
      )}

      {/* Ngăn 3: Kiểm soát & Chuyền bóng */}
      {activeTab === 'PASSING' && (
        <View>
          {profile.passNetwork && (
            <PassNetworkPitch
              teamName={activeTeam.teamName}
              network={profile.passNetwork}
            />
          )}
          <PassingSonarChart
            teamName={activeTeam.teamName}
            bins={profile.sonarBins ?? profile.passingSonar ?? []}
          />
        </View>
      )}

      {/* Ngăn 4: Phòng ngự & Lãnh thổ */}
      {activeTab === 'DEFENSE' && (
        <View>
          <DefensiveMapPitch
            teamName={activeTeam.teamName}
            actions={profile.defensiveActions ?? []}
            ppda={activeTeam.ppda ?? 0}
            pressingStyle={profile.pressingStyle ?? ''}
          />
          <HeatmapPitch
            teamName={activeTeam.teamName}
            zones={profile.heatmapZones ?? profile.heatmap ?? []}
            fieldTilt={
              activeTeam.fieldTilt ?? { defThird: 33, midThird: 34, attThird: 33 }
            }
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262626',
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 7,
  },
  tabItemActive: {
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#333333',
  },
  tabLabel: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  teamSwitcher: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  teamBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E1E1E',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  homeBtnActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderColor: '#00E676',
  },
  awayBtnActive: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderColor: '#FF5252',
  },
  teamDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  teamBtnText: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '600',
  },
});