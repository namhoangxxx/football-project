export type RootStackParamList = {
  Home: undefined;
  Standings: undefined;
  ClubDetailScreen: {
    teamId: number;
    teamName: string;
    logoUrl?: string;
  };
  MatchDetailScreen: {
    matchId: string | number;
  };
};