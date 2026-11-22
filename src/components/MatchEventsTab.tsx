import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MatchEventItem } from '../types/matchDetail';

interface MatchEventsTabProps {
  events: MatchEventItem[];
}

export const MatchEventsTab: React.FC<MatchEventsTabProps> = ({ events }) => {
  const getEventIcon = (type: string, detail: string) => {
    if (type === 'Goal') return '⚽';
    if (type === 'Card') return detail.includes('Red') ? '🟥' : '🟨';
    if (type === 'subst') return '🔄';
    if (type === 'Var') return '📺';
    return '•';
  };

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>⏱ Diễn biến chính</Text>
      {events.length > 0 ? (
        events.map((ev, index) => {
          const minuteStr = ev.time.extra
            ? `${ev.time.elapsed}+${ev.time.extra}'`
            : `${ev.time.elapsed}'`;
          return (
            <View key={index} style={styles.eventRow}>
              <Text style={styles.eventMinute}>{minuteStr}</Text>
              <Text style={styles.eventIcon}>{getEventIcon(ev.type, ev.detail)}</Text>
              <View style={styles.eventInfo}>
                <Text style={styles.eventPlayer}>{ev.player?.name}</Text>
                <Text style={styles.eventSub}>
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
  sectionCard: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  emptyText: { color: '#888', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  eventMinute: { color: '#00E676', fontWeight: 'bold', width: 42, fontSize: 13 },
  eventIcon: { fontSize: 16, width: 28, textAlign: 'center' },
  eventInfo: { flex: 1, marginLeft: 6 },
  eventPlayer: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  eventSub: { color: '#999', fontSize: 11, marginTop: 2 },
});