import { PlayerPositionCode } from '../utils/playerPosition';

export interface PlayerRadarAxes {
  shooting: number;
  creativity: number;
  passing: number;
  dribbling: number;
  defending: number;
  discipline: number;
}

export interface MatchRatingPoint {
  matchId: string;
  opponent: string;
  dateLabel: string;
  rating: number;
  minutes: number;
  goals: number;
  assists: number;
}

export interface PlayerAnalyticsProfile {
  id: string;
  name: string;
  teamName: string;
  number: number;
  pos: PlayerPositionCode;
  seasonRating: number;
  recent5Rating: number;
  formDelta: number;
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  xg: number;
  xa: number;
  passAccuracy: number;
  tacklesPer90: number;
  interceptionsPer90: number;
  dribblesPer90: number;
  yellowCards: number;
  redCards: number;
  radar: PlayerRadarAxes;
  pros: string[];
  cons: string[];
  formTrend: MatchRatingPoint[];
}

export interface SimilarPlayerResult {
  profile: PlayerAnalyticsProfile;
  similarity: number;
  sharedStrength: string;
}