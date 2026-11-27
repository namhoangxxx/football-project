import { PlayerAnalyticsProfile, PlayerRadarAxes } from '../types/playerAnalytics';
import { normalizePositionCode, PlayerPositionCode, POS_META } from './playerPosition';

export interface ProsConsInput {
  pos: PlayerPositionCode | string;
  radar: PlayerRadarAxes;
  passAccuracy: number;
  tacklesPer90: number;
  dribblesPer90: number;
  yellowCards: number;
  redCards: number;
}

export interface SimilarPlayerMatch {
  profile: PlayerAnalyticsProfile;
  similarity: number;
  sharedStrength: string;
}

type RoleBucket = 'GK' | 'CB' | 'FB' | 'CDM' | 'CM' | 'CAM' | 'WING' | 'ST';

const AXIS_WEIGHTS_BY_ROLE: Record<RoleBucket, Record<keyof PlayerRadarAxes, number>> = {
  GK: { defending: 0.45, passing: 0.25, discipline: 0.15, creativity: 0.1, dribbling: 0.03, shooting: 0.02 },
  CB: { defending: 0.44, passing: 0.24, discipline: 0.14, dribbling: 0.08, creativity: 0.05, shooting: 0.05 },
  FB: { defending: 0.3, passing: 0.22, creativity: 0.2, dribbling: 0.16, discipline: 0.07, shooting: 0.05 },
  CDM: { defending: 0.34, passing: 0.3, discipline: 0.14, dribbling: 0.1, creativity: 0.08, shooting: 0.04 },
  CM: { passing: 0.28, creativity: 0.22, defending: 0.2, dribbling: 0.15, shooting: 0.08, discipline: 0.07 },
  CAM: { creativity: 0.3, passing: 0.25, dribbling: 0.22, shooting: 0.15, discipline: 0.04, defending: 0.04 },
  WING: { dribbling: 0.3, creativity: 0.27, shooting: 0.25, passing: 0.1, discipline: 0.04, defending: 0.04 },
  ST: { shooting: 0.42, dribbling: 0.22, creativity: 0.18, passing: 0.1, discipline: 0.04, defending: 0.04 },
};

const getRoleBucket = (pos: PlayerPositionCode): RoleBucket => {
  if (pos === 'GK') return 'GK';
  if (pos === 'CB') return 'CB';
  if (pos === 'LB' || pos === 'RB' || pos === 'LWB' || pos === 'RWB') return 'FB';
  if (pos === 'CDM') return 'CDM';
  if (pos === 'CAM') return 'CAM';
  if (pos === 'LM' || pos === 'RM' || pos === 'CM') return 'CM';
  if (pos === 'LW' || pos === 'RW') return 'WING';
  return 'ST';
};

const HYBRID_COMPATIBLE_POS: Partial<Record<PlayerPositionCode, Set<PlayerPositionCode>>> = {
  LB: new Set(['LWB', 'CB']),
  RB: new Set(['RWB', 'CB']),
  LWB: new Set(['LB', 'LM', 'LW']),
  RWB: new Set(['RB', 'RM', 'RW']),
  CDM: new Set(['CM', 'CB']),
  CM: new Set(['CDM', 'CAM', 'LM', 'RM']),
  CAM: new Set(['CM', 'CF', 'LW', 'RW']),
  LM: new Set(['LW', 'LWB', 'CM']),
  RM: new Set(['RW', 'RWB', 'CM']),
  LW: new Set(['LM', 'CF', 'CAM', 'RW']),
  RW: new Set(['RM', 'CF', 'CAM', 'LW']),
  CF: new Set(['ST', 'CAM', 'LW', 'RW']),
  ST: new Set(['CF', 'LW', 'RW']),
};

