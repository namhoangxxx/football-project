import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TeamLineup } from '../types/matchDetail';

interface MatchLineupsTabProps {
  lineups: TeamLineup[];
}

export const MatchLineupsTab: React.FC<MatchLineupsTabProps> = ({ lineups }) => {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>👕 Đội hình ra sân</Text>
      {lineups.length > 0 ? (
        lineups.map((teamLineup, idx) => (
          <View key={idx} style={styles.lineupBlock}>
            <View style={styles.lineupHeader}>
              <Text style={styles.lineupTeamName}>{teamLineup.team?.name}</Text>
              <Text style={styles.formationBadge}>
                Sơ đồ: {teamLineup.formation || 'N/A'}
              </Text>
            </View>
            {teamLineup.coach?.name && (
              <Text style={styles.coachText}>HLV: {teamLineup.coach.name}</Text>
            )}

            <Text style={styles.subHeader}>Đội hình chính (11)</Text>
            {teamLineup.startXI?.map((item, pIdx) => (
              <View key={pIdx} style={styles.playerRow}>
                <Text style={styles.playerNumber}>{item.player.number}</Text>
                <Text style={styles.playerName}>{item.player.name}</Text>
                <Text style={styles.playerPos}>{item.player.pos}</Text>
              </View>
            ))}
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>Chưa có dữ liệu đội hình cho trận đấu này.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionCard: { backgroundColor: '#1E1E1E', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  emptyText: { color: '#888', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  lineupBlock: { marginBottom: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#2C2C2C' },
  lineupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  lineupTeamName: { color: '#00E676', fontSize: 15, fontWeight: 'bold' },
  formationBadge: {
    backgroundColor: '#2C2C2C',
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  coachText: { color: '#AAA', fontSize: 12, marginBottom: 8 },
  subHeader: { color: '#888', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginVertical: 6 },
  playerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  playerNumber: { color: '#00E676', fontWeight: 'bold', width: 28, fontSize: 12 },
  playerName: { color: '#FFF', flex: 1, fontSize: 13 },
  playerPos: { color: '#888', fontSize: 11, fontWeight: 'bold', width: 24, textAlign: 'right' },
});