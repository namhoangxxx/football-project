import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Match } from '../../types/football';

interface MatchScoreboardProps {
  match: Match;
  isFinishedOrLive: boolean;
  matchDate: string;
  onSelectClub: (teamId: number, teamName: string, logoUrl?: string) => void;
}

export const MatchScoreboard: React.FC<MatchScoreboardProps> = ({
  match,
  isFinishedOrLive,
  matchDate,
  onSelectClub,
}) => {
  const isLive = match.status === 'IN_PLAY';

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.teamCol}
        activeOpacity={0.7}
        onPress={() =>
          onSelectClub(match.home_team_id, match.home_team, match.home_icon || undefined)
        }
      >
        {match.home_icon ? (
          <Image source={{ uri: match.home_icon }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.placeholder]}>
            <Text style={styles.initial}>{match.home_team.charAt(0)}</Text>
          </View>
        )}
        <Text style={styles.teamName} numberOfLines={2}>
          {match.home_team}
        </Text>
      </TouchableOpacity>

      <View style={styles.centerCol}>
        {isFinishedOrLive ? (
          <>
            <Text style={styles.score}>
              {match.home_score ?? 0} - {match.away_score ?? 0}
            </Text>
            <View style={[styles.pill, isLive && styles.livePill]}>
              <Text style={[styles.pillText, isLive && styles.liveText]}>
                {isLive ? 'LIVE' : match.status === 'FINISHED' ? 'FT' : match.status}
              </Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.vs}>VS</Text>
            <Text style={styles.date}>{matchDate}</Text>
          </>
        )}
      </View>

      <TouchableOpacity
        style={styles.teamCol}
        activeOpacity={0.7}
        onPress={() =>
          onSelectClub(match.away_team_id, match.away_team, match.away_icon || undefined)
        }
      >
        {match.away_icon ? (
          <Image source={{ uri: match.away_icon }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.placeholder]}>
            <Text style={styles.initial}>{match.away_team.charAt(0)}</Text>
          </View>
        )}
        <Text style={styles.teamName} numberOfLines={2}>
          {match.away_team}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  teamCol: { flex: 1, alignItems: 'center' },
  logo: { width: 46, height: 46, resizeMode: 'contain', marginBottom: 6 },
  placeholder: { borderRadius: 23, backgroundColor: '#282828', justifyContent: 'center', alignItems: 'center' },
  initial: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  teamName: { color: '#F1F5F9', fontSize: 12.5, fontWeight: '600', textAlign: 'center' },
  centerCol: { alignItems: 'center', paddingHorizontal: 12 },
  score: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: 0.5 },
  pill: { marginTop: 5, backgroundColor: '#262626', paddingHorizontal: 9, paddingVertical: 2, borderRadius: 4 },
  livePill: { backgroundColor: '#FF525222', borderWidth: 1, borderColor: '#FF5252' },
  pillText: { color: '#00E676', fontSize: 10, fontWeight: '700' },
  liveText: { color: '#FF5252' },
  vs: { color: '#666', fontSize: 18, fontWeight: '800' },
  date: { color: '#00E676', fontSize: 11, marginTop: 4, fontWeight: '600' },
});