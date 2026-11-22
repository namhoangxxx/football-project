export type TeamSide = 'HOME' | 'AWAY';

export interface TeamIdentity {
  footballDataId?: number;
  espnId?: number;
  apiFootballId?: number;
  teamName: string;
  espnName?: string;
}

export interface MatchTeamIdentities {
  home: TeamIdentity;
  away: TeamIdentity;
}

export interface MomentumPoint {
  minute: number; // 5, 10, 15, ..., 90
  value: number; // Dương (+): Đội nhà ép sân, Âm (-): Đội khách ép sân (-100 đến +100)
  goals?: TeamSide[]; // Danh sách tất cả bàn thắng trong khoảng 5 phút này (kể cả 90+)
  hasCard?: TeamSide;
}

export interface ShotPoint {
  id: string;
  team: TeamSide;
  x: number; // 0 -> 100 (tọa độ hướng về khung thành đối phương ở x = 100)
  y: number; // 0 -> 68
  xg: number; // 0.01 -> 0.95
  outcome: 'GOAL' | 'SAVED' | 'OFF_TARGET';
  bodyPart: 'RIGHT_FOOT' | 'LEFT_FOOT' | 'HEAD';
  playerName: string;
  minute: number;
}

export interface PassNode {
  id: string;
  number: number;
  name: string;
  pos: string;
  x: number; // 0 -> 100
  y: number; // 0 -> 68
  touches: number;
}

export interface PassLink {
  fromId: string;
  toId: string;
  weight: number; // 1 -> 10 (độ dày đường chuyền)
}

export interface TeamPassNetwork {
  formation: string;
  nodes: PassNode[];
  links: PassLink[];
  playmakerName: string;
}

export interface HeatmapZone {
  x: number;
  y: number;
  intensity: number; // 0.1 -> 1.0
}

export interface SonarBin {
  angleDeg: number; // 0, 30, 60, ..., 330
  frequency: number; // 0.1 -> 1.0 (bán kính cánh hoa)
  avgDistance: number; // mét
}

export interface DefensiveAction {
  x: number;
  y: number;
  type: 'TACKLE' | 'INTERCEPTION' | 'RECOVERY' | 'TURNOVER';
}

export interface BoxEntryArrow {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  type: 'CROSS' | 'THROUGH_BALL' | 'CARRY';
  successful: boolean;
}

export interface TeamTacticalProfile {
  teamName: string;
  xgTotal: number;
  xtTotal: number;
  ppda: number;
  pressingStyle: 'High Block (Pressing tầm cao)' | 'Mid Block (Khối trung bình)' | 'Low Block (Phòng ngự lùi sâu)';
  fieldTilt: { defThird: number; midThird: number; attThird: number };
  shots: ShotPoint[];
  passNetwork: TeamPassNetwork;
  heatmapZones: HeatmapZone[];
  sonarBins: SonarBin[];
  defensiveActions: DefensiveAction[];
  boxEntries: BoxEntryArrow[];
  xtGrid: number[][]; // Lưới 12 cột x 8 hàng
}

export interface MatchTacticalReport {
  momentum: MomentumPoint[];
  home: TeamTacticalProfile;
  away: TeamTacticalProfile;
}