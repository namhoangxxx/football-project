export type PlayerPositionCode =
  | 'GK' | 'CB' | 'LB' | 'RB'
  | 'CDM' | 'CM' | 'RM' | 'LM' | 'AM'
  | 'CF' | 'RF' | 'LF';

export type PositionGroup = 'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD';

const VALID_POSITIONS = new Set<PlayerPositionCode>([
  'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'RM', 'LM', 'AM', 'CF', 'RF', 'LF',
]);

export const POS_META: Record<
  PlayerPositionCode,
  { label: string; color: string; group: Exclude<PositionGroup, 'ALL'> }
> = {
  GK: { label: 'Thủ môn', color: '#FFD600', group: 'GK' },
  CB: { label: 'Trung vệ', color: '#38BDF8', group: 'DEF' },
  LB: { label: 'Hậu vệ trái', color: '#38BDF8', group: 'DEF' },
  RB: { label: 'Hậu vệ phải', color: '#38BDF8', group: 'DEF' },
  CDM: { label: 'Tiền vệ phòng ngự', color: '#00E676', group: 'MID' },
  CM: { label: 'Tiền vệ trung tâm', color: '#00E676', group: 'MID' },
  RM: { label: 'Tiền vệ phải', color: '#00E676', group: 'MID' },
  LM: { label: 'Tiền vệ trái', color: '#00E676', group: 'MID' },
  AM: { label: 'Tiền vệ tấn công', color: '#00E676', group: 'MID' },
  CF: { label: 'Trung phong', color: '#FF5252', group: 'FWD' },
  RF: { label: 'Tiền đạo phải', color: '#FF5252', group: 'FWD' },
  LF: { label: 'Tiền đạo trái', color: '#FF5252', group: 'FWD' },
};

export const POS_ORDER: PlayerPositionCode[] = [
  'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'RM', 'LM', 'AM', 'CF', 'RF', 'LF',
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
    CD: 'CB', D: 'CB', DF: 'CB', DEF: 'CB', DEFENDER: 'CB', SW: 'CB',
    LD: 'LB', LWB: 'LB',
    RD: 'RB', RWB: 'RB',
    DM: 'CDM',
    M: 'CM', MF: 'CM', MID: 'CM', MIDFIELDER: 'CM',
    RWM: 'RM', LWM: 'LM', CAM: 'AM',
    F: 'CF', FW: 'CF', FWD: 'CF', FORWARD: 'CF', ATTACKER: 'CF', ST: 'CF', SS: 'CF',
    RW: 'RF', RWF: 'RF',
    LW: 'LF', LWF: 'LF',
  };

  if (espnAndLegacyMap[cleaned]) return espnAndLegacyMap[cleaned];
  if (cleaned.includes('GOAL')) return 'GK';
  if (cleaned.includes('BACK') || cleaned.includes('DEF')) return 'CB';
  if (cleaned.includes('FORW') || cleaned.includes('STRIK')) return 'CF';
  return 'CM';
};