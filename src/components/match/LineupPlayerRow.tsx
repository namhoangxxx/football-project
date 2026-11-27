import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ResolvedLineupPlayer } from '../../hooks/useResolvedLineups';
import { POS_META } from '../../utils/playerPosition';
import { SelectedPlayerPayload } from '../club/ClubSquadTab';

interface LineupPlayerRowProps {
  entry: ResolvedLineupPlayer;
  teamName: string;
  isSub?: boolean;
  onSelectPlayer?: (player: SelectedPlayerPayload) => void;
}

export const LineupPlayerRow: React.FC<LineupPlayerRowProps> = ({
  entry,
  teamName,
  isSub = false,
  onSelectPlayer,
}) => {
  const { item, displayPos, profilePos } = entry;
  const meta = POS_META[displayPos] || POS_META.CM;
  const subFlags = item.player as { subbed_in?: boolean; subbed_out?: boolean };
  const isSubbedOut = !isSub && Boolean(subFlags.subbed_out);
  const isSubbedIn = isSub && Boolean(subFlags.subbed_in);

  return (
    <TouchableOpacity
      style={styles.playerRow}
      activeOpacity={0.7}
      onPress={() =>
        onSelectPlayer?.({
          id: item.player.id || 0,
          name: item.player.name,
          number: item.player.number || 0,
          pos: profilePos,
          teamName,
        })
      }
    >
      <Text style={[styles.number, isSub && styles.subNumber]}>
        {item.player.number || '-'}
      </Text>
      <Text style={[styles.name, isSub && styles.subName]} numberOfLines={1}>
        {item.player.name}
      </Text>
      {isSubbedOut && <Text style={styles.subOutBadge}>↓ Ra</Text>}
      {isSubbedIn && <Text style={styles.subInBadge}>↑ Vào</Text>}
      <View style={[styles.posTag, { borderColor: meta.color }]}>
        <Text style={[styles.posText, { color: meta.color }]}>{displayPos}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  playerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  number: { color: '#00E676', fontWeight: '700', width: 28, fontSize: 12 },
  subNumber: { color: '#94A3B8' },
  name: { color: '#FFF', flex: 1, fontSize: 13, paddingRight: 8 },
  subName: { color: '#CBD5E1' },
  subOutBadge: { color: '#FF5252', fontSize: 10, fontWeight: '700', marginRight: 6 },
  subInBadge: { color: '#00E676', fontSize: 10, fontWeight: '700', marginRight: 6 },
  posTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 36,
    alignItems: 'center',
  },
  posText: { fontSize: 10, fontWeight: '800' },
});