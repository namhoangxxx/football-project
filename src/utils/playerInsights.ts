import {
    PlayerAnalyticsProfile,
    PlayerRadarAxes,
    SimilarPlayerResult,
} from '../types/playerAnalytics';
import { PlayerPositionCode } from './playerPosition';

export function generateProsAndCons(params: {
  pos: PlayerPositionCode;
  radar: PlayerRadarAxes;
  passAccuracy: number;
  tacklesPer90: number;
  dribblesPer90: number;
  yellowCards: number;
  redCards: number;
}): { pros: string[]; cons: string[] } {
  const { pos, radar, passAccuracy, tacklesPer90, dribblesPer90, yellowCards, redCards } = params;
  const isGK = pos === 'GK';
  const isAttacker = pos === 'CF' || pos === 'RF' || pos === 'LF';
  const isMid = pos === 'AM' || pos === 'CM' || pos === 'CDM' || pos === 'LM' || pos === 'RM';
  const isDefender = pos === 'CB' || pos === 'LB' || pos === 'RB';

  const pros: string[] = [];
  const cons: string[] = [];

  if (radar.shooting >= 76) pros.push('Dứt điểm & chọn vị trí xG sắc bén');
  if (radar.creativity >= 75) pros.push('Tạo cơ hội & đường chuyền quyết định (xA) tốt');
  if (radar.passing >= 82) pros.push(`Luân chuyển bóng ổn định (${passAccuracy}% chuyền chuẩn)`);
  if (radar.dribbling >= 75) pros.push(`Rê bóng đột phá 1v1 hiệu quả (${dribblesPer90}/90p)`);
  if (radar.defending >= 76) pros.push(`Tranh chấp & đánh chặn tốt (${tacklesPer90} tắc bóng/90p)`);
  if (radar.discipline >= 85) pros.push('Kỷ luật chiến thuật cao, ít phạm lỗi nguy hiểm');
  if (pros.length === 0) pros.push('Thi đấu tròn vai, giữ cự ly đội hình ổn định');

  if (!isGK && radar.shooting < 55 && isAttacker) {
    cons.push('Hiệu suất chuyển hóa cơ hội thành bàn thắng chưa cao');
  }
  if (!isGK && radar.defending < 52 && (isMid || isDefender)) {
    cons.push('Tỷ lệ thu hồi bóng & tranh chấp tay đôi còn hạn chế');
  }
  if (passAccuracy < 76) {
    cons.push(`Chuyền chính xác thấp (${passAccuracy}%), dễ mất bóng khi bị pressing`);
  }
  if (yellowCards >= 4 || redCards >= 1) {
    cons.push(`Rủi ro thẻ phạt cao (${yellowCards} vàng${redCards ? `, ${redCards} đỏ` : ''})`);
  }
  if (!isGK && radar.dribbling < 52 && (pos === 'RF' || pos === 'LF' || pos === 'AM')) {
    cons.push('Thiếu đột biến trong các pha xử lý 1v1 ở 1/3 cuối sân');
  }
  if (cons.length === 0) cons.push('Cần duy trì thể lực ở giai đoạn cuối hiệp 2');

  return { pros: pros.slice(0, 3), cons: cons.slice(0, 2) };
}

export function findSimilarPlayers(
  target: PlayerAnalyticsProfile,
  candidates: PlayerAnalyticsProfile[],
  limit = 5
): SimilarPlayerResult[] {
  const toVec = (r: PlayerRadarAxes) => [
    r.shooting,
    r.creativity,
    r.passing,
    r.dribbling,
    r.defending,
    r.discipline,
  ];
  const vecA = toVec(target.radar);
  const magA = Math.hypot(...vecA) || 1;

  const axisLabels: Array<[keyof PlayerRadarAxes, string]> = [
    ['shooting', 'Dứt điểm & xG'],
    ['creativity', 'Kiến tạo cơ hội'],
    ['passing', 'Chuyền bóng'],
    ['dribbling', 'Rê bóng 1v1'],
    ['defending', 'Phòng ngự & Thu hồi'],
    ['discipline', 'Kỷ luật chiến thuật'],
  ];

  return candidates
    .filter((c) => c.id !== target.id)
    .map((cand) => {
      const vecB = toVec(cand.radar);
      const magB = Math.hypot(...vecB) || 1;
      const dot = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
      const cosine = dot / (magA * magB);
      const dist = Math.hypot(...vecA.map((v, i) => v - vecB[i])) / (100 * Math.sqrt(6));
      const score = Math.round((cosine * 0.65 + (1 - dist) * 0.35) * 100);

      let bestAxis = axisLabels[0][1];
      let bestVal = -1;
      for (const [key, label] of axisLabels) {
        const pairScore = Math.min(target.radar[key], cand.radar[key]);
        if (pairScore > bestVal) {
          bestVal = pairScore;
          bestAxis = label;
        }
      }

      return {
        profile: cand,
        similarity: Math.max(55, Math.min(99, score)),
        sharedStrength: bestAxis,
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}