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
  const rand = createSeededRandom(
    String(match.event_id || `${match.home_team}-${match.away_team}`)
  );

  const identities: MatchTeamIdentities = teamIdentities || {
    home: { footballDataId: match.home_team_id, teamName: match.home_team },
    away: { footballDataId: match.away_team_id, teamName: match.away_team },
  };

  const momentum = buildMatchMomentum(match, stats, events, identities, rand);

  const homeLineup =
    lineups.find((l) => resolveEventSide(l.team, identities) === 'HOME') || lineups[0];
  const awayLineup =
    lineups.find((l) => resolveEventSide(l.team, identities) === 'AWAY') || lineups[1];

  const home = buildTeamProfile('HOME', identities, match, stats, events, homeLineup, rand);
  const away = buildTeamProfile('AWAY', identities, match, stats, events, awayLineup, rand);

  return {
    momentum,
    home,
    away,
    storyInsights: buildStoryInsights(home, away, momentum),
  };
};