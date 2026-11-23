import {
  normalizePositionCode,
  PlayerPositionCode,
} from '../../services/clubStatsService';
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
import {
  clamp,
  getFormationCoordinates,
  resolveEventSide,
} from './tacticalHelpers';

const MIDFIELD_ROLES = new Set<PlayerPositionCode>(['CDM', 'CM', 'AM', 'LM', 'RM']);

const fallbackPosByIndex = (idx: number): PlayerPositionCode => {
  if (idx === 0) return 'GK';
  if (idx === 1) return 'LB';
  if (idx === 2 || idx === 3) return 'CB';
  if (idx === 4) return 'RB';
  if (idx === 5) return 'CDM';
  if (idx === 6 || idx === 7) return 'CM';
  if (idx === 8) return 'LF';
  if (idx === 9) return 'CF';
  return 'RF';
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
  const actualScore = Math.max(
    0,
    Number(isHome ? match.home_score : match.away_score) || 0
  );
  const possession = stats
    ? isHome
      ? stats.home_possession
      : stats.away_possession
    : isHome
    ? 54
    : 46;
  const totalShots = Math.max(
    stats ? (isHome ? stats.home_shots : stats.away_shots) : 10,
    actualScore + 2
  );
  const shotsOnTarget = Math.min(
    totalShots,
    Math.max(
      actualScore,
      stats
        ? isHome
          ? stats.home_shots_on_target
          : stats.away_shots_on_target
        : Math.ceil(totalShots * 0.4)
    )
  );
  const corners = stats ? (isHome ? stats.home_corners : stats.away_corners) : 5;
  const fouls = stats ? (isHome ? stats.home_fouls : stats.away_fouls) : 11;

  const teamEvents = events.filter(
    (ev) => resolveEventSide(ev.team, identities) === side
  );
  const goalEvents = teamEvents.filter(
    (e) =>
      e.type === 'Goal' && !String(e.detail || '').toLowerCase().includes('own')
  );
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
  let xgTotal = 0;
  const targetGoalsCount = Math.max(actualScore, goalEvents.length);

  for (let idx = 0; idx < targetGoalsCount; idx++) {
    const g = goalEvents[idx];
    const xg = Number((0.28 + rand() * 0.48).toFixed(2));
    xgTotal += xg;
    shots.push({
      id: `${side}-goal-${idx}`,
      team: side,
      x: clamp(83 + rand() * 14, 80, 97.5),
      y: clamp(22 + rand() * 24, 18, 50),
      xg,
      outcome: 'GOAL',
      bodyPart: rand() > 0.75 ? 'HEAD' : rand() > 0.4 ? 'RIGHT_FOOT' : 'LEFT_FOOT',
      playerName: g?.player?.name || pickPlayerName(9 + idx),
      minute: g?.time?.elapsed || Math.floor(15 + rand() * 70),
    });
  }

  for (let i = 0; i < Math.max(0, shotsOnTarget - shots.length); i++) {
    const xg = Number((0.08 + rand() * 0.25).toFixed(2));
    xgTotal += xg;
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

  for (let i = 0; i < Math.max(0, totalShots - shots.length); i++) {
    const xg = Number((0.02 + rand() * 0.11).toFixed(2));
    xgTotal += xg;
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

  // 2. PASS NETWORK (chuẩn hóa 12 vị trí)
  const formation = lineup?.formation || '4-3-3';
  const baseCoords = getFormationCoordinates(formation);
  const shiftForward = (possession - 50) * 0.18;

  const nodes: PassNode[] = baseCoords.map((pt, idx) => {
    const p = startXI[idx]?.player;
    const pos = p?.pos ? normalizePositionCode(p.pos) : fallbackPosByIndex(idx);
    const isMidfielder = MIDFIELD_ROLES.has(pos);

    return {
      id: `${side}-node-${idx}`,
      number: p?.number || idx + 1,
      name: p?.name ? p.name.split(' ').slice(-1)[0] : `#${idx + 1}`,
      pos,
      x: clamp(pt.x + (idx === 0 ? 0 : shiftForward + (rand() - 0.5) * 5), 6, 90),
      y: clamp(pt.y + (rand() - 0.5) * 4, 6, 62),
      touches: Math.round((isMidfielder ? 58 : 36) * (possession / 50) + rand() * 15),
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

  // 3. HEATMAP & FIELD TILT
  const attThird = clamp(Math.round(possession * 0.58 + (totalShots - 10) * 0.8), 18, 48);
  const defThird = clamp(Math.round((100 - possession) * 0.52), 16, 44);
  const midThird = Math.max(20, 100 - attThird - defThird);

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
  const entryCount = clamp(Math.round(totalShots * 1.1 + corners * 0.8), 6, 18);
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
  const xtGrid: number[][] = Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 12 }, (_, col) => {
      const colFactor = Math.pow((col + 1) / 12, 2.1);
      const rowFactor = 1 - (Math.abs(row - 3.5) / 3.5) * 0.45;
      const teamScale = (possession / 50) * (totalShots / 12);
      const val = colFactor * rowFactor * teamScale * (0.045 + rand() * 0.035);
      return Number(clamp(val, 0.001, 0.14).toFixed(3));
    })
  );

  const xtTotal = Number(
    xtGrid
      .flat()
      .reduce((acc, v) => acc + v * 0.45, 0)
      .toFixed(2)
  );

  return {
    teamName,
    actualGoals: targetGoalsCount,
    xgTotal: Number(Math.max(xgTotal, targetGoalsCount * 0.42).toFixed(2)),
    xtTotal: Math.max(0.45, xtTotal),
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