const getAxisLabel = (axis: keyof PlayerRadarAxes, isGK: boolean): string => {
  if (isGK) {
    const gkMap: Record<keyof PlayerRadarAxes, string> = {
      defending: 'Phản xạ & Cản phá',
      passing: 'Phát động bóng',
      discipline: 'Tâm lý & Kỷ luật',
      creativity: 'Phân phối bóng dài',
      dribbling: 'Xử lý bóng bằng chân',
      shooting: 'Phát bóng lực mạnh',
    };
    return gkMap[axis];
  }

  const outfieldMap: Record<keyof PlayerRadarAxes, string> = {
    shooting: 'Dứt điểm & Săn bàn',
    creativity: 'Sáng tạo & Kiến tạo',
    passing: 'Chuyền bóng & Kiểm soát',
    dribbling: 'Rê bóng & Đột phá',
    defending: 'Phòng ngự & Tranh chấp',
    discipline: 'Kỷ luật thi đấu',
  };
  return outfieldMap[axis];
};

interface TacticalEvalItem {
  axis: keyof PlayerRadarAxes;
  expected: number;
  proText: string;
  conText: string;
}

const buildRoleEvaluators = (
  bucket: RoleBucket,
  passAccuracy: number,
  tacklesPer90: number,
  dribblesPer90: number
): TacticalEvalItem[] => {
  switch (bucket) {
    case 'GK':
      return [
        {
          axis: 'defending',
          expected: 90,
          proText: 'Phản xạ cản phá ổn định và làm chủ không gian vòng cấm tốt',
          conText: 'Cần cải thiện độ ổn định trước các tình huống dứt điểm cận thành',
        },
        {
          axis: 'passing',
          expected: 78,
          proText: `Chân chơi bóng tự tin, phát động ngắn tốt (${passAccuracy}% chuyền chuẩn)`,
          conText: `Khả năng phát động bóng ngắn dưới áp lực còn hạn chế (${passAccuracy}% chuyền chuẩn)`,
        },
        {
          axis: 'creativity',
          expected: 62,
          proText: 'Phân phối bóng dài chuyển trạng thái phản công chuẩn xác',
          conText: 'Độ chính xác trong các đường phất bóng dài phát động tấn công chưa cao',
        },
        {
          axis: 'dribbling',
          expected: 54,
          proText: 'Xử lý bóng bằng chân bình tĩnh khi bị tiền đạo đối phương áp sát',
          conText: 'Dễ lúng túng khi bị pressing rát và buộc phải xử lý bóng bằng chân',
        },
      ];

    case 'CB':
      return [
        {
          axis: 'defending',
          expected: 84,
          proText: `Tranh chấp tay đôi và đánh chặn chắc chắn (${tacklesPer90} tắc bóng/90p)`,
          conText: `Cần gia tăng độ quyết liệt trong các pha tranh chấp tay đôi (${tacklesPer90} tắc bóng/90p)`,
        },
        {
          axis: 'passing',
          expected: 84,
          proText: `Triển khai bóng từ tuyến dưới mạch lạc (${passAccuracy}% chính xác)`,
          conText: `Khả năng luân chuyển bóng xuyên tuyến thoát pressing còn hạn chế (${passAccuracy}%)`,
        },
        {
          axis: 'dribbling',
          expected: 56,
          proText: 'Tự tin cầm bóng dâng cao kéo giãn khối phòng ngự đối phương',
          conText: 'Khả năng tự kéo bóng thoát vây khi bị áp sát tầm cao chưa tốt',
        },
        {
          axis: 'shooting',
          expected: 52,
          proText: 'Tham gia không chiến và uy hiếp khung thành ở các pha cố định hiệu quả',
          conText: 'Hiệu quả không chiến và tận dụng tình huống cố định còn hạn chế',
        },
      ];

    case 'FB':
      return [
        {
          axis: 'defending',
          expected: 80,
          proText: `Bọc lót và khóa chặt hành lang biên chắc chắn (${tacklesPer90} tắc bóng/90p)`,
          conText: `Dễ hở khoảng trống sau lưng khi dâng cao hỗ trợ tấn công (${tacklesPer90} tắc bóng/90p)`,
        },
        {
          axis: 'creativity',
          expected: 64,
          proText: 'Hỗ trợ dâng cao biên và tạt bóng tạo đột biến tấn công tốt',
          conText: 'Chất lượng tạt bóng và tạo cơ hội ở 1/3 cuối sân chưa đủ đột biến',
        },
        {
          axis: 'dribbling',
          expected: 62,
          proText: `Leo biên và thoát pressing 1v1 giàu tốc độ (${dribblesPer90} qua người/90p)`,
          conText: `Khả năng đột phá 1v1 vượt qua hậu vệ biên đối phương còn hạn chế (${dribblesPer90}/90p)`,
        },
        {
          axis: 'passing',
          expected: 82,
          proText: `Phối hợp thoát vây ở hành lang biên chuẩn xác (${passAccuracy}%)`,
          conText: `Tỷ lệ chuyền hỏng khi triển khai bóng dọc biên còn tương đối cao (${passAccuracy}%)`,
        },
      ];

    case 'CDM':
      return [
        {
          axis: 'defending',
          expected: 82,
          proText: `Che chắn và thu hồi bóng xuất sắc trước hàng thủ (${tacklesPer90} tắc bóng/90p)`,
          conText: `Cần cải thiện khả năng đánh chặn và che chắn trước vòng cấm (${tacklesPer90} tắc bóng/90p)`,
        },
        {
          axis: 'passing',
          expected: 88,
          proText: `Điều tiết nhịp độ và phân phối bóng chuẩn xác (${passAccuracy}% chuyền đúng)`,
          conText: `Nhịp độ luân chuyển và giữ bóng dưới áp lực cần ổn định hơn (${passAccuracy}%)`,
        },
        {
          axis: 'dribbling',
          expected: 60,
          proText: `Xoay sở thoát pressing tốt ở khu vực vòng tròn trung tâm (${dribblesPer90}/90p)`,
          conText: `Khả năng tự xoay sở thoát vây ở khu trung tuyến còn hạn chế (${dribblesPer90}/90p)`,
        },
        {
          axis: 'creativity',
          expected: 60,
          proText: 'Tung ra nhiều đường chuyền tịnh tiến mở khóa tuyến trên',
          conText: 'Thiếu các đường chuyền mở khóa trực diện lên 1/3 sân đối phương',
        },
      ];

    case 'CM':
      return [
        {
          axis: 'passing',
          expected: 86,
          proText: `Giữ nhịp và luân chuyển bóng tuyến giữa mạch lạc (${passAccuracy}% chính xác)`,
          conText: `Tỷ lệ chuyền chuẩn khi bị pressing ở trung tuyến cần cải thiện (${passAccuracy}%)`,
        },
        {
          axis: 'creativity',
          expected: 66,
          proText: 'Tạo cơ hội và kết nối tốt giữa tuyến tiền vệ với hàng công',
          conText: 'Thiếu những đường chọc khe sáng tạo ở 1/3 cuối sân đối phương',
        },
        {
          axis: 'defending',
          expected: 66,
          proText: `Hỗ trợ tranh chấp và thu hồi bóng năng nổ (${tacklesPer90} tắc bóng/90p)`,
          conText: `Đóng góp thu hồi bóng khi đội nhà chuyển trạng thái phòng ngự còn mỏng (${tacklesPer90}/90p)`,
        },
        {
          axis: 'shooting',
          expected: 60,
          proText: 'Băng lên tuyến hai dứt điểm tạo bất ngờ hiệu quả',
          conText: 'Hiệu suất dứt điểm tuyến hai và xâm nhập vòng cấm chưa tạo nhiều sát thương',
        },
      ];

    case 'CAM':
      return [
        {
          axis: 'creativity',
          expected: 74,
          proText: 'Mở khóa hàng phòng ngự đối phương bằng các đường kiến tạo sắc bén',
          conText: 'Cần gia tăng tần suất tạo cơ hội ngon ăn cho tiền đạo cắm',
        },
        {
          axis: 'dribbling',
          expected: 74,
          proText: `Xử lý không gian hẹp và kéo bóng đột phá tốt (${dribblesPer90} qua người/90p)`,
          conText: `Hiệu quả qua người ở không gian hẹp trước vòng cấm còn thấp (${dribblesPer90}/90p)`,
        },
        {
          axis: 'shooting',
          expected: 68,
          proText: 'Xâm nhập vòng cấm và dứt điểm tuyến hai đầy uy lực',
          conText: 'Khả năng tự dứt điểm kết liễu tình huống trong vòng cấm chưa sắc bén',
        },
        {
          axis: 'defending',
          expected: 54,
          proText: 'Tích cực pressing tầm cao gây áp lực lên tiền vệ trụ đối phương',
          conText: `Mức độ tham gia pressing tầm cao và hỗ trợ phòng ngự từ xa còn hạn chế (${tacklesPer90}/90p)`,
        },
      ];

    case 'WING':
      return [
        {
          axis: 'dribbling',
          expected: 76,
          proText: `Đột phá 1v1 hành lang cánh giàu tốc độ (${dribblesPer90} qua người/90p)`,
          conText: `Tỷ lệ qua người thành công trong các pha đối đầu 1v1 ở biên chưa cao (${dribblesPer90}/90p)`,
        },
        {
          axis: 'creativity',
          expected: 70,
          proText: 'Căng ngang và kiến tạo cơ hội cho đồng đội từ biên hiệu quả',
          conText: 'Quyết định chuyền bóng hay dứt điểm ở nhịp xử lý cuối cùng chưa tối ưu',
        },
        {
          axis: 'shooting',
          expected: 70,
          proText: 'Cắt vào trung lộ và dứt điểm chuyển hóa bàn thắng sắc bén',
          conText: 'Hiệu suất dứt điểm ở các tình huống bó vào trong chưa đủ hiểm hóc',
        },
        {
          axis: 'defending',
          expected: 52,
          proText: 'Chịu khó lùi sâu hỗ trợ hậu vệ biên phong tỏa hành lang cánh',
          conText: `Ít lùi sâu hỗ trợ hậu vệ biên khi đối phương phản công (${tacklesPer90} tắc bóng/90p)`,
        },
      ];

    case 'ST':
    default:
      return [
        {
          axis: 'shooting',
          expected: 76,
          proText: 'Chọn vị trí thông minh và dứt điểm chuyển hóa bàn thắng sắc bén',
          conText: 'Tỷ lệ chuyển hóa cơ hội thành bàn thắng trong vòng cấm cần sắc bén hơn',
        },
        {
          axis: 'dribbling',
          expected: 68,
          proText: `Tự xoay sở tạo khoảng trống dứt điểm tốt (${dribblesPer90} qua người/90p)`,
          conText: `Khả năng tự xoay sở đột phá trong không gian hẹp vòng cấm còn hạn chế (${dribblesPer90}/90p)`,
        },
        {
          axis: 'creativity',
          expected: 64,
          proText: 'Làm tường nhả bóng và kiến tạo cho vệ tinh xung quanh hiệu quả',
          conText: 'Khả năng làm tường và kiến tạo cho vệ tinh xung quanh còn hạn chế',
        },
        {
          axis: 'defending',
          expected: 50,
          proText: 'Tích cực pressing tầm cao gây áp lực lên bộ đôi trung vệ đối phương',
          conText: `Ít tham gia gây áp lực pressing đoạt lại bóng ở 1/3 sân đối phương (${tacklesPer90}/90p)`,
        },
      ];
  }
};

