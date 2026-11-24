import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Match } from '../../types/football';
import { isSameClubName } from '../../utils/textNormalize';

interface ClubHeaderBannerProps {
  teamId: number;
  teamName: string;
  logoUrl?: string;
  matches: Match[];
}

export const ClubHeaderBanner: React.FC<ClubHeaderBannerProps> = ({
  teamId,
  teamName,
  logoUrl,
  matches,
}) => {
  const recentForm = useMemo(() => {
    const finished = matches.filter((m) => m.status === 'FINISHED').slice(0, 5);
    return finished.reverse().map((m) => {
      const isHome =
        m.home_team_id === teamId ||
        (m.away_team_id !== teamId && isSameClubName(m.home_team, teamName));
      const gf = Number(isHome ? m.home_score : m.away_score) || 0;
      const ga = Number(isHome ? m.away_score : m.home_score) || 0;
      if (gf > ga) return 'W';
      if (gf < ga) return 'L';
      return 'D';
    });
  }, [matches, teamId, teamName]);

  return (
    <View style={styles.banner}>
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.logo} />
      ) : (
        <View style={[styles.logo, styles.placeholder]}>
          <Text style={styles.initial}>{teamName.charAt(0)}</Text>
        </View>
      )}
      <Text style={styles.clubName}>{teamName}</Text>

      {recentForm.length > 0 && (
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Phong độ:</Text>
          {recentForm.map((res, idx) => {
            const bg =
              res === 'W' ? '#00E676' : res === 'L' ? '#FF5252' : '#94A3B8';
            return (
              <View key={idx} style={[styles.formBadge, { backgroundColor: bg }]}>
                <Text style={styles.formText}>{res}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#161616',
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  logo: { width: 60, height: 60, resizeMode: 'contain', marginBottom: 8 },
  placeholder: {
    backgroundColor: '#262626',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  clubName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
  formRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 5 },
  formLabel: { color: '#888888', fontSize: 11, marginRight: 2 },
  formBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formText: { color: '#121212', fontSize: 10.5, fontWeight: '800' },
});