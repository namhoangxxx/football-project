export interface MatchStats {
  home_possession: number;
  away_possession: number;
  home_shots: number;
  away_shots: number;
  home_shots_on_target: number;
  away_shots_on_target: number;
  home_corners: number;
  away_corners: number;
  home_fouls: number;
  away_fouls: number;
}

export interface MatchEventItem {
  time: { elapsed: number; extra?: number | null };
  team: { id: number; name: string };
  player: { id: number; name: string };
  assist?: { id?: number | null; name?: string | null };
  type: string; // 'Goal' | 'Card' | 'subst' | 'Var'
  detail: string;
}

export interface LineupPlayer {
  player: {
    id: number;
    name: string;
    number: number;
    pos: string;
    grid?: string | null;
  };
}

export interface TeamLineup {
  team: { id: number; name: string; logo?: string };
  formation: string;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
  coach?: { id: number; name: string };
}