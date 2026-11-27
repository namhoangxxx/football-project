export type PlayerPositionCode =
  | 'GK'
  | 'CB' | 'LB' | 'RB' | 'LWB' | 'RWB'
  | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM'
  | 'LW' | 'RW' | 'CF' | 'ST';

export type PositionGroup = 'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD';

const VALID_POSITIONS = new Set<PlayerPositionCode>([
  'GK',
  'CB', 'LB', 'RB', 'LWB', 'RWB',
  'CDM', 'CM', 'CAM', 'LM', 'RM',
  'LW', 'RW', 'CF', 'ST',
]);

export const POS_META: Record<
  PlayerPositionCode,
  { label: string; color: string; group: Exclude<PositionGroup, 'ALL'> }
> = {
  GK: { label: 'Thủ môn', color: '#FFD600', group: 'GK' },
  CB: { label: 'Trung vệ', color: '#38BDF8', group: 'DEF' },
  LB: { label: 'Hậu vệ trái', color: '#38BDF8', group: 'DEF' },
  RB: { label: 'Hậu vệ phải', color: '#38BDF8', group: 'DEF' },
  LWB: { label: 'Hậu vệ cánh trái', color: '#38BDF8', group: 'DEF' },
  RWB: { label: 'Hậu vệ cánh phải', color: '#38BDF8', group: 'DEF' },
  CDM: { label: 'Tiền vệ phòng ngự', color: '#00E676', group: 'MID' },
  CM: { label: 'Tiền vệ trung tâm', color: '#00E676', group: 'MID' },
  CAM: { label: 'Tiền vệ tấn công', color: '#00E676', group: 'MID' },
  LM: { label: 'Tiền vệ trái', color: '#00E676', group: 'MID' },
  RM: { label: 'Tiền vệ phải', color: '#00E676', group: 'MID' },
  LW: { label: 'Tiền đạo cánh trái', color: '#FF5252', group: 'FWD' },
  RW: { label: 'Tiền đạo cánh phải', color: '#FF5252', group: 'FWD' },
  CF: { label: 'Tiền đạo lùi', color: '#FF5252', group: 'FWD' },
  ST: { label: 'Trung phong', color: '#FF5252', group: 'FWD' },
};

export const POS_ORDER: PlayerPositionCode[] = [
  'GK',
  'CB', 'LB', 'RB', 'LWB', 'RWB',
  'CDM', 'CM', 'CAM', 'LM', 'RM',
  'LW', 'RW', 'CF', 'ST',
];

export const normalizePositionCode = (raw?: string): PlayerPositionCode => {
  const cleaned = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/-(L|R|C)$/i, '');

  if (VALID_POSITIONS.has(cleaned as PlayerPositionCode)) {
    return cleaned as PlayerPositionCode;
  }

  const espnAndLegacyMap: Record<string, PlayerPositionCode> = {
    G: 'GK', GOALKEEPER: 'GK',
    CD: 'CB', D: 'CB', DF: 'CB', DEF: 'CB', DEFENDER: 'CB', LCB: 'CB', RCB: 'CB', SW: 'CB',
    LD: 'LB',
    RD: 'RB',
    DM: 'CDM', LDM: 'CDM', RDM: 'CDM',
    M: 'CM', MF: 'CM', MID: 'CM', MIDFIELDER: 'CM', LCM: 'CM', RCM: 'CM',
    AM: 'CAM', LAM: 'CAM', RAM: 'CAM',
    LWM: 'LM',
    RWM: 'RM',
    LF: 'LW', LWF: 'LW',
    RF: 'RW', RWF: 'RW',
    F: 'CF', FW: 'CF', FWD: 'CF', FORWARD: 'CF', ATTACKER: 'CF', SS: 'CF',
    LS: 'ST', RS: 'ST', STRIKER: 'ST',
  };

  if (espnAndLegacyMap[cleaned]) return espnAndLegacyMap[cleaned];
  if (cleaned.includes('GOAL')) return 'GK';
  if (cleaned.includes('WING') && cleaned.includes('BACK')) {
    return cleaned.includes('LEFT') ? 'LWB' : 'RWB';
  }
  if (cleaned.includes('BACK') || cleaned.includes('DEF')) return 'CB';
  if (cleaned.includes('STRIK')) return 'ST';
  if (cleaned.includes('FORW')) return 'CF';
  return 'CM';
};