export function generateProsAndCons(input: ProsConsInput): {
  pros: string[];
  cons: string[];
} {
  const pos = normalizePositionCode(input.pos);
  const bucket = getRoleBucket(pos);
  const { radar, passAccuracy, tacklesPer90, dribblesPer90, yellowCards, redCards } = input;

  const evaluators = buildRoleEvaluators(bucket, passAccuracy, tacklesPer90, dribblesPer90);

  // Sắp xếp các khía cạnh theo mức vượt kỳ vọng (cao -> thấp) cho Điểm mạnh
  const rankedBySurplus = [...evaluators].sort(
    (a, b) => (radar[b.axis] - b.expected) - (radar[a.axis] - a.expected)
  );

  const pros: string[] = rankedBySurplus
    .filter((item) => radar[item.axis] >= item.expected - 4)
    .slice(0, 3)
    .map((item) => item.proText);

  if (pros.length < 2) {
    rankedBySurplus.slice(0, 2).forEach((item) => {
      if (!pros.includes(item.proText)) pros.push(item.proText);
    });
  }

  // Sắp xếp các khía cạnh theo mức hụt so với kỳ vọng (lớn -> nhỏ) cho Điểm cần cải thiện
  const rankedByDeficit = [...evaluators].sort(
    (a, b) => (b.expected - radar[b.axis]) - (a.expected - radar[a.axis])
  );

  const cons: string[] = [];

  if (redCards > 0 || yellowCards >= 3) {
    cons.push(`Cần tiết chế tranh chấp để giảm rủi ro thẻ phạt (${yellowCards} vàng, ${redCards} đỏ)`);
  }

  for (const item of rankedByDeficit) {
    if (cons.length >= 2) break;
    // Không chọn trùng khía cạnh đã liệt kê ở điểm mạnh
    if (!pros.includes(item.proText)) {
      cons.push(item.conText);
    }
  }

  if (cons.length === 0 && rankedByDeficit.length > 0) {
    cons.push(rankedByDeficit[0].conText);
  }

  return {
    pros: pros.slice(0, 3),
    cons: cons.slice(0, 2),
  };
}

