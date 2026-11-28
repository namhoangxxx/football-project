import { Match } from '../../types/football';
import { MatchEventItem, MatchStats, TeamLineup } from '../../types/matchDetail';
import {
  BoxEntryArrow,
  DefensiveAction,
  HeatmapZone,
  MatchTeamIdentities,
  PassLink,
  PassNode,
  ShotPoint,
  SonarBin,
  TeamSide,
  TeamTacticalProfile,
} from '../../types/tactical';
import { normalizePositionCode, PlayerPositionCode, POS_META } from '../playerPosition';
import {
  clamp,
  getFormationCoordinates,
  resolveEventSide,
} from './tacticalHelpers';

const TACTICAL_DEPTH: Record<PlayerPositionCode, number> = {
  GK: 0,
  CB: 1,
  LB: 1.1,
  RB: 1.1,
  LWB: 1.6,
  RWB: 1.6,
  CDM: 2.2,
  CM: 3,
  LM: 3.1,
  RM: 3.1,
  CAM: 3.8,
  LW: 4.4,
  RW: 4.4,
  CF: 4.8,
  ST: 5,
};

const LATERAL_BIAS: Partial<Record<PlayerPositionCode, number>> = {
  LB: -2,
  LWB: -2,
  LM: -2,
  LW: -2,
  RB: 2,
  RWB: 2,
  RM: 2,
  RW: 2,
};

