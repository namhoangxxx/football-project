import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StatBarProps {
  label: string;
  homeValue: number;
  awayValue: number;
  isPercentage?: boolean;
  lowerIsBetter?: boolean;
}

export const StatBar: React.FC<StatBarProps> = ({
  label,
  homeValue = 0,
  awayValue = 0,
  isPercentage = false,
  lowerIsBetter = false,
}) => {
  const total = homeValue + awayValue;
  const homeWidth = total > 0 ? (homeValue / total) * 100 : 0;
  const awayWidth = total > 0 ? (awayValue / total) * 100 : 0;

  const homeLeads =
    total > 0 && (lowerIsBetter ? homeValue < awayValue : homeValue > awayValue);
  const awayLeads =
    total > 0 && (lowerIsBetter ? awayValue < homeValue : awayValue > homeValue);

  const suffix = isPercentage ? '%' : '';

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <View style={[styles.valuePill, homeLeads && styles.homePillActive]}>
          <Text style={[styles.valueText, homeLeads && styles.homeValueActive]}>
            {homeValue}
            {suffix}
          </Text>
        </View>

        <Text style={styles.labelText}>{label}</Text>

        <View style={[styles.valuePill, awayLeads && styles.awayPillActive]}>
          <Text style={[styles.valueText, awayLeads && styles.awayValueActive]}>
            {awayValue}
            {suffix}
          </Text>
        </View>
      </View>

      <View style={styles.dualTrackRow}>
        <View style={styles.trackLeft}>
          <View
            style={[
              styles.fillLeft,
              {
                width: `${homeWidth}%`,
                backgroundColor: homeLeads ? '#00E676' : '#4A4A4A',
              },
            ]}
          />
        </View>

        <View style={styles.centerGap} />

        <View style={styles.trackRight}>
          <View
            style={[
              styles.fillRight,
              {
                width: `${awayWidth}%`,
                backgroundColor: awayLeads ? '#FF5252' : '#4A4A4A',
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 7,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  valuePill: {
    minWidth: 40,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
  },
  homePillActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.14)',
  },
  awayPillActive: {
    backgroundColor: 'rgba(255, 82, 82, 0.14)',
  },
  valueText: {
    color: '#B0B0B0',
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  homeValueActive: {
    color: '#00E676',
    fontWeight: '700',
  },
  awayValueActive: {
    color: '#FF5252',
    fontWeight: '700',
  },
  labelText: {
    color: '#9E9E9E',
    fontSize: 12,
    fontWeight: '600',
  },
  dualTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 6,
  },
  trackLeft: {
    flex: 1,
    height: 6,
    backgroundColor: '#262626',
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  trackRight: {
    flex: 1,
    height: 6,
    backgroundColor: '#262626',
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  fillLeft: {
    height: '100%',
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  fillRight: {
    height: '100%',
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  centerGap: {
    width: 3,
  },
});