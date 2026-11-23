import { Share } from 'react-native';
import { Match } from '../types/football';
import { PlayerAnalyticsProfile } from '../types/playerAnalytics';
import { MatchTacticalReport } from '../types/tactical';

export async function shareMatchTacticalReport(
  match: Match,
  report: MatchTacticalReport
): Promise<void> {
  const scoreText = `${match.home_score ?? 0} - ${match.away_score ?? 0}`;
  const summaryLines = report.storyInsights.map((line) => `• ${line}`).join('\n');

  const message = [
    `📊 [BALLMETRICS] PHÂN TÍCH CHIẾN THUẬT CHUYÊN SÂU`,
    `⚽ ${match.home_team} ${scoreText} ${match.away_team} (${match.league || 'Giải đấu'})`,
    ``,
    `📈 Chỉ số đối đầu (H2H):`,
    `- Bàn thắng kỳ vọng (xG): ${report.home.xgTotal.toFixed(2)} vs ${report.away.xgTotal.toFixed(2)}`,
    `- Mối đe dọa tấn công (xT): +${report.home.xtTotal.toFixed(2)} vs +${report.away.xtTotal.toFixed(2)}`,
    `- Cường độ Pressing (PPDA): ${report.home.ppda} vs ${report.away.ppda}`,
    `- Kiểm soát 1/3 sân đối phương: ${report.home.fieldTilt.attThird}% vs ${report.away.fieldTilt.attThird}%`,
    ``,
    `🧠 Nhận định chiến thuật:`,
    summaryLines,
    ``,
    `#BallMetrics #FootballAnalytics #xG #Tactics`,
  ].join('\n');

  await Share.share({ message });
}

export async function sharePlayerAnalyticsReport(
  profile: PlayerAnalyticsProfile
): Promise<void> {
  const prosText = profile.pros.map((p) => `+ ${p}`).join('\n');
  const consText = profile.cons.map((c) => `- ${c}`).join('\n');

  const message = [
    `⭐ [BALLMETRICS] HỒ SƠ PHÂN TÍCH CẦU THỦ`,
    `🏃 ${profile.name} (#${profile.number || '-'} • ${profile.pos}) - ${profile.teamName}`,
    ``,
    `📊 Phong độ & Hiệu suất:`,
    `- Điểm Rating mùa giải: ${profile.seasonRating.toFixed(2)} (5 trận gần nhất: ${profile.recent5Rating.toFixed(2)})`,
    `- Đóng góp: ${profile.goals} bàn (${profile.xg} xG) | ${profile.assists} kiến tạo (${profile.xa} xA)`,
    `- Chuyền chuẩn: ${profile.passAccuracy}% | Tắc bóng/90p: ${profile.tacklesPer90} | Rê bóng/90p: ${profile.dribblesPer90}`,
    ``,
    `✅ Điểm mạnh:`,
    prosText,
    `⚠️ Cần cải thiện:`,
    consText,
    ``,
    `#BallMetrics #PlayerProfiling #Scouting`,
  ].join('\n');

  await Share.share({ message });
}