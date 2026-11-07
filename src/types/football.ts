export interface Match {
  id?: number;
  event_id?: number | string;
  home_team: string;
  away_team: string;
  home_team_id?: number;
  away_team_id?: number;
  status: string;
  league?: string;
  home_score?: number | null;
  away_score?: number | null;
  match_time?: string;
  home_icon?: string | null;
  away_icon?: string | null;
  created_at?: string;
}

export interface StandingRow {
  position: number;
  team: {
    id: number;
    name: string;
    crest: string;
  };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalDifference: number;
}