import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { PlayerPositionCode, POS_META } from '../../utils/playerPosition';

interface PlayerHeroHeaderProps {
  name: string;
  teamName: string;
  number: number;
  pos: PlayerPositionCode;
  nationality?: string;
  age?: number;
  height?: string;
  photoUrl?: string;
}

export const PlayerHeroHeader: React.FC<PlayerHeroHeaderProps> = ({
  name,
  teamName,
  number,
  pos,
  nationality,
  age,
  height,
  photoUrl,
}) => {
  const meta = POS_META[pos];

  return (
    <View style={styles.banner}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.avatarImg} />
      ) : (
        <View style={styles.jerseyCircle}>
          <Text style={styles.jerseyNum}>{number || '-'}</Text>
        </View>
      )}
      <Text style={styles.playerName}>
        {number ? `#${number} ` : ''}
        {name}
      </Text>
      <Text style={styles.clubText}>{teamName}</Text>

      <View style={styles.metaRow}>
        <View style={[styles.posBadge, { borderColor: meta.color }]}>
          <Text style={[styles.posText, { color: meta.color }]}>
            {pos} • {meta.label}
          </Text>
        </View>
        {nationality ? <Text style={styles.bioChip}>{nationality}</Text> : null}
        {age ? <Text style={styles.bioChip}>{age} tuổi</Text> : null}
        {height ? <Text style={styles.bioChip}>{height}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#161616',
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#262626',
    borderWidth: 1.5,
    borderColor: '#00E676',
    marginBottom: 8,
  },
  jerseyCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#262626',
    borderWidth: 1.5,
    borderColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  jerseyNum: { color: '#00E676', fontSize: 20, fontWeight: '800' },
  playerName: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  clubText: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  posBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  posText: { fontSize: 11, fontWeight: '700' },
  bioChip: {
    backgroundColor: '#242424',
    color: '#CBD5E1',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
  },
});