export function findSimilarPlayers(
  target: PlayerAnalyticsProfile,
  pool: PlayerAnalyticsProfile[],
  limit = 6
): SimilarPlayerMatch[] {
  const targetPos = normalizePositionCode(target.pos);
  const targetGroup = POS_META[targetPos].group;
  const targetBucket = getRoleBucket(targetPos);
  const weights = AXIS_WEIGHTS_BY_ROLE[targetBucket];
  const isGK = targetGroup === 'GK';

  const activeCandidates = pool.filter((p) => p.id !== target.id && (p.appearances || 0) > 0);
  const sourcePool = activeCandidates.length >= limit ? activeCandidates : pool.filter((p) => p.id !== target.id);

  const scored: SimilarPlayerMatch[] = [];

  for (const candidate of sourcePool) {
    const candPos = normalizePositionCode(candidate.pos);
    const candGroup = POS_META[candPos].group;

    if (isGK !== (candGroup === 'GK')) continue;

    const isSameGroup = candGroup === targetGroup;
    const isHybrid = HYBRID_COMPATIBLE_POS[targetPos]?.has(candPos) ?? false;
    if (!isSameGroup && !isHybrid) continue;

    let weightedDiff = 0;
    (Object.keys(weights) as Array<keyof PlayerRadarAxes>).forEach((axis) => {
      const diff = Math.abs((target.radar[axis] ?? 50) - (candidate.radar[axis] ?? 50));
      weightedDiff += diff * weights[axis];
    });

    const rolePenalty =
      candPos === targetPos
        ? 0
        : getRoleBucket(candPos) === targetBucket
        ? 2.5
        : isSameGroup
        ? 5.5
        : 9.5;

    const rawScore = 100 - weightedDiff * 1.45 - rolePenalty;
    const similarity = Math.max(52, Math.min(98, Math.round(rawScore)));

    let bestAxis: keyof PlayerRadarAxes = isGK ? 'defending' : 'passing';
    let bestCombined = -1;
    (Object.keys(weights) as Array<keyof PlayerRadarAxes>).forEach((axis) => {
      if (weights[axis] < 0.08) return;
      const combined = Math.min(target.radar[axis] ?? 0, candidate.radar[axis] ?? 0) * (0.7 + weights[axis]);
      if (combined > bestCombined) {
        bestCombined = combined;
        bestAxis = axis;
      }
    });

    scored.push({
      profile: { ...candidate, pos: candPos },
      similarity,
      sharedStrength: getAxisLabel(bestAxis, isGK),
    });
  }

  return scored
    .sort((a, b) => b.similarity - a.similarity || b.profile.seasonRating - a.profile.seasonRating)
    .slice(0, limit);
}