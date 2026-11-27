import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { LineupPlayer } from '../../types/matchDetail';
import { PlayerPositionCode, POS_META } from '../../utils/playerPosition';
import { SelectedPlayerPayload } from '../club/ClubSquadTab';

export interface PitchPlayerNode {
  item: LineupPlayer;
  displayPos: PlayerPositionCode;
  profilePos: PlayerPositionCode;
}

interface TacticalPitchViewProps {
  teamName: string;
  formation?: string;
  players: PitchPlayerNode[];
  accentColor?: string;
  onSelectPlayer?: (player: SelectedPlayerPayload) => void;
}

interface PositionedNode extends PitchPlayerNode {
  xPct: number;
  yPct: number;
}

// Chỉnh nhanh kích thước sân và áo đấu tại đây
const PITCH_UI = {
  pitchHeight: 468,
  jerseySize: 38,
  nodeWidth: 64,
};

// Độ sâu chiến thuật (càng nhỏ càng gần khung thành đội nhà) & thiên hướng cánh (-2 trái -> +2 phải)
const POSITION_COORDS_META: Record<
  PlayerPositionCode,
  { depth: number; lateral: number; yNudge?: number }
> = {
  GK: { depth: 0, lateral: 0 },
  CB: { depth: 10, lateral: 0, yNudge: 0.8 },
  LB: { depth: 13, lateral: -2, yNudge: -2.2 },
  RB: { depth: 13, lateral: 2, yNudge: -2.2 },
  LWB: { depth: 18, lateral: -2, yNudge: -2.6 },
  RWB: { depth: 18, lateral: 2, yNudge: -2.6 },
  CDM: { depth: 25, lateral: 0, yNudge: 1.4 },
  CM: { depth: 35, lateral: 0 },
  LM: { depth: 38, lateral: -2, yNudge: -1.0 },
  RM: { depth: 38, lateral: 2, yNudge: -1.0 },
  CAM: { depth: 46, lateral: 0, yNudge: -1.4 },
  LW: { depth: 54, lateral: -2, yNudge: 1.2 },
  RW: { depth: 54, lateral: 2, yNudge: 1.2 },
  CF: { depth: 58, lateral: 0 },
  ST: { depth: 62, lateral: 0, yNudge: -1.0 },
};

const getHorizontalSlots = (count: number): number[] => {
  switch (count) {
    case 1:
      return [50];
    case 2:
      return [34, 66];
    case 3:
      return [21, 50, 79];
    case 4:
      return [13.5, 38, 62, 86.5];
    case 5:
      return [11.5, 30.75, 50, 69.25, 88.5];
    default: {
      if (count <= 0) return [];
      const minX = 11.5;
      const maxX = 88.5;
      const step = (maxX - minX) / (count - 1);
      return Array.from({ length: count }, (_, i) => minX + i * step);
    }
  }
};

const getVerticalLineSlots = (lineCount: number): number[] => {
  switch (lineCount) {
    case 2:
      return [68, 28];
    case 3:
      return [74.5, 49, 22];
    case 4:
      return [75.5, 57.5, 38.5, 19];
    case 5:
      return [76.5, 61.5, 46.5, 31.5, 17];
    default: {
      const startY = 74.5;
      const endY = 20;
      const step = lineCount > 1 ? (startY - endY) / (lineCount - 1) : 0;
      return Array.from({ length: lineCount }, (_, i) => startY - i * step);
    }
  }
};

const parseFormationLines = (formation?: string): number[] | null => {
  if (!formation) return null;
  const parts = formation
    .trim()
    .split(/[-–—]/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);

  const sum = parts.reduce((acc, n) => acc + n, 0);
  return parts.length >= 2 && sum === 10 ? parts : null;
};

/**
 * Sắp xếp các cầu thủ trong cùng 1 hàng ngang từ trái -> phải,
 * đồng thời giữ tiền vệ trụ (CDM) hoặc hộ công (CAM) ở chính giữa bộ 3 trung tâm.
 */
