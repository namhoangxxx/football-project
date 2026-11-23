import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StandingRow } from '../../types/football';

interface StandingsTableRowProps {
  item: StandingRow;
  totalTeams: number;
  isChampionsLeague: boolean;
  onPress: () => void;
}

export const StandingsTableRow: React.FC<StandingsTableRowProps> = ({
  item,
  totalTeams,
  isChampionsLeague,
  onPress,
}) => {
  const getZoneColor = (pos: number) => {
    if (isChampionsLeague) {
      if (pos <= 8) return '#00E676'; // Vào thẳng vòng 1/8
      if (pos <= 24) return '#38BDF8'; // Play-off
      return '#FF5252';
    }
    if (pos <= 4) return '#00E676'; // Dự C1
    if (pos <= 6) return '#38BDF8'; // Dự C2/C3
    if (totalTeams >= 18 && pos > totalTeams - 3) return '#FF5252'; // Xuống hạng
    return 'transparent';
  };

  const zoneColor = getZoneColor(item.position);
  const gd = item.goalDifference ?? 0;

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.75} onPress={onPress}>
      <View style={[styles.zoneIndicator, { backgroundColor: zoneColor }]} />

      <Text style={[styles.cell, styles.posCol]}>{item.position}</Text>

      <View style={[styles.teamCol, styles.teamInfo]}>
        {item.team.crest ? (
          <Image source={{ uri: item.team.crest }} style={styles.crest} />
        ) : (
          <View style={styles.crestPlaceholder} />
        )}
        <Text style={styles.teamName} numberOfLines={1}>
          {item.team.name}
        </Text>
      </View>

      <Text style={styles.cell}>{item.playedGames}</Text>
      <Text style={styles.cell}>{item.won}</Text>
      <Text style={styles.cell}>{item.draw}</Text>
      <Text style={styles.cell}>{item.lost}</Text>
      <Text style={[styles.cell, styles.gdCol]}>
        {gd > 0 ? `+${gd}` : gd}
      </Text>
      <Text style={[styles.cell, styles.ptsCol]}>{item.points}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    paddingVertical: 11,
    paddingRight: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  zoneIndicator: { width: 3.5, height: 22, borderRadius: 2, marginRight: 6 },
  cell: { fontSize: 12, color: '#CBD5E1', textAlign: 'center', width: 25 },
  posCol: { width: 22, fontWeight: '700', color: '#94A3B8' },
  teamCol: { flex: 1 },
  teamInfo: { flexDirection: 'row', alignItems: 'center', paddingLeft: 4, paddingRight: 6 },
  crest: { width: 20, height: 20, resizeMode: 'contain', marginRight: 8 },
  crestPlaceholder: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#2C2C2C', marginRight: 8 },
  teamName: { fontSize: 12.5, fontWeight: '600', color: '#F8FAFC', flex: 1 },
  gdCol: { width: 30, color: '#94A3B8', fontSize: 11.5 },
  ptsCol: { width: 32, fontWeight: '800', color: '#00E676', fontSize: 13 },
});