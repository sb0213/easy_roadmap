import {
  ComputedRoadScore,
  RoadSegment,
  ScoreBreakdownItem,
  VehicleMode,
} from '../types/road';

const AI_PRIOR_WEIGHT = 10; // W_AI: AI 초기 점수의 신뢰 가중치 (유저 10명분)

function clampScore(val: number, min = 1.0, max = 5.0): number {
  return Math.round(Math.max(min, Math.min(max, val)) * 10) / 10;
}

export function getScoreColor(score: number, isRestricted = false): string {
  if (isRestricted) return '#64748b'; // Slate gray for restricted auto-only road in Bike mode
  if (score >= 4.3) return '#10b981'; // Emerald 500 (5점대 명품/초보천국)
  if (score >= 3.5) return '#22c55e'; // Green 500 (3.5~4.2 운전 편함)
  if (score >= 2.8) return '#eab308'; // Yellow 500 (3점 전후 보통)
  if (score >= 2.0) return '#f97316'; // Orange 500 (2점대 주의)
  return '#ef4444';                   // Red 500 (1점대 고난도/위험)
}

export function getGradeLabel(score: number, mode: VehicleMode, isRestricted = false): string {
  if (isRestricted) return '이륜차 통행금지 (자동차전용)';
  if (score >= 4.4) return mode === 'CAR' ? 'S등급 · 초보천국 & 뷰맛집' : 'S등급 · 라이더 성지 & 비단길';
  if (score >= 3.6) return mode === 'CAR' ? 'A등급 · 주행 쾌적·안심' : 'A등급 · 라이딩 추천 구간';
  if (score >= 2.8) return 'B등급 · 무난한 기준 도로 (3점대)';
  if (score >= 2.0) return mode === 'CAR' ? 'C등급 · 초보 주의 (합류/혼잡)' : 'C등급 · 노면/그레이팅 주의';
  return mode === 'CAR' ? 'D등급 · 고난도 위험 구간 (진입주의)' : 'D등급 · 바이크 고위험 구간';
}

/**
 * 국가 공공데이터 + 네이버 거리뷰 AI 분석 + 유저 베이지안 가중합 + 태그 가중치를 결합하여
 * 종합평점 / 난이도평점 / 매력도평점 (기준 3.0점, 1.0~5.0점)을 산출합니다.
 */