const arrangeLineLaterally = (linePlayers: PitchPlayerNode[]): PitchPlayerNode[] => {
  const byNumber = (a: PitchPlayerNode, b: PitchPlayerNode) =>
    (a.item.player.number || 99) - (b.item.player.number || 99);

  const leftSide = linePlayers
    .filter((p) => (POSITION_COORDS_META[p.displayPos]?.lateral ?? 0) < 0)
    .sort(byNumber);
  const rightSide = linePlayers
    .filter((p) => (POSITION_COORDS_META[p.displayPos]?.lateral ?? 0) > 0)
    .sort(byNumber);
  const centerGroup = linePlayers
    .filter((p) => (POSITION_COORDS_META[p.displayPos]?.lateral ?? 0) === 0)
    .sort(byNumber);

  if (centerGroup.length === 3) {
    const pivotIdx = centerGroup.findIndex(
      (p) => p.displayPos === 'CDM' || p.displayPos === 'CAM'
    );
    if (pivotIdx !== -1 && pivotIdx !== 1) {
      const [pivot] = centerGroup.splice(pivotIdx, 1);
      centerGroup.splice(1, 0, pivot);
    }
  }

  return [...leftSide, ...centerGroup, ...rightSide];
};

const getShortPlayerName = (fullName: string): string => {
  const cleaned = (fullName || '').trim();
  if (!cleaned) return 'N/A';
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return cleaned;
  const last = parts[parts.length - 1];
  if (last.length <= 2 && parts.length >= 3) {
    return `${parts[parts.length - 2]} ${last}`;
  }
  return last;
};