export const buildTeamProfile = (
  side: TeamSide,
  identities: MatchTeamIdentities,
  match: Match,
  stats: MatchStats | null,
  events: MatchEventItem[],
  lineup: TeamLineup | undefined,
  rand: () => number
): TeamTacticalProfile => {
  const isHome = side === 'HOME';
  const teamName = isHome ? match.home_team : match.away_team;
  const isScheduled =
    match.status === 'SCHEDULED' ||
    match.status === 'TIMED' ||
    match.status === 'NOT_STARTED';

  const actualScore = isScheduled
    ? 0
    : Math.max(0, Number(isHome ? match.home_score : match.away_score) || 0);

  const rawPossession = stats ? (isHome ? stats.home_possession : stats.away_possession) : null;
  const possession =
    typeof rawPossession === 'number' && rawPossession > 5 && rawPossession < 95
      ? rawPossession
      : isHome
      ? 53
      : 47;

  const rawShots = stats ? (isHome ? stats.home_shots : stats.away_shots) : null;
  const totalShots = isScheduled
    ? 0
    : typeof rawShots === 'number' && rawShots >= 0
    ? Math.max(rawShots, actualScore)
    : Math.max(8, actualScore + 3);

  const rawOnTarget = stats
    ? isHome
      ? stats.home_shots_on_target
      : stats.away_shots_on_target
    : null;
  const shotsOnTarget = isScheduled
    ? 0
    : Math.min(
        totalShots,
        typeof rawOnTarget === 'number' && rawOnTarget >= 0
          ? Math.max(rawOnTarget, actualScore)
          : Math.max(actualScore, Math.ceil(totalShots * 0.38))
      );

  const corners = isScheduled
    ? 0
    : stats
    ? Math.max(0, Number(isHome ? stats.home_corners : stats.away_corners) || 0)
    : 5;
  const fouls = isScheduled
    ? 0
    : stats
    ? Math.max(0, Number(isHome ? stats.home_fouls : stats.away_fouls) || 0)
    : 11;

  const teamEvents = events.filter(
    (ev) => resolveEventSide(ev.team, identities) === side
  );

  // Loại bỏ bàn phản lưới nhà & loạt sút luân lưu (phút > 120)
  const goalEvents = teamEvents.filter((e) => {
    if (e.type !== 'Goal') return false;
    const detail = String(e.detail || '').toLowerCase();
    const elapsed = Number(e.time?.elapsed) || 0;
    return !detail.includes('own') && !detail.includes('missed') && elapsed <= 120;
  });

  const missedPenEvents = teamEvents.filter((e) => {
    const detail = String(e.detail || '').toLowerCase();
    const elapsed = Number(e.time?.elapsed) || 0;
    return detail.includes('missed') && detail.includes('pen') && elapsed <= 120;
  });

  const startXI = lineup?.startXI || [];

  const pickPlayerName = (idx: number) => {
    if (startXI.length > 0) {
      const p = startXI[idx % startXI.length]?.player;
      if (p?.name) return p.name;
    }
    return isHome ? `Cầu thủ #${(idx % 11) + 1}` : `Cầu thủ khách #${(idx % 11) + 1}`;
  };

  // 1. SHOTMAP & xG
  const shots: ShotPoint[] = [];
  const targetGoalsCount = isScheduled ? 0 : Math.max(actualScore, goalEvents.length);

  for (let idx = 0; idx < targetGoalsCount; idx++) {
    const g = goalEvents[idx];
    const isPen = String(g?.detail || '').toLowerCase().includes('pen');
    const xg = isPen ? 0.76 : Number((0.34 + rand() * 0.44).toFixed(2));
    shots.push({
      id: `${side}-goal-${idx}`,
      team: side,
      x: isPen ? 88.5 : clamp(83 + rand() * 14, 80, 97.5),
      y: isPen ? 34 : clamp(22 + rand() * 24, 18, 50),
      xg,
      outcome: 'GOAL',
      bodyPart: isPen
        ? 'RIGHT_FOOT'
        : rand() > 0.75
        ? 'HEAD'
        : rand() > 0.4
        ? 'RIGHT_FOOT'
        : 'LEFT_FOOT',
      playerName: g?.player?.name || pickPlayerName(9 + idx),
      minute: g?.time?.elapsed || Math.floor(15 + rand() * 70),
    });
  }

  for (let i = 0; i < missedPenEvents.length; i++) {
    const mp = missedPenEvents[i];
    shots.push({
      id: `${side}-pen-miss-${i}`,
      team: side,
      x: 88.5,
      y: 34,
      xg: 0.76,
      outcome: 'SAVED',
      bodyPart: 'RIGHT_FOOT',
      playerName: mp?.player?.name || pickPlayerName(9),
      minute: mp?.time?.elapsed || 50,
    });
  }

  const remainingSaved = Math.max(0, shotsOnTarget - shots.length);
  for (let i = 0; i < remainingSaved; i++) {
    const xg = Number((0.08 + rand() * 0.24).toFixed(2));
    shots.push({
      id: `${side}-saved-${i}`,
      team: side,
      x: clamp(76 + rand() * 18, 74, 95),
      y: clamp(16 + rand() * 36, 14, 54),
      xg,
      outcome: 'SAVED',
      bodyPart: rand() > 0.8 ? 'HEAD' : rand() > 0.45 ? 'RIGHT_FOOT' : 'LEFT_FOOT',
      playerName: pickPlayerName(6 + i),
      minute: Math.floor(5 + rand() * 85),
    });
  }

  const remainingOff = Math.max(0, totalShots - shots.length);
  for (let i = 0; i < remainingOff; i++) {
    const xg = Number((0.02 + rand() * 0.11).toFixed(2));
    shots.push({
      id: `${side}-off-${i}`,
      team: side,
      x: clamp(68 + rand() * 24, 65, 93),
      y: clamp(10 + rand() * 48, 8, 60),
      xg,
      outcome: 'OFF_TARGET',
      bodyPart: rand() > 0.5 ? 'RIGHT_FOOT' : 'LEFT_FOOT',
      playerName: pickPlayerName(4 + i),
      minute: Math.floor(3 + rand() * 87),
    });
  }

  const xgTotal = Number(shots.reduce((sum, s) => sum + s.xg, 0).toFixed(2));

  // 2. PASS NETWORK (Sắp xếp đội hình chuẩn GK -> DEF -> MID -> FWD trước khi ghép tọa độ)
  const formation = lineup?.formation || '4-3-3';
  const baseCoords = getFormationCoordinates(formation);
  const shiftForward = (possession - 50) * 0.18;

  const normalizedXI = startXI
    .map((item, origIdx) => {
      const p = item?.player;
      const fallbackPos: PlayerPositionCode =
        origIdx === 0 ? 'GK' : origIdx <= 4 ? 'CB' : origIdx <= 7 ? 'CM' : 'ST';
      const pos = p?.pos ? normalizePositionCode(p.pos) : fallbackPos;
      return { player: p, pos, origIdx };
    })
    .sort((a, b) => {
      const depthDiff = TACTICAL_DEPTH[a.pos] - TACTICAL_DEPTH[b.pos];
      if (depthDiff !== 0) return depthDiff;
      const latDiff = (LATERAL_BIAS[a.pos] ?? 0) - (LATERAL_BIAS[b.pos] ?? 0);
      if (latDiff !== 0) return latDiff;
      return a.origIdx - b.origIdx;
    });

  const nodes: PassNode[] = baseCoords.map((pt, idx) => {
    const entry = normalizedXI[idx];
    const p = entry?.player;
    const pos: PlayerPositionCode =
      entry?.pos || (idx === 0 ? 'GK' : idx <= 4 ? 'CB' : idx <= 7 ? 'CM' : 'ST');
    const group = POS_META[pos].group;

    const baseTouches =
      group === 'GK'
        ? 26
        : group === 'MID'
        ? pos === 'CDM' || pos === 'CM'
          ? 64
          : 54
        : group === 'DEF'
        ? pos === 'LWB' || pos === 'RWB'
          ? 52
          : 46
        : 34;

    return {
      id: `${side}-node-${idx}`,
      number: p?.number || idx + 1,
      name: p?.name ? p.name.split(' ').slice(-1)[0] : `#${idx + 1}`,
      pos,
      x: clamp(pt.x + (idx === 0 ? 0 : shiftForward + (rand() - 0.5) * 4.5), 6, 90),
      y: clamp(pt.y + (rand() - 0.5) * 3.5, 6, 62),
      touches: Math.round(baseTouches * (possession / 50) + rand() * 14),
    };
  });

  const links: PassLink[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (dist < 32) {
        const weight = clamp(
          Math.round(((32 - dist) / 32) * 8 * (possession / 50) + rand() * 2),
          1,
          10
        );
        links.push({ fromId: nodes[i].id, toId: nodes[j].id, weight });
      }
    }
  }
  const topNode = [...nodes].sort((a, b) => b.touches - a.touches)[0];

  // 3. HEATMAP & FIELD TILT (Tổng 3 khu vực luôn chính xác 100%)
  const attThird = clamp(Math.round(possession * 0.54 + (totalShots - 10) * 0.7), 16, 46);
  const defThird = clamp(Math.round((100 - possession) * 0.5), 15, 42);
  const midThird = 100 - attThird - defThird;

  const heatmapZones: HeatmapZone[] = Array.from({ length: 26 }, () => {
    const zoneRoll = rand() * 100;
    const x =
      zoneRoll < defThird
        ? 8 + rand() * 25
        : zoneRoll < defThird + midThird
        ? 34 + rand() * 32
        : 67 + rand() * 28;
    return {
      x,
      y: 6 + rand() * 56,
      intensity: Number((0.35 + rand() * 0.65).toFixed(2)),
    };
  });

  // 4. PASSING SONAR
  const sonarBins: SonarBin[] = Array.from({ length: 12 }, (_, idx) => {
    const angleDeg = idx * 30;
    const isForward = angleDeg === 0 || angleDeg === 30 || angleDeg === 330;
    const baseFreq = isForward ? 0.65 + (possession - 50) * 0.01 : 0.35 + rand() * 0.45;
    return {
      angleDeg,
      frequency: Number(clamp(baseFreq + (rand() - 0.5) * 0.2, 0.2, 1).toFixed(2)),
      avgDistance: Math.round(12 + rand() * 14),
    };
  });

  // 5. DEFENSIVE ACTION MAP & PPDA
  const ppda = Number(
    clamp(16.5 - (possession - 40) * 0.18 - fouls * 0.08, 6.2, 18.5).toFixed(1)
  );
  const pressingStyle =
    ppda <= 9.5
      ? 'High Block (Pressing tầm cao)'
      : ppda <= 13.0
      ? 'Mid Block (Khối trung bình)'
      : 'Low Block (Phòng ngự lùi sâu)';

  const actionTypes: DefensiveAction['type'][] = [
    'TACKLE',
    'INTERCEPTION',
    'RECOVERY',
    'TURNOVER',
  ];
  const highPressShift = ppda <= 10 ? 22 : ppda <= 13 ? 10 : -5;
  const defensiveActions: DefensiveAction[] = Array.from({ length: 24 }, (_, i) => ({
    x: clamp(22 + highPressShift + rand() * 55, 8, 92),
    y: clamp(6 + rand() * 56, 5, 63),
    type: actionTypes[i % actionTypes.length],
  }));

  // 6. BOX ENTRY MAP
  const entryCount = isScheduled
    ? 0
    : clamp(Math.round(totalShots * 1.1 + corners * 0.8), 4, 18);
  const boxEntries: BoxEntryArrow[] = Array.from({ length: entryCount }, (_, i) => {
    const isCross = i < corners || rand() > 0.55;
    const fromTopWing = rand() > 0.5;
    return {
      startX: isCross ? 74 + rand() * 22 : 62 + rand() * 18,
      startY: isCross
        ? fromTopWing
          ? 3 + rand() * 12
          : 53 + rand() * 12
        : 18 + rand() * 32,
      endX: 85 + rand() * 12,
      endY: 22 + rand() * 24,
      type: isCross ? 'CROSS' : rand() > 0.5 ? 'THROUGH_BALL' : 'CARRY',
      successful: rand() > 0.48,
    };
  });

  // 7. THREAT MATRIX (xT GRID 12x8)
  const effectiveShotsScale = isScheduled ? 0.5 : Math.max(4, totalShots) / 12;
  const xtGrid: number[][] = Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 12 }, (_, col) => {
      const colFactor = Math.pow((col + 1) / 12, 2.1);
      const rowFactor = 1 - (Math.abs(row - 3.5) / 3.5) * 0.45;
      const teamScale = (possession / 50) * effectiveShotsScale;
      const val = colFactor * rowFactor * teamScale * (0.045 + rand() * 0.035);
      return Number(clamp(val, 0.001, 0.14).toFixed(3));
    })
  );

  const xtTotal = isScheduled
    ? 0
    : Number(
        Math.max(
          0.35,
          xtGrid
            .flat()
            .reduce((acc, v) => acc + v * 0.45, 0)
        ).toFixed(2)
      );

  return {
    teamName,
    actualGoals: targetGoalsCount,
    xgTotal,
    xtTotal,
    ppda,
    pressingStyle,
    fieldTilt: { defThird, midThird, attThird },
    shots,
    passNetwork: {
      formation,
      nodes,
      links,
      playmakerName: topNode?.name || 'N/A',
    },
    heatmapZones,
    sonarBins,
    defensiveActions,
    boxEntries,
    xtGrid,
  };
};