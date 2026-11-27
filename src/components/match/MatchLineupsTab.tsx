import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useResolvedLineups } from '../../hooks/useResolvedLineups';
import { TeamLineup } from '../../types/matchDetail';
import { normalizeSearchText } from '../../utils/textNormalize';
import { SelectedPlayerPayload } from '../club/ClubSquadTab';
import { AppIcon } from '../common/AppIcon';
import { LineupPlayerRow } from './LineupPlayerRow';
import { TacticalPitchView } from './TacticalPitchView';

interface MatchLineupsTabProps {
  lineups: TeamLineup[];
  onSelectPlayer?: (player: SelectedPlayerPayload) => void;
}

export const MatchLineupsTab: React.FC<MatchLineupsTabProps> = ({
  lineups,
  onSelectPlayer,
}) => {
  const [viewMode, setViewMode] = useState<'PITCH' | 'LIST'>('PITCH');
  const [selectedTeamIdx, setSelectedTeamIdx] = useState<number>(0);
  const resolvedLineups = useResolvedLineups(lineups);

  useEffect(() => {
    setSelectedTeamIdx(0);
  }, [lineups]);

  const safeIdx = selectedTeamIdx < resolvedLineups.length ? selectedTeamIdx : 0;
  const activeTeam = resolvedLineups[safeIdx];

  return (
    <View style={styles.card}>
      <View style={styles.topHeaderRow}>
        <View style={styles.titleRow}>
          <AppIcon name="jersey" size={16} color="#00E676" />
          <Text style={styles.title}>Đội hình ra sân</Text>
        </View>

        {resolvedLineups.length > 0 && (
          <View style={styles.modeSwitch}>
            {(['PITCH', 'LIST'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.modeBtn, viewMode === mode && styles.activeModeBtn]}
                onPress={() => setViewMode(mode)}
              >
                <Text style={[styles.modeText, viewMode === mode && styles.activeModeText]}>
                  {mode === 'PITCH' ? 'Sơ đồ sân' : 'Danh sách'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {resolvedLineups.length === 0 ? (
        <Text style={styles.emptyText}>Chưa có dữ liệu đội hình cho trận đấu này.</Text>
      ) : viewMode === 'PITCH' && activeTeam ? (
        <View>
          <View style={styles.teamTabsRow}>
            {resolvedLineups.map((t, idx) => {
              const active = idx === safeIdx;
              const accent = idx === 0 ? '#00E676' : '#38BDF8';
              return (
                <TouchableOpacity
                  key={`${normalizeSearchText(t.teamName)}-${idx}`}
                  style={[
                    styles.teamTabBtn,
                    active && { borderColor: accent, backgroundColor: '#222826' },
                  ]}
                  onPress={() => setSelectedTeamIdx(idx)}
                >
                  <Text style={[styles.teamTabName, active && { color: accent }]} numberOfLines={1}>
                    {t.teamName || `Đội ${idx + 1}`}
                  </Text>
                  <Text style={styles.teamTabFormation}>Sơ đồ: {t.formation || 'N/A'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {activeTeam.coachName && <Text style={styles.coach}>HLV: {activeTeam.coachName}</Text>}

          <TacticalPitchView
            teamName={activeTeam.teamName}
            formation={activeTeam.formation}
            players={activeTeam.startXI}
            accentColor={safeIdx === 0 ? '#00E676' : '#38BDF8'}
            onSelectPlayer={onSelectPlayer}
          />

          <Text style={styles.pitchHint}>
            Chạm vào cầu thủ trên sân để xem hồ sơ & chỉ số chi tiết
          </Text>

          {activeTeam.substitutes.length > 0 && (
            <View style={styles.benchSection}>
              <Text style={[styles.subHeader, styles.benchHeader]}>
                Cầu thủ dự bị ({activeTeam.substitutes.length})
              </Text>
              {activeTeam.substitutes.map((entry, sIdx) => (
                <LineupPlayerRow
                  key={`pitch-sub-${safeIdx}-${sIdx}`}
                  entry={entry}
                  teamName={activeTeam.teamName}
                  isSub
                  onSelectPlayer={onSelectPlayer}
                />
              ))}
            </View>
          )}
        </View>
      ) : (
        resolvedLineups.map((team, idx) => (
          <View
            key={`${normalizeSearchText(team.teamName)}-${idx}`}
            style={[styles.block, idx === resolvedLineups.length - 1 && styles.lastBlock]}
          >
            <View style={styles.header}>
              <Text style={styles.teamName}>{team.teamName}</Text>
              <Text style={styles.formation}>Sơ đồ: {team.formation || 'N/A'}</Text>
            </View>
            {team.coachName && <Text style={styles.coach}>HLV: {team.coachName}</Text>}

            <Text style={styles.subHeader}>Đội hình chính ({team.startXI.length})</Text>
            {team.startXI.map((entry, pIdx) => (
              <LineupPlayerRow
                key={`xi-${idx}-${pIdx}`}
                entry={entry}
                teamName={team.teamName}
                onSelectPlayer={onSelectPlayer}
              />
            ))}

            {team.substitutes.length > 0 && (
              <>
                <Text style={[styles.subHeader, styles.benchHeader]}>
                  Cầu thủ dự bị ({team.substitutes.length})
                </Text>
                {team.substitutes.map((entry, sIdx) => (
                  <LineupPlayerRow
                    key={`sub-${idx}-${sIdx}`}
                    entry={entry}
                    teamName={team.teamName}
                    isSub
                    onSelectPlayer={onSelectPlayer}
                  />
                ))}
              </>
            )}
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { color: '#FFF', fontSize: 14.5, fontWeight: '700' },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#121212',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  modeBtn: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  activeModeBtn: { backgroundColor: '#282828' },
  modeText: { color: '#777', fontSize: 11, fontWeight: '600' },
  activeModeText: { color: '#00E676', fontWeight: '700' },
  teamTabsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  teamTabBtn: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#282828',
  },
  teamTabName: { color: '#CBD5E1', fontSize: 13, fontWeight: '700' },
  teamTabFormation: { color: '#94A3B8', fontSize: 11, fontWeight: '600', marginTop: 2 },
  pitchHint: { color: '#64748B', fontSize: 10.5, textAlign: 'center', marginTop: 8 },
  benchSection: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#262626' },
  emptyText: { color: '#777', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  block: { marginBottom: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#262626' },
  lastBlock: { marginBottom: 0, paddingBottom: 0, borderBottomWidth: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
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
    color: '#00E676',
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: 4,
  },
  benchHeader: { color: '#94A3B8', marginTop: 4 },
});