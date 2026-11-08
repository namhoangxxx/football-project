export type RootStackParamList = {
  Home: undefined;
  Standings: undefined;
  // Sửa đoạn khai báo ClubDetailScreen
  ClubDetailScreen: { 
    teamId: number; 
    teamName: string;
  };
  MatchDetailScreen: {
    matchId: number;
  };
};