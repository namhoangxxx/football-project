import { Match } from '../../types/football';
import { MatchEventItem, MatchStats } from '../../types/matchDetail';
import {
  MatchTeamIdentities,
  MomentumPoint,
  TeamSide,
  TeamTacticalProfile,
} from '../../types/tactical';
import { clamp, resolveEventSide } from './tacticalHelpers';

export const buildMatchMomentum = (
  match: Match,
  stats: MatchStats | null,
  events: MatchEventItem[],
  identities: MatchTeamIdentities,
  rand: () => number
): MomentumPoint[] => {
  const homePoss = stats?.home_possession ?? 52;
  const shotDiff = ((stats?.home_shots ?? 10) - (stats?.away_shots ?? 9)) * 3;
  const baseBias = (homePoss - 50) * 1.4 + shotDiff;

  const momentum: MomentumPoint[] = [];
  for (let m = 5; m <= 90; m += 5) {
    const windowEvents = events.filter((e) => {
      const min = e.time?.elapsed || 0;
      if (m === 90) return min > 85;
      return min > m - 5 && min <= m;
    });

    let eventSwing = 0;
    const goals: TeamSide[] = [];
    let hasCard: TeamSide | undefined;

    windowEvents.forEach((ev) => {
      const side = resolveEventSide(ev.team, identities);
      if (!side) return;
      const sign = side === 'HOME' ? 1 : -1;

      if (ev.type === 'Goal') {
        eventSwing += sign * 42;
        goals.push(side);
      } else if (ev.type === 'Card') {
        eventSwing -= sign * 18;
        hasCard = side;
      } else if (ev.type === 'subst') {
        eventSwing += sign * 10;
      }
    });

    const wave = Math.sin(m / 14) * 26 + (rand() - 0.5) * 34;
    const rawVal = baseBias + wave + eventSwing;
    momentum.push({
      minute: m,
      value: Math.round(clamp(rawVal, -95, 95)),
      goals,
      hasCard,
    });
  }

  return momentum;
};

export const buildStoryInsights = (
  home: TeamTacticalProfile,
  away: TeamTacticalProfile,
  momentum: MomentumPoint[]
): string[] => {
  const insights: string[] = [];

  const xgDiff = home.xgTotal - away.xgTotal;
  if (Math.abs(xgDiff) >= 0.45) {
    const dominant = xgDiff > 0 ? home : away;
    const rival = xgDiff > 0 ? away : home;
    insights.push(
      `Thế trận tấn công: ${dominant.teamName} tạo ra lượng cơ hội nguy hiểm vượt trội (${dominant.xgTotal.toFixed(2)} xG so với ${rival.xgTotal.toFixed(2)} xG của ${rival.teamName}).`
    );
  } else {
    insights.push(
      `Thế trận giằng co: Hai đội tạo ra chất lượng cơ hội ngang ngửa (${home.teamName} ${home.xgTotal.toFixed(2)} xG — ${away.teamName} ${away.xgTotal.toFixed(2)} xG).`
    );
  }

  const homeClinical = home.actualGoals - home.xgTotal;
  const awayClinical = away.actualGoals - away.xgTotal;
  if (homeClinical >= 0.8) {
    insights.push(
      `Dứt điểm bùng nổ: ${home.teamName} ghi tới ${home.actualGoals} bàn dù chỉ số kỳ vọng chỉ là ${home.xgTotal.toFixed(2)} xG — tận dụng cơ hội cực sắc bén.`
    );
  } else if (awayClinical >= 0.8) {
    insights.push(
      `Dứt điểm bùng nổ: ${away.teamName} ghi tới ${away.actualGoals} bàn từ ${away.xgTotal.toFixed(2)} xG — hiệu suất chuyển hóa cơ hội ấn tượng.`
    );
  } else if (homeClinical <= -0.9) {
    insights.push(
      `Phung phí cơ hội: ${home.teamName} tạo ra ${home.xgTotal.toFixed(2)} xG nhưng chỉ có ${home.actualGoals} bàn thắng.`
    );
  } else if (awayClinical <= -0.9) {
    insights.push(
      `Phung phí cơ hội: ${away.teamName} tạo ra ${away.xgTotal.toFixed(2)} xG nhưng chỉ ghi được ${away.actualGoals} bàn.`
    );
  }

  const firstHalfAvg = momentum.slice(0, 9).reduce((s, p) => s + p.value, 0) / 9;
  const secondHalfAvg = momentum.slice(9).reduce((s, p) => s + p.value, 0) / 9;
  if (firstHalfAvg < -10 && secondHalfAvg > 12) {
    insights.push(
      `Bước ngoặt hiệp 2: Sau khi để ${away.teamName} lấn lướt trong hiệp 1, ${home.teamName} vùng lên kiểm soát hoàn toàn thế trận sau giờ nghỉ.`
    );
  } else if (firstHalfAvg > 10 && secondHalfAvg < -12) {
    insights.push(
      `Bước ngoặt hiệp 2: ${away.teamName} điều chỉnh lối chơi hiệu quả sau giờ nghỉ và giành lại quyền áp đặt trong 45 phút cuối.`
    );
  }

  const higherPresser = home.ppda < away.ppda ? home : away;
  insights.push(
    `Cường độ Pressing: ${higherPresser.teamName} áp sát quyết liệt hơn (PPDA ${higherPresser.ppda} — ${higherPresser.pressingStyle.split(' ')[0]} ${higherPresser.pressingStyle.split(' ')[1]}), với ${higherPresser.passNetwork.playmakerName} là trạm luân chuyển bóng chính.`
  );

  return insights.slice(0, 4);
};