export const TacticalPitchView: React.FC<TacticalPitchViewProps> = ({
  teamName,
  formation,
  players,
  accentColor = '#00E676',
  onSelectPlayer,
}) => {
  const positionedNodes = useMemo<PositionedNode[]>(() => {
    if (players.length === 0) return [];

    const gkIndex = players.findIndex((p) => p.displayPos === 'GK');
    const gkNode = gkIndex >= 0 ? players[gkIndex] : players[0];
    const outfield = players.filter((_, idx) => idx !== (gkIndex >= 0 ? gkIndex : 0));

    const result: PositionedNode[] = [
      {
        ...gkNode,
        xPct: 50,
        yPct: 90.5,
      },
    ];

    const sortedByDepth = [...outfield].sort((a, b) => {
      const metaA = POSITION_COORDS_META[a.displayPos] || { depth: 35, lateral: 0 };
      const metaB = POSITION_COORDS_META[b.displayPos] || { depth: 35, lateral: 0 };
      return metaA.depth - metaB.depth || metaA.lateral - metaB.lateral;
    });

    const parsedLines = parseFormationLines(formation);
    let lines: PitchPlayerNode[][] = [];

    if (parsedLines && sortedByDepth.length === 10) {
      let cursor = 0;
      for (const count of parsedLines) {
        lines.push(sortedByDepth.slice(cursor, cursor + count));
        cursor += count;
      }
    } else {
      const defLine = sortedByDepth.filter((p) => POS_META[p.displayPos].group === 'DEF');
      const midLine = sortedByDepth.filter((p) => POS_META[p.displayPos].group === 'MID');
      const fwdLine = sortedByDepth.filter((p) => POS_META[p.displayPos].group === 'FWD');
      lines = [defLine, midLine, fwdLine].filter((l) => l.length > 0);
    }

    const ySlots = getVerticalLineSlots(lines.length);

    lines.forEach((linePlayers, lineIdx) => {
      const lateralSorted = arrangeLineLaterally(linePlayers);
      const xSlots = getHorizontalSlots(lateralSorted.length);
      const baseYPct = ySlots[lineIdx] ?? 50;

      lateralSorted.forEach((node, idx) => {
        const yNudge =
          lateralSorted.length >= 3
            ? POSITION_COORDS_META[node.displayPos]?.yNudge ?? 0
            : 0;

        result.push({
          ...node,
          xPct: xSlots[idx] ?? 50,
          yPct: Math.max(12, Math.min(82, baseYPct + yNudge)),
        });
      });
    });

    return result;
  }, [players, formation]);

  const halfNodeW = PITCH_UI.nodeWidth / 2;
  const halfJerseyH = PITCH_UI.jerseySize / 2 + 6;

  return (
    <View style={[styles.pitchContainer, { height: PITCH_UI.pitchHeight }]}>
      <Svg width="100%" height="100%" viewBox="0 0 340 468" style={StyleSheet.absoluteFill}>
        {Array.from({ length: 10 }).map((_, idx) => (
          <Rect
            key={`stripe-${idx}`}
            x={0}
            y={idx * 46.8}
            width={340}
            height={46.8}
            fill={idx % 2 === 0 ? '#0E291D' : '#123224'}
          />
        ))}

        <G stroke="rgba(255, 255, 255, 0.24)" strokeWidth={1.5} fill="none">
          <Rect x={12} y={12} width={316} height={444} rx={4} />
          <Line x1={12} y1={234} x2={328} y2={234} />
          <Circle cx={170} cy={234} r={42} />
          <Circle cx={170} cy={234} r={2.5} fill="rgba(255, 255, 255, 0.4)" />

          {/* Vòng cấm trên */}
          <Rect x={76} y={12} width={188} height={68} />
          <Rect x={124} y={12} width={92} height={24} />
          <Circle cx={170} cy={58} r={2} fill="rgba(255, 255, 255, 0.4)" />
          <Path d="M 136 80 A 38 38 0 0 0 204 80" />

          {/* Vòng cấm dưới */}
          <Rect x={76} y={388} width={188} height={68} />
          <Rect x={124} y={432} width={92} height={24} />
          <Circle cx={170} cy={410} r={2} fill="rgba(255, 255, 255, 0.4)" />
          <Path d="M 136 388 A 38 38 0 0 1 204 388" />

          {/* 4 góc sân */}
          <Path d="M 12 20 A 8 8 0 0 0 20 12" />
          <Path d="M 320 12 A 8 8 0 0 0 328 20" />
          <Path d="M 12 448 A 8 8 0 0 1 20 456" />
          <Path d="M 320 456 A 8 8 0 0 1 328 448" />
        </G>
      </Svg>

      {positionedNodes.map((node, idx) => {
        const p = node.item.player;
        const pid = p.id || 0;
        const posMeta = POS_META[node.displayPos] || POS_META.CM;
        const isSubbedOut = Boolean((p as { subbed_out?: boolean }).subbed_out);
        const ringColor = node.displayPos === 'GK' ? '#FFD600' : accentColor;

        return (
          <TouchableOpacity
            key={`${pid}-${p.name}-${idx}`}
            activeOpacity={0.78}
            style={[
              styles.nodeWrapper,
              {
                width: PITCH_UI.nodeWidth,
                marginLeft: -halfNodeW,
                marginTop: -halfJerseyH,
                left: `${node.xPct}%`,
                top: `${node.yPct}%`,
              },
            ]}
            onPress={() =>
              onSelectPlayer?.({
                id: pid,
                name: p.name,
                number: p.number || 0,
                pos: node.profilePos,
                teamName,
              })
            }
          >
            <View
              style={[
                styles.jerseyCircle,
                {
                  width: PITCH_UI.jerseySize,
                  height: PITCH_UI.jerseySize,
                  borderRadius: PITCH_UI.jerseySize / 2,
                  borderColor: ringColor,
                },
              ]}
            >
              <View style={styles.jerseyCollar} />
              <Text style={styles.jerseyNumber}>{p.number || '-'}</Text>

              {isSubbedOut && (
                <View style={styles.subOutDot}>
                  <Text style={styles.subOutText}>↓</Text>
                </View>
              )}

              <View style={[styles.miniPosPill, { backgroundColor: posMeta.color }]}>
                <Text style={styles.miniPosText}>{node.displayPos}</Text>
              </View>
            </View>

            <View style={[styles.namePlate, { maxWidth: PITCH_UI.nodeWidth }]}>
              <Text style={styles.playerName} numberOfLines={1}>
                {getShortPlayerName(p.name)}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  pitchContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E4D38',
    position: 'relative',
  },
  nodeWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  jerseyCircle: {
    backgroundColor: '#101815',
    borderWidth: 2.2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  jerseyCollar: {
    position: 'absolute',
    top: 2,
    width: 12,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  jerseyNumber: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  subOutDot: {
    position: 'absolute',
    top: -4,
    left: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subOutText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 11,
  },
  miniPosPill: {
    position: 'absolute',
    bottom: -5,
    right: -7,
    paddingHorizontal: 4,
    paddingVertical: 0.5,
    borderRadius: 4,
  },
  miniPosText: {
    color: '#0D1117',
    fontSize: 7.5,
    fontWeight: '900',
  },
  namePlate: {
    marginTop: 5,
    backgroundColor: 'rgba(10, 15, 13, 0.88)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  playerName: {
    color: '#F8FAFC',
    fontSize: 9.5,
    fontWeight: '700',
    textAlign: 'center',
  },
});