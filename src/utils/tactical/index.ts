import { Match } from '../../types/football';
import { MatchEventItem, MatchStats, TeamLineup } from '../../types/matchDetail';
import { MatchTacticalReport, MatchTeamIdentities } from '../../types/tactical';
import { buildMatchMomentum, buildStoryInsights } from './storyInsightsBuilder';
import { createSeededRandom, resolveEventSide } from './tacticalHelpers';
import { buildTeamProfile } from './teamProfileBuilder';

export const generateMatchTacticalReport = (
  match: Match,
  stats: MatchStats | null,
  events: MatchEventItem[],
  lineups: TeamLineup[],
  teamIdentities?: MatchTeamIdentities
): MatchTacticalReport => {
  const baseSeed = String(match.event_id || `${match.home_team}-${match.away_team}`);
  const momRand = createSeededRandom(`${baseSeed}-momentum`);
  const homeRand = createSeededRandom(`${baseSeed}-home`);
  const awayRand = createSeededRandom(`${baseSeed}-away`);

  const identities: MatchTeamIdentities = teamIdentities || {
    home: { footballDataId: match.home_team_id, teamName: match.home_team },
    away: { footballDataId: match.away_team_id, teamName: match.away_team },
  };

  const momentum = buildMatchMomentum(match, stats, events, identities, momRand);

  const matchedHome = lineups.find((l) => resolveEventSide(l.team, identities) === 'HOME');
  const matchedAway = lineups.find((l) => resolveEventSide(l.team, identities) === 'AWAY');

  const homeLineup =
    matchedHome || (matchedAway ? lineups.find((l) => l !== matchedAway) : lineups[0]);
  const awayLineup =
    matchedAway || (homeLineup ? lineups.find((l) => l !== homeLineup) : lineups[1]);

  const home = buildTeamProfile('HOME', identities, match, stats, events, homeLineup, homeRand);
  const away = buildTeamProfile('AWAY', identities, match, stats, events, awayLineup, awayRand);

  return {
    momentum,
    home,
    away,
    storyInsights: buildStoryInsights(home, away, momentum),
  };
};