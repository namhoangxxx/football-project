import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Match } from '../types/football';

interface MatchCardProps {
  item: Match;
  onPress: () => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ item, onPress }) => {
  const isLive = item.status === 'IN_PLAY' || item.status === 'PAUSED';

  const formatScheduledTime = (timeString?: string) => {
    if (!timeString) return 'Chưa xếp lịch';
    const date = new Date(timeString);
    const timeStr = date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh',
    });
    const dateStr = date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
    return `${timeStr}\n${dateStr}`;
  };

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
      {item.league && <Text style={styles.leagueText}>{item.league}</Text>}
      <View style={styles.matchRow}>
        <View style={styles.teamContainer}>
          {item.home_icon && <Image source={{ uri: item.home_icon }} style={styles.badge} />}
          <Text style={styles.teamName} numberOfLines={1}>{item.home_team}</Text>
        </View>

        <View style={styles.scoreContainer}>
          {isLive ? (
            <>
              <Text style={[styles.scoreText, styles.liveScore]}>
                {item.home_score ?? 0} - {item.away_score ?? 0}
              </Text>
              <Text style={styles.liveBadge}>🔴 LIVE</Text>
            </>
          ) : (
            <>
              <Text style={styles.scheduledTimeText}>{formatScheduledTime(item.match_time)}</Text>
              <Text style={styles.statusBadge}>VS</Text>
            </>
          )}
        </View>

        <View style={styles.teamContainer}>
          {item.away_icon && <Image source={{ uri: item.away_icon }} style={styles.badge} />}
          <Text style={styles.teamName} numberOfLines={1}>{item.away_team}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  leagueText: {
    fontSize: 11,
    color: '#888888',
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamContainer: {
    flex: 1,
    alignItems: 'center',
  },
  badge: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  teamName: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  scoreContainer: {
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  liveScore: {
    color: '#FF5252',
  },
  liveBadge: {
    fontSize: 10,
    color: '#FF5252',
    fontWeight: 'bold',
    marginTop: 2,
  },
  scheduledTimeText: {
    fontSize: 11,
    color: '#00E676',
    textAlign: 'center',
    fontWeight: '600',
  },
  statusBadge: {
    fontSize: 10,
    color: '#888888',
    marginTop: 2,
  },
});