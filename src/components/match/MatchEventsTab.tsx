import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MatchEventItem } from '../../types/matchDetail';
import { AppIcon } from '../common/AppIcon';

interface MatchEventsTabProps {
  events: MatchEventItem[];
}

export const MatchEventsTab: React.FC<MatchEventsTabProps> = ({ events }) => {
  const renderEventBadge = (type: string, detail: string) => {
    if (type === 'Goal') return <AppIcon name="target" size={14} color="#00E676" />;
    if (type === 'Card') {
      const isRed = detail.includes('Red');
      return <View style={[styles.cardBadge, { backgroundColor: isRed ? '#FF5252' : '#FFD600' }]} />;
    }
    if (type === 'subst') return <Text style={styles.substTag}>SUB</Text>;
    return <Text style={styles.varTag}>VAR</Text>;
  };

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <AppIcon name="clock" size={16} color="#00E676" />
        <Text style={styles.title}>Diễn biến chính</Text>
      </View>

      {events.length > 0 ? (
        events.map((ev, index) => {
          const minuteStr = ev.time.extra
            ? `${ev.time.elapsed}+${ev.time.extra}'`
            : `${ev.time.elapsed}'`;
          return (
            <View key={index} style={styles.eventRow}>
              <Text style={styles.minute}>{minuteStr}</Text>
              <View style={styles.badgeBox}>{renderEventBadge(ev.type, ev.detail)}</View>
              <View style={styles.info}>
                <Text style={styles.player}>{ev.player?.name}</Text>
                <Text style={styles.sub}>
                  {ev.team?.name} • {ev.detail}
                  {ev.assist?.name ? ` (Kiến tạo: ${ev.assist.name})` : ''}
                </Text>
              </View>
            </View>
          );
        })
      ) : (
        <Text style={styles.emptyText}>Chưa có dữ liệu diễn biến cho trận đấu này.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  title: { color: '#FFF', fontSize: 14.5, fontWeight: '700' },
  emptyText: { color: '#777', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  minute: { color: '#00E676', fontWeight: '700', width: 42, fontSize: 12.5 },
  badgeBox: { width: 32, alignItems: 'center', justifyContent: 'center' },
  cardBadge: { width: 10, height: 14, borderRadius: 2 },
  substTag: { color: '#38BDF8', fontSize: 9.5, fontWeight: '800' },
  varTag: { color: '#94A3B8', fontSize: 9.5, fontWeight: '800' },
  info: { flex: 1, marginLeft: 6 },
  player: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  sub: { color: '#888', fontSize: 11, marginTop: 2 },
});