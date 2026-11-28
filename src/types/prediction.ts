export interface ScorelineProbability {
  homeGoals: number;
  awayGoals: number;
  probability: number;
  label: string;       
}

export interface MatchPredictionMetrics {
  expectedHomeGoals: number;
  expectedAwayGoals: number; 
  homeWinProb: number;       
  drawProb: number;          
  awayWinProb: number;      
  over25Prob: number;        
  under25Prob: number;     
  bttsYesProb: number;     
  bttsNoProb: number;        
  scoreMatrix: number[][];  
  maxMatrixProb: number;     
  topScorelines: ScorelineProbability[];
}