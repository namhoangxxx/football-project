import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Match } from '../../types/football';

interface MatchCardProps {
  item: Match;
  onPress: () => void;
}

const LIVE_STATUSES = new Set(['IN_PLAY', 'PAUSED', 'HALFTIME']);

function formatDateTime(timeString?: string) {
  if (!timeString) return null;
  const date = new Date(timeString);
  if (Number.isNaN(date.getTime())) return null;

  return {
    timeStr: date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh',
    }),
    dateStr: date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    }),
  };
}

const MatchCardComponent: React.FC<MatchCardProps> = ({ item, onPress }) => {
  const isLive = LIVE_STATUSES.has(item.status);
  const isFinished = item.status === 'FINISHED';
  const liveLabel =
    item.status === 'PAUSED' || item.status === 'HALFTIME' ? 'HT' : 'LIVE';
  const formatted = formatDateTime(item.match_time);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.topRow}>
        <Text style={styles.leagueText} numberOfLines={1}>
          {item.league || 'Giải đấu'}
        </Text>
        {isFinished && formatted && (
          <Text style={styles.dateText}>{formatted.dateStr}</Text>
        )}
      </View>

      <View style={styles.matchRow}>
        <View style={styles.teamContainer}>
          {item.home_icon ? (
            <Image source={{ uri: item.home_icon }} style={styles.badge} />
          ) : (
            <View style={[styles.badge, styles.placeholder]}>
              <Text style={styles.initial}>{(item.home_team || '?').charAt(0)}</Text>
            </View>
          )}
          <Text style={styles.teamName} numberOfLines={2}>
            {item.home_team}
          </Text>
        </View>

        <View style={styles.scoreContainer}>
          {isLive || isFinished ? (
            <>
              <Text style={[styles.scoreText, isLive && styles.liveScore]}>
                {item.home_score ?? 0} - {item.away_score ?? 0}
              </Text>
              <View style={[styles.pill, isLive && styles.livePill]}>
                <Text style={[styles.pillText, isLive && styles.livePillText]}>
                  {isLive ? liveLabel : 'FT'}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.scheduledText}>
                {formatted ? `${formatted.timeStr}\n${formatted.dateStr}` : 'Chưa xếp lịch'}
              </Text>
              <Text style={styles.vsBadge}>VS</Text>
            </>
          )}
        </View>

        <View style={styles.teamContainer}>
          {item.away_icon ? (
            <Image source={{ uri: item.away_icon }} style={styles.badge} />
          ) : (
            <View style={[styles.badge, styles.placeholder]}>
              <Text style={styles.initial}>{(item.away_team || '?').charAt(0)}</Text>
            </View>
          )}
          <Text style={styles.teamName} numberOfLines={2}>
            {item.away_team}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const MatchCard = React.memo(
  MatchCardComponent,
  (prev, next) =>
    prev.item === next.item ||
    (prev.item.event_id === next.item.event_id &&
      prev.item.status === next.item.status &&
      prev.item.home_score === next.item.home_score &&
      prev.item.away_score === next.item.away_score &&
      prev.item.match_time === next.item.match_time)
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#262626',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leagueText: {
    fontSize: 10.5,
    color: '#777777',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.4,
    flex: 1,
  },
  dateText: { fontSize: 10.5, color: '#666666', marginLeft: 8 },
  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamContainer: { flex: 1, alignItems: 'center' },
  badge: { width: 34, height: 34, resizeMode: 'contain', marginBottom: 5 },
  placeholder: {
    borderRadius: 17,
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  teamName: { fontSize: 12.5, color: '#F1F5F9', fontWeight: '600', textAlign: 'center' },
  scoreContainer: { paddingHorizontal: 10, alignItems: 'center', minWidth: 84 },
  scoreText: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  liveScore: { color: '#FF5252' },
  pill: {
    marginTop: 4,
    backgroundColor: '#262626',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  livePill: { backgroundColor: '#FF525222', borderWidth: 1, borderColor: '#FF5252' },
  pillText: { fontSize: 9.5, fontWeight: '700', color: '#00E676', letterSpacing: 0.5 },
  livePillText: { color: '#FF5252' },
  scheduledText: { fontSize: 11.5, color: '#00E676', textAlign: 'center', fontWeight: '600' },
  vsBadge: { fontSize: 10, color: '#666666', marginTop: 3, fontWeight: '700' },
});