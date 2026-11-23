import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TeamLineup } from '../../types/matchDetail';
import { AppIcon } from '../common/AppIcon';

interface MatchLineupsTabProps {
  lineups: TeamLineup[];
}

export const MatchLineupsTab: React.FC<MatchLineupsTabProps> = ({ lineups }) => {
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <AppIcon name="jersey" size={16} color="#00E676" />
        <Text style={styles.title}>Đội hình ra sân</Text>
      </View>

      {lineups.length > 0 ? (
        lineups.map((teamLineup, idx) => (
          <View
            key={idx}
            style={[styles.block, idx === lineups.length - 1 && styles.lastBlock]}
          >
            <View style={styles.header}>
              <Text style={styles.teamName}>{teamLineup.team?.name}</Text>
              <Text style={styles.formation}>
                Sơ đồ: {teamLineup.formation || 'N/A'}
              </Text>
            </View>
            {teamLineup.coach?.name && (
              <Text style={styles.coach}>HLV: {teamLineup.coach.name}</Text>
            )}

            <Text style={styles.subHeader}>Đội hình chính (11)</Text>
            {teamLineup.startXI?.map((item, pIdx) => (
              <View key={pIdx} style={styles.playerRow}>
                <Text style={styles.number}>{item.player.number || '-'}</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {item.player.name}
                </Text>
                <Text style={styles.pos}>{item.player.pos}</Text>
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
  block: {
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  lastBlock: { marginBottom: 0, paddingBottom: 0, borderBottomWidth: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  teamName: { color: '#00E676', fontSize: 14.5, fontWeight: '700' },
  formation: {
    backgroundColor: '#262626',
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  coach: { color: '#999', fontSize: 12, marginBottom: 8 },
  subHeader: {
    color: '#777',
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginVertical: 6,
  },
  playerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  number: { color: '#00E676', fontWeight: '700', width: 28, fontSize: 12 },
  name: { color: '#FFF', flex: 1, fontSize: 13, paddingRight: 8 },
  pos: { color: '#94A3B8', fontSize: 11, fontWeight: '700', width: 32, textAlign: 'right' },
});