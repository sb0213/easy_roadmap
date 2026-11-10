export type VehicleMode = 'CAR' | 'BIKE';

export type SegmentCategory =
  | 'MAIN_ROAD'       // 일반 본선 구간 (국토부 표준노드링크 기본)
  | 'IC_RAMP'         // IC 나들목 진출입 램프 구간
  | 'JC_MERGE'        // JC 분기점 차선 엇갈림/합류 구간
  | 'INTERSECTION'    // 주요 대형 교차로/회전교차로 구간
  | 'SCENIC_WINDING'; // 해안/산악/강변 드라이브 및 와인딩 구간

export interface PublicRoadMetrics {
  standardNodeLinkId: string;       // 국토교통부 표준노드링크 ID + IC/JC 세분화 서브코드
  lanes: number;                    // 차로 수 (편도 기준)
  speedLimit: number;               // 제한속도 (km/h)
  accidentsLast1Yr: number;         // TAAS 최근 1년간 사고 건수
  severeAccidentRatio: number;      // 중상/사망 사고 비율 (0 ~ 1)
  avgCongestionLevel: number;       // ITS 시간대 평균 혼잡도 (0: 원활 ~ 100: 정체)
  curvatureIndex: number;           // 곡률 지수 (0: 완전 직선 ~ 100: 급커브 연속)
  slopeGrade: number;               // 경사도 (%)
  icJcMergeComplexity: number;      // IC/분기점 차선 변경 및 합류 난이도 (0: 없음 ~ 100: 극악)
  isAutoOnly: boolean;              // 자동차전용도로 여부 (이륜차 통행 금지)
}

export interface StreetViewDetectionBox {
  id: string;
  label: string;
  category: 'SAFETY_GOOD' | 'SAFETY_WARN' | 'BIKE_HAZARD' | 'SCENERY';
  confidence: number;
  x: number; // % (0~100)
  y: number; // % (0~100)
  w: number; // %
  h: number; // %
  impactText: string;
}

export interface NaverStreetViewAnalysis {
  panoId: string;
  capturedDate: string;
  lastAiScanTimestamp: string;
  isRealtimeUpdated: boolean;       // 사용자가 클릭하여 2차 실시간 재분석을 완료했는지 여부
  laneClarityScore: number;         // 차선 도색 선명도 (0 ~ 100)
  surfaceQualityScore: number;      // 노면 포장 상태 (0: 포트홀/균열 심함 ~ 100: 신설 아스팔트 비단길)
  illegalParkingDensity: number;    // 불법주정차 및 노변 장애물 밀도 (0 ~ 100)
  bikeSurfaceHazardIndex: number;   // 이륜차 치명적 노면 요소 (맨홀, 배수로 그레이팅, 철판, 모래 등 0 ~ 100)
  sceneryOpennessScore: number;     // 개방감 및 수변/산림 조망 점수 (0 ~ 100)
  greeneryRatio: number;            // 가로수/녹지 비율 (0 ~ 100)
  streetViewPreviewUrl: string;     // 거리뷰 대표 시각 이미지
  aiSummaryComment: string;         // AI 비전 판독 한줄 요약
  realtimeDiffComment?: string;     // 클릭 시 최신 거리뷰 재분석 후 변동 코멘트
  detections: StreetViewDetectionBox[];
}

export interface RoadTagVote {
  tagId: string;
  label: string;
  type: 'POSITIVE' | 'NEGATIVE' | 'BIKE_SPECIAL';
  carDifficultyDelta: number;
  carAttractivenessDelta: number;
  bikeDifficultyDelta: number;
  bikeAttractivenessDelta: number;
  count: number;
}

export interface RoadSegment {
  id: string;
  name: string;
  subName: string;                  // 예: "성수대교 북단 JC 합류구간 (동부간선 → 강변북로)"
  region: string;
  category: SegmentCategory;
  coordinates: [number, number][];  // Polyline 좌표열 [lat, lng]
  centerCoord: [number, number];
  lengthKm: number;
  publicMetrics: PublicRoadMetrics;
  streetViewAi: NaverStreetViewAnalysis;
  // 베이지안 집단지성 데이터
  userVoteCount: number;
  userDifficultySum: number;
  userAttractivenessSum: number;
  tags: RoadTagVote[];
}

export interface ScoreBreakdownItem {
  label: string;
  delta: number;
  target: 'DIFFICULTY' | 'ATTRACTIVENESS' | 'BOTH';
  reason: string;
}

export interface ComputedRoadScore {
  mode: VehicleMode;
  isRestrictedForBike: boolean;     // 바이크 모드에서 자동차전용도로인 경우 true
  // AI 초기/최신 산출 점수 (기준 3.0, 범위 1.0 ~ 5.0)
  aiDifficultyScore: number;
  aiAttractivenessScore: number;
  aiOverallScore: number;
  // 유저 베이지안 가중합 반영 최종 점수 (기준 3.0, 범위 1.0 ~ 5.0)
  finalDifficultyScore: number;
  finalAttractivenessScore: number;
  finalOverallScore: number;
  // AI vs User 가중치 비중 (%)
  aiWeightPercent: number;
  userWeightPercent: number;
  // 색상 및 등급
  gradeLabel: string;
  heatmapColor: string;
  breakdown: ScoreBreakdownItem[];
}
