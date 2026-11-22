import { Match } from '../types/football';
import { MatchEventItem, MatchStats, TeamLineup } from '../types/matchDetail';
import {
    BoxEntryArrow,
    DefensiveAction,
    HeatmapZone,
    MatchTacticalReport,
    MatchTeamIdentities,
    MomentumPoint,
    PassLink,
    PassNode,
    ShotPoint,
    SonarBin,
    TeamIdentity,
    TeamSide,
    TeamTacticalProfile,
} from '../types/tactical';

const createSeededRandom = (seedStr: string) => {
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += 0x6d2b79f5;
    let t = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const normalizeStr = (s?: string) =>
  String(s || '')
    .toLowerCase()
    .replace(/\b(fc|cf|afc|sc|ac|as|ss|ssc|rb|vfb|vfl|1\.)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

// Đối chiếu đội bóng dựa trên bản ghi chuẩn từ bảng team_map (ID trước, Tên chuẩn sau)
const matchesTeamIdentity = (
  eventTeam: { id?: number | string; name?: string } | undefined,
  identity: TeamIdentity
): boolean => {
  if (!eventTeam) return false;

  // 1. So khớp tuyệt đối theo ID (espn_id, football_data_id, api_football_id)
  if (eventTeam.id != null) {
    const rawId = Number(eventTeam.id);
    if (!isNaN(rawId) && rawId > 0) {
      if (identity.espnId && rawId === identity.espnId) return true;
      if (identity.footballDataId && rawId === identity.footballDataId) return true;
      if (identity.apiFootballId && rawId === identity.apiFootballId) return true;
    }
  }

  // 2. So khớp theo tên chuẩn đã map sẵn trong team_map (espn_name và team_name)
  const targetName = normalizeStr(eventTeam.name);
  if (!targetName) return false;

  const candidates = [identity.espnName, identity.teamName]
    .map(normalizeStr)
    .filter((c) => c.length > 0);

  return candidates.some(
    (c) => c === targetName || c.includes(targetName) || targetName.includes(c)
  );
};

// Xác định sự kiện thuộc HOME hay AWAY dựa vào team_map
const resolveEventSide = (
  eventTeam: { id?: number | string; name?: string } | undefined,
  identities: MatchTeamIdentities
): TeamSide | null => {
  const isHome = matchesTeamIdentity(eventTeam, identities.home);
  const isAway = matchesTeamIdentity(eventTeam, identities.away);

  if (isHome && !isAway) return 'HOME';
  if (isAway && !isHome) return 'AWAY';
  return null;
};

const getFormationCoordinates = (formation?: string): Array<{ x: number; y: number }> => {
  const clean = (formation || '4-3-3').replace(/[^0-9-]/g, '');
  const lines = clean
    .split('-')
    .map((n) => parseInt(n, 10))
    .filter((n) => !isNaN(n) && n > 0);

  const validLines = lines.length >= 2 ? lines : [4, 3, 3];
  const coords: Array<{ x: number; y: number }> = [{ x: 8, y: 34 }];

  const startX = 24;
  const endX = 82;
  const stepX = validLines.length > 1 ? (endX - startX) / (validLines.length - 1) : 25;

  validLines.forEach((count, lineIdx) => {
    const x = startX + lineIdx * stepX;
    for (let i = 0; i < count; i++) {
      const y = ((i + 1) / (count + 1)) * 68;
      coords.push({ x, y });
    }
  });

  while (coords.length < 11) {
    coords.push({ x: 50, y: 34 });
  }
  return coords.slice(0, 11);
};

const buildTeamProfile = (
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
  const actualScore = Math.max(0, Number(isHome ? match.home_score : match.away_score) || 0);
  const possession = stats ? (isHome ? stats.home_possession : stats.away_possession) : isHome ? 54 : 46;
  const totalShots = Math.max(
    stats ? (isHome ? stats.home_shots : stats.away_shots) : 10,
    actualScore + 2
  );
  const shotsOnTarget = Math.min(
    totalShots,
    Math.max(
      actualScore,
      stats ? (isHome ? stats.home_shots_on_target : stats.away_shots_on_target) : Math.ceil(totalShots * 0.4)
    )
  );
  const corners = stats ? (isHome ? stats.home_corners : stats.away_corners) : 5;
  const fouls = stats ? (isHome ? stats.home_fouls : stats.away_fouls) : 11;

  // Lọc sự kiện chuẩn xác từ team_map
  const teamEvents = events.filter((ev) => resolveEventSide(ev.team, identities) === side);

  const goalEvents = teamEvents.filter(
    (e) => e.type === 'Goal' && !String(e.detail || '').toLowerCase().includes('own')
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
    const x = clamp(83 + rand() * 14, 80, 97.5);
    const y = clamp(22 + rand() * 24, 18, 50);
    const xg = Number((0.28 + rand() * 0.48).toFixed(2));
    xgTotal += xg;
    shots.push({
      id: `${side}-goal-${idx}`,
      team: side,
      x,
      y,
      xg,
      outcome: 'GOAL',
      bodyPart: rand() > 0.75 ? 'HEAD' : rand() > 0.4 ? 'RIGHT_FOOT' : 'LEFT_FOOT',
      playerName: g?.player?.name || pickPlayerName(9 + idx),
      minute: g?.time?.elapsed || Math.floor(15 + rand() * 70),
    });
  }

  const remainingOnTarget = Math.max(0, shotsOnTarget - shots.length);
  for (let i = 0; i < remainingOnTarget; i++) {
    const x = clamp(76 + rand() * 18, 74, 95);
    const y = clamp(16 + rand() * 36, 14, 54);
    const xg = Number((0.08 + rand() * 0.25).toFixed(2));
    xgTotal += xg;
    shots.push({
      id: `${side}-saved-${i}`,
      team: side,
      x,
      y,
      xg,
      outcome: 'SAVED',
      bodyPart: rand() > 0.8 ? 'HEAD' : rand() > 0.45 ? 'RIGHT_FOOT' : 'LEFT_FOOT',
      playerName: pickPlayerName(6 + i),
      minute: Math.floor(5 + rand() * 85),
    });
  }

  const remainingOffTarget = Math.max(0, totalShots - shots.length);
  for (let i = 0; i < remainingOffTarget; i++) {
    const x = clamp(68 + rand() * 24, 65, 93);
    const y = clamp(10 + rand() * 48, 8, 60);
    const xg = Number((0.02 + rand() * 0.11).toFixed(2));
    xgTotal += xg;
    shots.push({
      id: `${side}-off-${i}`,
      team: side,
      x,
      y,
      xg,
      outcome: 'OFF_TARGET',
      bodyPart: rand() > 0.5 ? 'RIGHT_FOOT' : 'LEFT_FOOT',
      playerName: pickPlayerName(4 + i),
      minute: Math.floor(3 + rand() * 87),
    });
  }

  // 2. PASS NETWORK
  const formation = lineup?.formation || '4-3-3';
  const baseCoords = getFormationCoordinates(formation);
  const shiftForward = (possession - 50) * 0.18;

  const nodes: PassNode[] = baseCoords.map((pt, idx) => {
    const p = startXI[idx]?.player;
    const isMidfielder = idx >= 5 && idx <= 8;
    return {
      id: `${side}-node-${idx}`,
      number: p?.number || idx + 1,
      name: p?.name ? p.name.split(' ').slice(-1)[0] : `#${idx + 1}`,
      pos: p?.pos || (idx === 0 ? 'G' : idx <= 4 ? 'D' : idx <= 7 ? 'M' : 'F'),
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
        const weight = clamp(Math.round(((32 - dist) / 32) * 8 * (possession / 50) + rand() * 2), 1, 10);
        links.push({ fromId: nodes[i].id, toId: nodes[j].id, weight });
      }
    }
  }
  const topNode = [...nodes].sort((a, b) => b.touches - a.touches)[0];

  // 3. HEATMAP & FIELD TILT
  const attThird = clamp(Math.round(possession * 0.58 + (totalShots - 10) * 0.8), 18, 48);
  const defThird = clamp(Math.round((100 - possession) * 0.52), 16, 44);
  const midThird = Math.max(20, 100 - attThird - defThird);

  const heatmapZones: HeatmapZone[] = [];
  for (let i = 0; i < 26; i++) {
    const zoneRoll = rand() * 100;
    const x =
      zoneRoll < defThird
        ? 8 + rand() * 25
        : zoneRoll < defThird + midThird
        ? 34 + rand() * 32
        : 67 + rand() * 28;
    const y = 6 + rand() * 56;
    heatmapZones.push({
      x,
      y,
      intensity: Number((0.35 + rand() * 0.65).toFixed(2)),
    });
  }

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
  const ppda = Number(clamp(16.5 - (possession - 40) * 0.18 - fouls * 0.08, 6.2, 18.5).toFixed(1));
  const pressingStyle =
    ppda <= 9.5
      ? 'High Block (Pressing tầm cao)'
      : ppda <= 13.0
      ? 'Mid Block (Khối trung bình)'
      : 'Low Block (Phòng ngự lùi sâu)';

  const defensiveActions: DefensiveAction[] = [];
  const actionTypes: DefensiveAction['type'][] = ['TACKLE', 'INTERCEPTION', 'RECOVERY', 'TURNOVER'];
  for (let i = 0; i < 24; i++) {
    const highPressShift = ppda <= 10 ? 22 : ppda <= 13 ? 10 : -5;
    const x = clamp(22 + highPressShift + rand() * 55, 8, 92);
    const y = clamp(6 + rand() * 56, 5, 63);
    defensiveActions.push({
      x,
      y,
      type: actionTypes[i % actionTypes.length],
    });
  }

  // 6. BOX ENTRY MAP
  const boxEntries: BoxEntryArrow[] = [];
  const entryCount = clamp(Math.round(totalShots * 1.1 + corners * 0.8), 6, 18);
  for (let i = 0; i < entryCount; i++) {
    const isCross = i < corners || rand() > 0.55;
    const fromTopWing = rand() > 0.5;
    const startX = isCross ? 74 + rand() * 22 : 62 + rand() * 18;
    const startY = isCross ? (fromTopWing ? 3 + rand() * 12 : 53 + rand() * 12) : 18 + rand() * 32;
    const endX = 85 + rand() * 12;
    const endY = 22 + rand() * 24;
    boxEntries.push({
      startX,
      startY,
      endX,
      endY,
      type: isCross ? 'CROSS' : rand() > 0.5 ? 'THROUGH_BALL' : 'CARRY',
      successful: rand() > 0.48,
    });
  }

  // 7. THREAT MATRIX (xT GRID 12x8)
  const xtGrid: number[][] = Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 12 }, (_, col) => {
      const colFactor = Math.pow((col + 1) / 12, 2.1);
      const centerDist = Math.abs(row - 3.5) / 3.5;
      const rowFactor = 1 - centerDist * 0.45;
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

export const generateMatchTacticalReport = (
  match: Match,
  stats: MatchStats | null,
  events: MatchEventItem[],
  lineups: TeamLineup[],
  teamIdentities?: MatchTeamIdentities
): MatchTacticalReport => {
  const rand = createSeededRandom(String(match.event_id || `${match.home_team}-${match.away_team}`));

  const identities: MatchTeamIdentities = teamIdentities || {
    home: { footballDataId: match.home_team_id, teamName: match.home_team },
    away: { footballDataId: match.away_team_id, teamName: match.away_team },
  };

  const homePoss = stats?.home_possession ?? 52;
  const shotDiff = ((stats?.home_shots ?? 10) - (stats?.away_shots ?? 9)) * 3;
  const baseBias = (homePoss - 50) * 1.4 + shotDiff;

  // Match Momentum 18 mốc
  const momentum: MomentumPoint[] = [];
  for (let m = 5; m <= 90; m += 5) {
    const windowEvents = events.filter((e) => {
      const min = e.time?.elapsed || 0;
      if (m === 90) return min > 85;
      return min > m - 5 && min <= m;
    });

    let eventSwing = 0;
    const goals: TeamSide[] = [];
    let hasCard: TeamSide | undefined;

    windowEvents.forEach((ev) => {
      const side = resolveEventSide(ev.team, identities);
      if (!side) return;
      const sign = side === 'HOME' ? 1 : -1;

      if (ev.type === 'Goal') {
        eventSwing += sign * 42;
        goals.push(side);
      } else if (ev.type === 'Card') {
        eventSwing -= sign * 18;
        hasCard = side;
      } else if (ev.type === 'subst') {
        eventSwing += sign * 10;
      }
    });

    const wave = Math.sin(m / 14) * 26 + (rand() - 0.5) * 34;
    const rawVal = baseBias + wave + eventSwing;
    momentum.push({
      minute: m,
      value: Math.round(clamp(rawVal, -95, 95)),
      goals,
      hasCard,
    });
  }

  // Khớp chính xác lineup từ team_map
  const homeLineup =
    lineups.find((l) => resolveEventSide(l.team, identities) === 'HOME') || lineups[0];
  const awayLineup =
    lineups.find((l) => resolveEventSide(l.team, identities) === 'AWAY') || lineups[1];

  return {
    momentum,
    home: buildTeamProfile('HOME', identities, match, stats, events, homeLineup, rand),
    away: buildTeamProfile('AWAY', identities, match, stats, events, awayLineup, rand),
  };
};