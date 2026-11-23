import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppIcon, IconName } from '../common/AppIcon';

export type HomeTabType = 'LIVE' | 'UPCOMING' | 'FINISHED' | 'STANDINGS';

interface HomeHeaderTabsProps {
  activeTab: HomeTabType;
  liveCount: number;
  onSelectTab: (tab: HomeTabType) => void;
}

export const HomeHeaderTabs: React.FC<HomeHeaderTabsProps> = ({
  activeTab,
  liveCount,
  onSelectTab,
}) => {
  const tabs: Array<{ key: HomeTabType; label: string; icon: IconName }> = [
    { key: 'LIVE', label: liveCount > 0 ? `Live (${liveCount})` : 'Trực tiếp', icon: 'live' },
    { key: 'UPCOMING', label: 'Sắp đá', icon: 'calendar' },
    { key: 'FINISHED', label: 'Kết quả', icon: 'check' },
    { key: 'STANDINGS', label: 'BXH', icon: 'trophy' },
  ];

  return (
    <>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <AppIcon name="tactics" size={18} color="#00E676" />
          <Text style={styles.headerTitle}>BALLMETRICS</Text>
        </View>
        <Text style={styles.headerSub}>Tactical Football Analytics</Text>
      </View>

      <View style={styles.tabContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const isLiveActive = tab.key === 'LIVE' && isActive;
          const iconColor = isLiveActive ? '#FF5252' : isActive ? '#00E676' : '#777777';

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, isActive && styles.activeTab]}
              onPress={() => onSelectTab(tab.key)}
            >
              <AppIcon name={tab.icon} size={14} color={iconColor} />
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.activeTabText,
                  isLiveActive && { color: '#FF5252' },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingVertical: 11,
    backgroundColor: '#161616',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1.2 },
  headerSub: { fontSize: 10, color: '#777777', marginTop: 2, letterSpacing: 0.4 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    padding: 4,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262626',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 7,
  },
  activeTab: { backgroundColor: '#282828' },
  tabText: { fontSize: 11.5, color: '#777777', fontWeight: '600' },
  activeTabText: { color: '#00E676', fontWeight: '700' },
});