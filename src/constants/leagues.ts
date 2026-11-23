export interface LeagueFilterItem {
  key: string;
  label: string;
  keywords: string[];
}

export const LEAGUE_FILTERS: LeagueFilterItem[] = [
  { key: 'ALL', label: 'Tất cả', keywords: [] },
  { key: 'PL', label: 'Premier League', keywords: ['premier'] },
  { key: 'PD', label: 'La Liga', keywords: ['primera', 'la liga', 'laliga'] },
  { key: 'SA', label: 'Serie A', keywords: ['serie a'] },
  { key: 'BL1', label: 'Bundesliga', keywords: ['bundesliga'] },
  { key: 'FL1', label: 'Ligue 1', keywords: ['ligue 1'] },
  { key: 'CL', label: 'Champions League', keywords: ['champions'] },
  { key: 'EL', label: 'Europa League', keywords: ['europa league'] },
  { key: 'ECL', label: 'Conference League', keywords: ['conference'] },
];