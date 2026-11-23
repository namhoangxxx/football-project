import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Match } from '../../types/football';
import { MatchStats } from '../../types/matchDetail';
import { generateTacticalInsights } from '../../utils/tacticalInsights';
import { AppIcon } from '../common/AppIcon';

interface TacticalSummaryCardProps {
  match: Match;
  stats: MatchStats | null;
}

export const TacticalSummaryCard: React.FC<TacticalSummaryCardProps> = ({
  match,
  stats,
}) => {
  const insights = useMemo(() => generateTacticalInsights(match, stats), [match, stats]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AppIcon name="brain" size={16} color="#00E676" />
        <Text style={styles.title}>Giải mã Chiến thuật Tự động</Text>
      </View>

      <View style={styles.list}>
        {insights.map((item, idx) => (
          <View key={idx} style={styles.itemBox}>
            <View style={[styles.tagBadge, { borderColor: item.color }]}>
              <Text style={[styles.tagText, { color: item.color }]}>{item.tag}</Text>
            </View>
            <Text style={styles.bodyText}>{item.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  title: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  list: { gap: 10 },
  itemBox: {
    backgroundColor: '#131313',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#242424',
  },
  tagBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 5,
  },
  tagText: { fontSize: 10.5, fontWeight: '800' },
  bodyText: { color: '#CBD5E1', fontSize: 12.5, lineHeight: 18 },
});