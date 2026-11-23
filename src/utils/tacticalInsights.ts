import { Match } from '../types/football';
import { MatchStats } from '../types/matchDetail';

export interface TacticalInsightItem {
  tag: string;
  color: string;
  text: string;
}

const parseNum = (val: any, fallback = 0): number => {
  if (val === null || val === undefined) return fallback;
  const cleaned = String(val).replace('%', '').trim();
  const num = Number(cleaned);
  return Number.isNaN(num) ? fallback : num;
};

export function generateTacticalInsights(
  match: Match,
  stats: MatchStats | null
): TacticalInsightItem[] {
  const home = match.home_team;
  const away = match.away_team;
  const insights: TacticalInsightItem[] = [];

  if (!stats) {
    return [
      {
        tag: 'Tổng quan',
        color: '#38BDF8',
        text: `Trận đấu giữa ${home} và ${away} đang sử dụng mô hình mô phỏng không gian sân dựa trên diễn biến thực tế.`,
      },
    ];
  }

  const homePoss = parseNum((stats as any).home_possession ?? (stats as any).possession_home, 50);
  const awayPoss = parseNum((stats as any).away_possession ?? (stats as any).possession_away, 100 - homePoss);
  const homeXg = parseNum((stats as any).home_xg ?? (stats as any).xg_home, 0);
  const awayXg = parseNum((stats as any).away_xg ?? (stats as any).xg_away, 0);
  const homeShots = parseNum((stats as any).home_shots ?? (stats as any).shots_home, 0);
  const awayShots = parseNum((stats as any).away_shots ?? (stats as any).shots_away, 0);

  // 1. Phân tích quyền kiểm soát bóng vs chất lượng cơ hội (xG)
  if (homePoss >= 60 && homeXg < awayXg && awayXg > 0) {
    insights.push({
      tag: 'Cảnh báo kiểm soát ảo',
      color: '#FACC15',
      text: `${home} cầm bóng tới ${homePoss}% nhưng chỉ số bàn thắng kỳ vọng (xG ${homeXg.toFixed(2)}) lại thấp hơn ${away} (${awayXg.toFixed(2)}), cho thấy lối chơi chuyền nhiều nhưng thiếu đột biến vào vùng nguy hiểm (xT).`,
    });
  } else if (awayPoss >= 60 && awayXg < homeXg && homeXg > 0) {
    insights.push({
      tag: 'Phản công sắc bén',
      color: '#00E676',
      text: `${home} nhường thế trận (${homePoss}% bóng) nhưng tạo ra chất lượng cơ hội vượt trội (xG ${homeXg.toFixed(2)} so với ${awayXg.toFixed(2)}) nhờ các pha chuyển trạng thái trực diện.`,
    });
  } else if (Math.abs(homePoss - awayPoss) >= 14) {
    const dominant = homePoss > awayPoss ? home : away;
    const domPoss = Math.max(homePoss, awayPoss);
    insights.push({
      tag: 'Áp đặt thế trận',
      color: '#00E676',
      text: `${dominant} làm chủ khu trung tuyến với ${domPoss}% thời lượng kiểm soát bóng, liên tục dồn ép đối phương lùi sâu phòng ngự (Low Block).`,
    });
  } else {
    insights.push({
      tag: 'Thế trận giằng co',
      color: '#38BDF8',
      text: `Hai đội nhập cuộc cân bằng (${homePoss}% - ${awayPoss}% kiểm soát bóng), tranh chấp quyết liệt ở khu vực 1/3 giữa sân.`,
    });
  }

  // 2. Phân tích cường độ Pressing & Dứt điểm
  const totalShots = homeShots + awayShots;
  if (totalShots >= 24) {
    insights.push({
      tag: 'Nhịp độ cao & Pressing gắt',
      color: '#FB923C',
      text: `Tổng cộng ${totalShots} pha dứt điểm được tung ra — cả hai đội đều đẩy cao đội hình pressing tầm cao (PPDA thấp) khiến trận đấu diễn ra cởi mở.`,
    });
  } else if (totalShots > 0) {
    const topShooter = homeShots >= awayShots ? home : away;
    const maxShots = Math.max(homeShots, awayShots);
    insights.push({
      tag: 'Khai thác hành lang',
      color: '#38BDF8',
      text: `${topShooter} là đội tích cực bắn phá khung thành hơn (${maxShots} cú sút), tập trung các đường tịnh tiến bóng vào khu vực 16m50.`,
    });
  }

  return insights.slice(0, 3);
}