export function calculateRoadScore(
  segment: RoadSegment,
  mode: VehicleMode
): ComputedRoadScore {
  const { publicMetrics: pub, streetViewAi: sv } = segment;
  const breakdown: ScoreBreakdownItem[] = [];

  // 바이크 모드에서 자동차전용도로인 경우
  const isRestrictedForBike = mode === 'BIKE' && pub.isAutoOnly;

  // 1. 기준 평점 3.0에서 시작
  let aiDifficulty = 3.0;
  let aiAttractiveness = 3.0;

  // --- [A] 국가 공공데이터 기반 난이도 산출 ---
  // (1) 최근 1년 사고건수 (TAAS)
  if (pub.accidentsLast1Yr === 0) {
    aiDifficulty += 0.35;
    breakdown.push({
      label: '최근 1년 무사고 구간 (TAAS)',
      delta: +0.35,
      target: 'DIFFICULTY',
      reason: '최근 1년간 보고된 교통사고 0건으로 안전성 검증',
    });
  } else if (pub.accidentsLast1Yr >= 3) {
    const accPenalty = -Math.min(1.1, pub.accidentsLast1Yr * 0.07 + pub.severeAccidentRatio * 0.4);
    aiDifficulty += accPenalty;
    breakdown.push({
      label: `최근 1년 사고 ${pub.accidentsLast1Yr}건 (TAAS)`,
      delta: Math.round(accPenalty * 100) / 100,
      target: 'DIFFICULTY',
      reason: `연간 사고 ${pub.accidentsLast1Yr}건 및 중상비율 ${Math.round(pub.severeAccidentRatio * 100)}% 반영 감점`,
    });
  }

  // (2) IC / JC 분기점 합류 복잡도
  if (pub.icJcMergeComplexity > 20) {
    const mergeMultiplier = mode === 'CAR' ? 1.15 : 0.75; // 초보 자동차 운전자에게 차선 합류는 최대 공포
    const mergePenalty = -Math.round(((pub.icJcMergeComplexity / 100) * mergeMultiplier) * 100) / 100;
    aiDifficulty += mergePenalty;
    breakdown.push({
      label: `${segment.category === 'JC_MERGE' ? 'JC 분기점' : 'IC 나들목'} 차선 합류 난이도`,
      delta: mergePenalty,
      target: 'DIFFICULTY',
      reason:
        mode === 'CAR'
          ? `합류 복잡도 ${pub.icJcMergeComplexity}/100 — 짧은 가감속 차로 및 교차 합류 주의`
          : `합류 복잡도 ${pub.icJcMergeComplexity}/100 — 사각지대 진입 차량 주의`,
    });
  } else if (pub.lanes >= 3 && pub.curvatureIndex < 20) {
    aiDifficulty += 0.4;
    breakdown.push({
      label: `광폭 ${pub.lanes}차선 직선 본선 (표준노드링크)`,
      delta: +0.4,
      target: 'DIFFICULTY',
      reason: '차선 폭이 넓고 선형이 직선이라 초보자 주행 용이',
    });
  }

  // (3) ITS 혼잡도 (사람/차량 몰림)
  if (pub.avgCongestionLevel >= 65) {
    const congPenalty = mode === 'CAR' ? -0.35 : -0.25;
    aiDifficulty += congPenalty;
    aiAttractiveness -= 0.3;
    breakdown.push({
      label: `상습 혼잡 구간 (혼잡도 ${pub.avgCongestionLevel}%)`,
      delta: congPenalty,
      target: 'BOTH',
      reason: '차량 밀집도가 높아 차선 변경이 까다롭고 주행 쾌적성 저하',
    });
  } else if (pub.avgCongestionLevel <= 30) {
    aiDifficulty += 0.25;
    aiAttractiveness += 0.3;
    breakdown.push({
      label: `소통 원활·여유 (혼잡도 ${pub.avgCongestionLevel}%)`,
      delta: +0.25,
      target: 'BOTH',
      reason: '통행량 여유로워 압박감 없는 주행 가능',
    });
  }

  // (4) 곡률(와인딩) 및 경사도 — 자동차 vs 바이크 정반대 매력도 반영!
  if (pub.curvatureIndex >= 45) {
    if (mode === 'CAR') {
      const curvePen = -Math.round((pub.curvatureIndex / 140) * 100) / 100;
      aiDifficulty += curvePen;
      breakdown.push({
        label: `연속 커브/와인딩 (곡률 ${pub.curvatureIndex})`,
        delta: curvePen,
        target: 'DIFFICULTY',
        reason: '초보 운전자 핸들링 및 속도 제어 주의 구간',
      });
    } else {
      // 바이크 모드: 적당한 와인딩은 매력도 대폭 상승, 단 급경사+급커브는 난이도 감점
      const bikeCurveDiff = pub.curvatureIndex > 75 ? -0.35 : -0.1;
      const bikeWindingFun = +0.65;
      aiDifficulty += bikeCurveDiff;
      aiAttractiveness += bikeWindingFun;
      breakdown.push({
        label: `라이더 와인딩 코너링 구간 (곡률 ${pub.curvatureIndex})`,
        delta: bikeWindingFun,
        target: 'ATTRACTIVENESS',
        reason: '바이크 모드 특화: 와인딩 코너링 재미 가산점 (+0.65)',
      });
    }
  }

  // --- [B] 네이버 거리뷰 AI Vision 분석 반영 ---
  // (5) 노면 포장 품질 & 바이크 노면 위험 요소 (포트홀, 그레이팅, 맨홀, 모래)
  if (mode === 'BIKE') {
    if (sv.bikeSurfaceHazardIndex >= 45) {
      const bikeHazardPen = -Math.round((sv.bikeSurfaceHazardIndex / 65) * 100) / 100;
      aiDifficulty += bikeHazardPen;
      breakdown.push({
        label: `거리뷰 AI: 이륜차 노면 위험 탐지 (${sv.bikeSurfaceHazardIndex}점)`,
        delta: bikeHazardPen,
        target: 'DIFFICULTY',
        reason: '배수로 철망(그레이팅), 맨홀 단차, 포트홀 등 바이크 슬립 위험 요소 감지',
      });
    } else if (sv.surfaceQualityScore >= 85) {
      aiDifficulty += 0.55;
      aiAttractiveness += 0.35;
      breakdown.push({
        label: `거리뷰 AI: A급 비단길 노면 (${sv.surfaceQualityScore}점)`,
        delta: +0.55,
        target: 'BOTH',
        reason: '포트홀·그레이팅 없는 최상급 아스팔트 노면으로 바이크 안심 주행',
      });
    }
  } else {
    // 자동차 모드 노면 반영
    if (sv.surfaceQualityScore >= 85) {
      aiDifficulty += 0.3;
      aiAttractiveness += 0.25;
      breakdown.push({
        label: `거리뷰 AI: 노면 및 차선 선명도 최상 (${sv.surfaceQualityScore}점)`,
        delta: +0.3,
        target: 'BOTH',
        reason: '차선 시인성이 뛰어나고 노면 상태가 매끄러움',
      });
    } else if (sv.surfaceQualityScore <= 55) {
      aiDifficulty -= 0.35;
      breakdown.push({
        label: `거리뷰 AI: 노면 불량 및 차선 마모 (${sv.surfaceQualityScore}점)`,
        delta: -0.35,
        target: 'DIFFICULTY',
        reason: '우천·야간 시 차선 구분 주의 및 노면 요철 존재',
      });
    }
  }

  // (6) 거리뷰 불법주정차 밀도
  if (sv.illegalParkingDensity >= 40) {
    const parkPen = -Math.round((sv.illegalParkingDensity / 120) * 100) / 100;
    aiDifficulty += parkPen;
    breakdown.push({
      label: `거리뷰 AI: 우측 차로 불법주정차 (${sv.illegalParkingDensity}%)`,
      delta: parkPen,
      target: 'DIFFICULTY',
      reason: '갓길 주정차 및 보행자 돌출 위험으로 하위 차로 주행 주의',
    });
  }

  // (7) 거리뷰 주변 환경·풍경·개방감 (매력도 핵심)
  const sceneryComposite = sv.sceneryOpennessScore * 0.65 + sv.greeneryRatio * 0.35;
  if (sceneryComposite >= 75) {
    const viewBonus = Math.round(((sceneryComposite - 50) / 38) * 100) / 100; // 최대 약 +1.3
    aiAttractiveness += viewBonus;
    breakdown.push({
      label: `거리뷰 AI: 수변·녹지 파노라마 풍경 (${Math.round(sceneryComposite)}점)`,
      delta: +viewBonus,
      target: 'ATTRACTIVENESS',
      reason: '탁 트인 개방감과 아름다운 가로수/강변 풍경으로 드라이브 매력도 최상',
    });
  } else if (sceneryComposite <= 35) {
    aiAttractiveness -= 0.45;
    breakdown.push({
      label: `거리뷰 AI: 도심 빌딩숲/방음벽 구간 (${Math.round(sceneryComposite)}점)`,
      delta: -0.45,
      target: 'ATTRACTIVENESS',
      reason: '주변 경관 요소보다는 실용 이동 목적의 구간',
    });
  }

  // 2차 실시간 거리뷰 클릭 재분석이 완료된 경우 미세 보정 반영
  if (sv.isRealtimeUpdated) {
    aiDifficulty += 0.15;
    aiAttractiveness += 0.1;
    breakdown.push({
      label: '실시간 네이버 거리뷰 최신 스캔 검증 완료',
      delta: +0.15,
      target: 'BOTH',
      reason: sv.realtimeDiffComment || '최신 거리뷰 이미지 재판독 결과 공사 해제 및 노면 양호 확인',
    });
  }

  const clampedAiDiff = clampScore(aiDifficulty);
  const clampedAiAttr = clampScore(aiAttractiveness);

  // --- [C] AI 종합 평점 산출 (기준 3.0, 최대 5.0, 안전 캡 적용) ---
  // 기획 원칙:
  // - 난이도가 높을수록(어려울수록) 1점에 가까움
  // - 3점은 난이도가 쉬운 편(무난)
  // - 5점은 난이도도 쉽고 풍경도 예쁘고 도로 상태도 좋을 때 도달!
  let rawAiOverall: number;
  if (clampedAiDiff < 2.5) {
    // 난이도가 어려운 위험 도로는 풍경이 아무리 예뻐도 종합평점이 2.8점을 넘지 못하도록 Hard Cap
    rawAiOverall = Math.min(2.8, clampedAiDiff * 0.85 + clampedAiAttr * 0.15);
  } else {
    // 난이도가 2.5 이상(보통~쉬움)일 때는 기본 난이도 점수에 매력도 보너스(최대 +1.1점)를 더해 5점까지 도달
    const attractivenessBonus = Math.max(-0.4, (clampedAiAttr - 3.0) * 0.55);
    const surfaceBonus = sv.surfaceQualityScore >= 85 ? 0.25 : 0;
    rawAiOverall = clampedAiDiff * 0.82 + 0.55 + attractivenessBonus + surfaceBonus;
  }
  const clampedAiOverall = clampScore(rawAiOverall);

  // --- [D] 유저 평점 + 태그 가중치 베이지안 합산 (Bayesian Average) ---
  // S_final = (W_AI * S_AI + sum(U_i) + TagDelta * N_eff) / (W_AI + N)
  const N = segment.userVoteCount;
  let tagDiffBonus = 0;
  let tagAttrBonus = 0;

  for (const tag of segment.tags) {
    const weightFactor = Math.min(1.5, tag.count / 15);
    if (mode === 'CAR') {
      tagDiffBonus += tag.carDifficultyDelta * weightFactor;
      tagAttrBonus += tag.carAttractivenessDelta * weightFactor;
    } else {
      tagDiffBonus += tag.bikeDifficultyDelta * weightFactor;
      tagAttrBonus += tag.bikeAttractivenessDelta * weightFactor;
    }
  }

  const finalDiff = clampScore(
    (AI_PRIOR_WEIGHT * clampedAiDiff + segment.userDifficultySum) / (AI_PRIOR_WEIGHT + N) +
      tagDiffBonus
  );

  const finalAttr = clampScore(
    (AI_PRIOR_WEIGHT * clampedAiAttr + segment.userAttractivenessSum) / (AI_PRIOR_WEIGHT + N) +
      tagAttrBonus
  );

  let rawFinalOverall: number;
  if (finalDiff < 2.5) {
    rawFinalOverall = Math.min(2.8, finalDiff * 0.85 + finalAttr * 0.15);
  } else {
    const attrBonus = Math.max(-0.4, (finalAttr - 3.0) * 0.55);
    const surfaceBonus = sv.surfaceQualityScore >= 85 ? 0.25 : 0;
    rawFinalOverall = finalDiff * 0.82 + 0.55 + attrBonus + surfaceBonus;
  }

  const finalOverall = isRestrictedForBike ? 1.0 : clampScore(rawFinalOverall);
  const aiWeightPercent = Math.round((AI_PRIOR_WEIGHT / (AI_PRIOR_WEIGHT + N)) * 100);
  const userWeightPercent = 100 - aiWeightPercent;

  return {
    mode,
    isRestrictedForBike,
    aiDifficultyScore: clampedAiDiff,
    aiAttractivenessScore: clampedAiAttr,
    aiOverallScore: clampedAiOverall,
    finalDifficultyScore: isRestrictedForBike ? 1.0 : finalDiff,
    finalAttractivenessScore: finalAttr,
    finalOverallScore: finalOverall,
    aiWeightPercent,
    userWeightPercent,
    gradeLabel: getGradeLabel(finalOverall, mode, isRestrictedForBike),
    heatmapColor: getScoreColor(finalOverall, isRestrictedForBike),
    breakdown,
  };
}
