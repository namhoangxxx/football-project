import { useEffect, useMemo, useState } from 'react';
import { SUPABASE_HEADERS, SUPABASE_URL } from '../config/supabase';
import { LineupPlayer, TeamLineup } from '../types/matchDetail';
import {
    normalizePositionCode,
    PlayerPositionCode,
    POS_ORDER,
} from '../utils/playerPosition';
import { isSameClubName, isSamePlayerName } from '../utils/textNormalize';

interface OfficialPlayerRecord {
  player_id: number;
  name: string;
  team_name?: string;
  position_code?: string;
}

export interface ResolvedLineupPlayer {
  item: LineupPlayer;
  displayPos: PlayerPositionCode;
  profilePos: PlayerPositionCode;
  originalIndex: number;
}

export interface ResolvedTeamLineup {
  teamName: string;
  formation?: string;
  coachName?: string;
  startXI: ResolvedLineupPlayer[];
  substitutes: ResolvedLineupPlayer[];
}

const GENERIC_MATCH_ROLES = new Set([
  '', 'SUB', 'SUBSTITUTE', 'BENCH',
  'D', 'DF', 'DEF', 'DEFENDER',
  'M', 'MF', 'MID', 'MIDFIELDER',
  'F', 'FW', 'FWD', 'FORWARD', 'ATTACKER',
]);

const isGenericOrSubRole = (raw?: string): boolean =>
  GENERIC_MATCH_ROLES.has((raw || '').trim().toUpperCase());

export function useResolvedLineups(lineups: TeamLineup[]): ResolvedTeamLineup[] {
  const [posById, setPosById] = useState<Record<number, PlayerPositionCode>>({});
  const [recordsByName, setRecordsByName] = useState<OfficialPlayerRecord[]>([]);

  const { playerIds, teamNames } = useMemo(() => {
    const ids = new Set<number>();
    const teams = new Set<string>();

    lineups.forEach((team) => {
      if (team.team?.name) teams.add(team.team.name.trim());
      [...(team.startXI || []), ...(team.substitutes || [])].forEach(({ player }) => {
        if (player?.id && player.id > 0) ids.add(player.id);
      });
    });

    return { playerIds: Array.from(ids), teamNames: Array.from(teams) };
  }, [lineups]);

  useEffect(() => {
    if (playerIds.length === 0 && teamNames.length === 0) return;
    let isMounted = true;

    const fetchByIds =
      playerIds.length > 0
        ? fetch(
            `${SUPABASE_URL}/rest/v1/players?player_id=in.(${playerIds.join(',')})&select=player_id,name,team_name,position_code`,
            { headers: SUPABASE_HEADERS }
          ).then((res) => (res.ok ? res.json() : []))
        : Promise.resolve([]);

    const teamFilter = teamNames
      .map((n) => n.replace(/[",()]/g, '').trim())
      .filter(Boolean)
      .map((n) => `team_name.ilike.*${encodeURIComponent(n)}*`)
      .join(',');

    const fetchByTeams = teamFilter
      ? fetch(
          `${SUPABASE_URL}/rest/v1/players?or=(${teamFilter})&select=player_id,name,team_name,position_code&limit=200`,
          { headers: SUPABASE_HEADERS }
        ).then((res) => (res.ok ? res.json() : []))
      : Promise.resolve([]);

    Promise.all([fetchByIds, fetchByTeams])
      .then(([idRows, teamRows]: [OfficialPlayerRecord[], OfficialPlayerRecord[]]) => {
        if (!isMounted) return;
        const nextById: Record<number, PlayerPositionCode> = {};
        const merged: OfficialPlayerRecord[] = [];

        [...(Array.isArray(idRows) ? idRows : []), ...(Array.isArray(teamRows) ? teamRows : [])].forEach(
          (r) => {
            if (!r?.position_code) return;
            const code = normalizePositionCode(r.position_code);
            if (r.player_id) nextById[Number(r.player_id)] = code;
            merged.push(r);
          }
        );

        setPosById(nextById);
        setRecordsByName(merged);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [playerIds, teamNames]);

  return useMemo(() => {
    const resolveOfficialPos = (
      pid: number,
      playerName: string,
      teamName: string
    ): PlayerPositionCode | undefined => {
      if (pid > 0 && posById[pid]) return posById[pid];
      if (!playerName || recordsByName.length === 0) return undefined;

      const hit =
        recordsByName.find(
          (r) =>
            isSamePlayerName(r.name, playerName) &&
            (!teamName || isSameClubName(r.team_name, teamName))
        ) || recordsByName.find((r) => isSamePlayerName(r.name, playerName));

      return hit?.position_code ? normalizePositionCode(hit.position_code) : undefined;
    };

    const resolvePlayer = (
      item: LineupPlayer,
      teamName: string,
      originalIndex: number
    ): ResolvedLineupPlayer => {
      const pid = item.player.id || 0;
      const officialPos = resolveOfficialPos(pid, item.player.name, teamName);
      const displayPos = !isGenericOrSubRole(item.player.pos)
        ? normalizePositionCode(item.player.pos)
        : officialPos || normalizePositionCode(item.player.pos);

      return {
        item,
        displayPos,
        profilePos: officialPos || displayPos,
        originalIndex,
      };
    };

    return lineups.map((teamLineup) => {
      const teamName = teamLineup.team?.name || '';

      const startXI = (teamLineup.startXI || [])
        .map((item, idx) => resolvePlayer(item, teamName, idx))
        .sort(
          (a, b) =>
            POS_ORDER.indexOf(a.displayPos) - POS_ORDER.indexOf(b.displayPos) ||
            a.originalIndex - b.originalIndex
        );

      const substitutes = (teamLineup.substitutes || [])
        .map((item, idx) => resolvePlayer(item, teamName, idx))
        .sort((a, b) => {
          const aIn = Boolean((a.item.player as { subbed_in?: boolean }).subbed_in) ? 0 : 1;
          const bIn = Boolean((b.item.player as { subbed_in?: boolean }).subbed_in) ? 0 : 1;
          if (aIn !== bIn) return aIn - bIn;
          return POS_ORDER.indexOf(a.displayPos) - POS_ORDER.indexOf(b.displayPos);
        });

      return {
        teamName,
        formation: teamLineup.formation,
        coachName: teamLineup.coach?.name,
        startXI,
        substitutes,
      };
    });
  }, [lineups, posById, recordsByName]);
}