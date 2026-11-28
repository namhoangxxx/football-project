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
  const isScheduled =
    match.status === 'SCHEDULED' ||
    match.status === 'TIMED' ||
    match.status === 'NOT_STARTED';

  if (isScheduled) {
    return [];
  }

  const homePoss = stats?.home_possession ?? 52;
  const shotDiff = ((stats?.home_shots ?? 10) - (stats?.away_shots ?? 9)) * 3;
  const baseBias = (homePoss - 50) * 1.4 + shotDiff;

  // Lọc sự kiện trong 120 phút thi đấu chính thức & hiệp phụ (bỏ loạt luân lưu)
  const validEvents = events.filter((e) => {
    const min = Number(e.time?.elapsed) || 0;
    return min > 0 && min <= 120;
  });

  const momentum: MomentumPoint[] = [];
  for (let m = 5; m <= 90; m += 5) {
    const windowEvents = validEvents.filter((e) => {
      const min = Number(e.time?.elapsed) || 0;
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
      const evType = String(ev.type || '').toLowerCase();
      const detail = String(ev.detail || '').toLowerCase();

      if (evType === 'goal') {
        if (detail.includes('missed')) {
          // Bỏ lỡ phạt đền làm giảm hưng phấn của đội sút hỏng
          eventSwing -= sign * 16;
          return;
        }
        eventSwing += sign * 42;
        goals.push(side);
      } else if (evType === 'card') {
        const isRed = detail.includes('red') || detail.includes('second yellow');
        eventSwing -= sign * (isRed ? 36 : 12);
        hasCard = side;
      } else if (evType === 'subst') {
        eventSwing += sign * 8;
      }
    });

    const wave = Math.sin(m / 14) * 24 + (rand() - 0.5) * 30;
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
  const isPreMatch =
    momentum.length === 0 && home.xgTotal === 0 && away.xgTotal === 0;

  if (isPreMatch) {
    const higherPresser = home.ppda <= away.ppda ? home : away;
    const pressLabel = higherPresser.pressingStyle.split(' (')[0];
    insights.push(
      `Cấu trúc sơ đồ: ${home.teamName} (${home.passNetwork.formation}) đối đầu ${away.teamName} (${away.passNetwork.formation}) — điểm nóng tập trung ở khu vực trung tuyến.`
    );
    insights.push(
      `Dự phóng lối chơi: ${higherPresser.teamName} có xu hướng đẩy cao đội hình (${pressLabel}, PPDA dự kiến ${higherPresser.ppda}) với hạt nhân ${higherPresser.passNetwork.playmakerName}.`
    );
    return insights;
  }

  // 1. Tương quan cơ hội (xG)
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

  // 2. Hiệu quả chuyển hóa cơ hội (Goals vs xG)
  const homeClinical = home.actualGoals - home.xgTotal;
  const awayClinical = away.actualGoals - away.xgTotal;
  if (homeClinical >= 0.75) {
    insights.push(
      `Dứt điểm bùng nổ: ${home.teamName} ghi tới ${home.actualGoals} bàn dù chỉ số kỳ vọng chỉ là ${home.xgTotal.toFixed(2)} xG — tận dụng cơ hội cực sắc bén.`
    );
  } else if (awayClinical >= 0.75) {
    insights.push(
      `Dứt điểm bùng nổ: ${away.teamName} ghi tới ${away.actualGoals} bàn từ ${away.xgTotal.toFixed(2)} xG — hiệu suất chuyển hóa cơ hội ấn tượng.`
    );
  } else if (homeClinical <= -0.85) {
    insights.push(
      `Phung phí cơ hội: ${home.teamName} tạo ra ${home.xgTotal.toFixed(2)} xG nhưng chỉ có ${home.actualGoals} bàn thắng.`
    );
  } else if (awayClinical <= -0.85) {
    insights.push(
      `Phung phí cơ hội: ${away.teamName} tạo ra ${away.xgTotal.toFixed(2)} xG nhưng chỉ ghi được ${away.actualGoals} bàn.`
    );
  }

  // 3. Bước ngoặt giữa 2 hiệp từ Momentum
  const firstHalfPts = momentum.filter((p) => p.minute <= 45);
  const secondHalfPts = momentum.filter((p) => p.minute > 45);
  const firstHalfAvg =
    firstHalfPts.reduce((s, p) => s + p.value, 0) / Math.max(1, firstHalfPts.length);
  const secondHalfAvg =
    secondHalfPts.reduce((s, p) => s + p.value, 0) / Math.max(1, secondHalfPts.length);

  if (firstHalfAvg < -10 && secondHalfAvg > 12) {
    insights.push(
      `Bước ngoặt hiệp 2: Sau khi để ${away.teamName} lấn lướt trong hiệp 1, ${home.teamName} vùng lên kiểm soát hoàn toàn thế trận sau giờ nghỉ.`
    );
  } else if (firstHalfAvg > 10 && secondHalfAvg < -12) {
    insights.push(
      `Bước ngoặt hiệp 2: ${away.teamName} điều chỉnh lối chơi hiệu quả sau giờ nghỉ và giành lại quyền áp đặt trong 45 phút cuối.`
    );
  } else {
    // Ưu thế lãnh thổ (Field Tilt) nếu không có đảo chiều giữa hiệp
    const tiltDiff = home.fieldTilt.attThird - away.fieldTilt.attThird;
    if (Math.abs(tiltDiff) >= 8) {
      const territorialLeader = tiltDiff > 0 ? home : away;
      insights.push(
        `Áp đặt lãnh thổ: ${territorialLeader.teamName} duy trì sức ép lớn ở 1/3 sân đối phương (${territorialLeader.fieldTilt.attThird}% Field Tilt, +${territorialLeader.xtTotal.toFixed(2)} xT).`
      );
    }
  }

  // 4. Cường độ Pressing & Trạm luân chuyển bóng
  const higherPresser = home.ppda <= away.ppda ? home : away;
  const pressLabel = higherPresser.pressingStyle.split(' (')[0];
  insights.push(
    `Cường độ Pressing: ${higherPresser.teamName} áp sát quyết liệt hơn (PPDA ${higherPresser.ppda} — ${pressLabel}), với ${higherPresser.passNetwork.playmakerName} là trạm luân chuyển bóng chính.`
  );

  return insights.slice(0, 4);
};