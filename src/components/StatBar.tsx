import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StatBarProps {
  label: string;
  homeValue: number;
  awayValue: number;
  isPercentage?: boolean;
}

export const StatBar: React.FC<StatBarProps> = ({
  label,
  homeValue = 0,
  awayValue = 0,
  isPercentage = false,
}) => {
  const total = homeValue + awayValue || 1;
  const homeFlex = homeValue / total;
  const awayFlex = awayValue / total;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.valueText}>{homeValue}{isPercentage ? '%' : ''}</Text>
        <Text style={styles.labelText}>{label}</Text>
        <Text style={styles.valueText}>{awayValue}{isPercentage ? '%' : ''}</Text>
      </View>
      <View style={styles.barBackground}>
        <View style={[styles.homeBar, { flex: homeFlex }]} />
        <View style={[styles.awayBar, { flex: awayFlex }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  labelText: { color: '#AAA', fontSize: 12, fontWeight: '600' },
  valueText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  barBackground: { height: 6, flexDirection: 'row', borderRadius: 3, overflow: 'hidden', backgroundColor: '#333' },
  homeBar: { backgroundColor: '#00E676' },
  awayBar: { backgroundColor: '#FF5252' },
});