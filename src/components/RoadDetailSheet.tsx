import React, { useState } from 'react';
import { ComputedRoadScore, RoadSegment, VehicleMode } from '../types/road';
import { AVAILABLE_QUICK_TAGS } from '../data/mockRoads';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Star,
  Sparkles,
  MapPin,
  Activity,
  Eye,
  EyeOff,
  Car,
  Bike,
  Info,
  X,
  Gauge,
  Calendar,
  ShieldAlert,
  Scale,
  Check,
  Zap,
  TrendingUp,
  TrendingDown,
  Navigation,
} from 'lucide-react';

export interface RoadDetailSheetProps {
  segment: RoadSegment;
  score: ComputedRoadScore;
  mode: VehicleMode;
  onTriggerRealtimeScan: (segmentId: string) => void;
  onSubmitUserVote: (
    segmentId: string,
    diffRating: number,
    attrRating: number,
    selectedTagIds: string[]
  ) => void;
  onClose?: () => void;
}

export const RoadDetailSheet: React.FC<RoadDetailSheetProps> = ({
  segment,
  score,
  mode,
  onTriggerRealtimeScan,
  onSubmitUserVote,
  onClose,
}) => {
  // Local states
  const [showDetections, setShowDetections] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [userDiffRating, setUserDiffRating] = useState<number>(4.0);
  const [userAttrRating, setUserAttrRating] = useState<number>(4.0);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [voteSubmitted, setVoteSubmitted] = useState<boolean>(false);

  // Category name & color mapping
  const categoryConfig = {
    MAIN_ROAD: { label: '본선 구간', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    IC_RAMP: { label: 'IC 나들목', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    JC_MERGE: { label: 'JC 분기점 합류', badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    INTERSECTION: { label: '교차로', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    SCENIC_WINDING: { label: '와인딩/뷰맛집', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  }[segment.category] || { label: '일반 도로', badge: 'bg-slate-700 text-slate-300 border-slate-600' };

  // Trigger 2-stage realtime scan with animation
  const handleRealtimeScanClick = () => {
    if (isScanning) return;
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      onTriggerRealtimeScan(segment.id);
    }, 1000);
  };

  // Toggle tag selection
  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  // Submit user rating & tags
  const handleVoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitUserVote(segment.id, userDiffRating, userAttrRating, selectedTagIds);
    setVoteSubmitted(true);
    setTimeout(() => {
      setVoteSubmitted(false);
    }, 3500);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 overflow-hidden flex flex-col font-sans">
      {/* ─────────────────────────────────────────────────────────────
          1. Header & Segment Badge
      ───────────────────────────────────────────────────────────── */}
      <div className="p-5 border-b border-slate-800 bg-slate-950/60 relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {/* Category Pill */}
            <span
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${categoryConfig.badge}`}
            >
              {categoryConfig.label}
            </span>

            {/* Standard Node Link ID */}
            <span className="px-2 py-0.5 text-xs font-mono font-medium rounded bg-slate-800 text-slate-300 border border-slate-700/60">
              국토부 링크: {segment.publicMetrics.standardNodeLinkId}
            </span>

            {/* Region & Length */}
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              {segment.region} · {segment.lengthKm}km
            </span>

            {/* Mode Indicator */}
            <span
              className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium ${
                mode === 'CAR'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {mode === 'CAR' ? <Car className="w-3 h-3" /> : <Bike className="w-3 h-3" />}
              {mode === 'CAR' ? '자동차 모드' : '이륜차(바이크) 모드'}
            </span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
          {segment.name}
        </h2>
        <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          {segment.subName}
        </p>

        {/* ⚠️ Prominent Warning Banner if restricted for Bike */}
        {score.isRestrictedForBike && (
          <div className="mt-3.5 bg-rose-950/80 border-2 border-rose-500/80 rounded-xl p-3.5 flex items-start gap-3 shadow-lg shadow-rose-950/50">
            <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1">
              <div className="text-rose-200 font-bold text-sm tracking-tight flex items-center gap-1.5">
                <span>⚠️ 자동차전용도로 구간으로 이륜차(바이크) 진입이 법적으로 금지된 도로입니다.</span>
              </div>
              <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
                도로교통법 제63조에 의거 이륜자동차는 고속도로 및 자동차전용도로 통행이 전면 금지되어 있습니다.
                진입 시 벌금 부과 및 대형 사고 위험이 있으니 인근 일반 국도·지방도 우회 경로를 이용하세요.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="p-5 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
        {/* ─────────────────────────────────────────────────────────────
            2. 3원화 평점 대시보드 (Overall / Difficulty / Attractiveness)
        ───────────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Easy Roadmap 3원화 평점 대시보드
            </h3>
            <span className="text-xs text-slate-400">기준점 3.0점 · 범위 1.0 ~ 5.0점</span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* [1] 종합 평점 Hero Card */}
            <div
              className="p-4 rounded-xl border bg-gradient-to-b from-slate-800/90 to-slate-900/90 relative overflow-hidden flex flex-col justify-between shadow-lg"
              style={{ borderColor: score.heatmapColor }}
            >
              <div
                className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-15 blur-xl pointer-events-none"
                style={{ backgroundColor: score.heatmapColor }}
              />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  종합 평점
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-bold shadow-sm"
                  style={{
                    backgroundColor: `${score.heatmapColor}25`,
                    color: score.heatmapColor,
                    borderColor: `${score.heatmapColor}50`,
                  }}
                >
                  {score.finalOverallScore.toFixed(1)} / 5.0
                </span>
              </div>

              <div className="my-1.5 flex items-baseline gap-2">
                <span
                  className="text-4xl font-extrabold tracking-tight"
                  style={{ color: score.heatmapColor }}
                >
                  {score.finalOverallScore.toFixed(1)}
                </span>
                <span className="text-xs text-slate-400">/ 5.0점</span>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-200 mt-1 line-clamp-1">
                  {score.gradeLabel}
                </p>
                <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>기준(3.0) 대비</span>
                  <span
                    className={
                      score.finalOverallScore >= 3.0
                        ? 'text-emerald-400 font-medium'
                        : 'text-rose-400 font-medium'
                    }
                  >
                    {score.finalOverallScore >= 3.0 ? '+' : ''}
                    {(score.finalOverallScore - 3.0).toFixed(1)}점
                  </span>
                </div>
              </div>
            </div>

            {/* [2] 난이도 평점 Card */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-sky-400" />
                    난이도 평점
                  </span>
                  <span className="text-xs font-mono font-bold text-sky-300">
                    {score.finalDifficultyScore.toFixed(1)} / 5.0
                  </span>
                </div>

                {/* Score Bar with 3.0 Center Marker */}
                <div className="relative pt-3 pb-1">
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, ((score.finalDifficultyScore - 1) / 4) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  {/* Standard 3.0 Marker */}
                  <div
                    className="absolute top-1 bottom-0 w-0.5 bg-slate-400/80 pointer-events-none"
                    style={{ left: '50%' }}
                    title="기준 3.0점"
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>1점 (극악)</span>
                  <span className="text-slate-400 font-semibold">3점 (쉬운 편)</span>
                  <span>5점 (초보천국)</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                {score.finalDifficultyScore >= 3.8 ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> 초보자 안심 직선·광폭 도로
                  </span>
                ) : score.finalDifficultyScore >= 2.8 ? (
                  <span className="text-amber-400 font-medium flex items-center gap-1">
                    <Activity className="w-3 h-3" /> 평균 수준의 일반 주행 도로
                  </span>
                ) : (
                  <span className="text-rose-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> 급합류·사고위험·초보주의
                  </span>
                )}
              </div>
            </div>

            {/* [3] 매력도 평점 Card */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    매력도 평점
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-300">
                    {score.finalAttractivenessScore.toFixed(1)} / 5.0
                  </span>
                </div>

                {/* Score Bar with 3.0 Center Marker */}
                <div className="relative pt-3 pb-1">
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-slate-600 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, ((score.finalAttractivenessScore - 1) / 4) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  {/* Standard 3.0 Marker */}
                  <div
                    className="absolute top-1 bottom-0 w-0.5 bg-slate-400/80 pointer-events-none"
                    style={{ left: '50%' }}
                    title="기준 3.0점"
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>1점 (삭막)</span>
                  <span className="text-slate-400 font-semibold">3점 (보통)</span>
                  <span>5점 (뷰맛집)</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                <p className="line-clamp-1">풍경 개방감 · 가로수/수변 · 와인딩 쾌감 · 노면 상태</p>
              </div>
            </div>
          </div>

          {/* Bayesian Weight Distribution Bar */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-indigo-400" />
                베이지안 가중 평균 비중 (Bayesian Posterior Weight)
              </span>
              <span className="text-[11px] text-slate-400">
                AI 선험 {score.aiWeightPercent}% vs 유저 집단지성 {score.userWeightPercent}%
              </span>
            </div>

            {/* Split Progress Bar */}
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${score.aiWeightPercent}%` }}
                title={`AI 초기학습 비중 ${score.aiWeightPercent}%`}
              />
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${score.userWeightPercent}%` }}
                title={`유저 집단지성 비중 ${score.userWeightPercent}% (${segment.userVoteCount}명)`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                AI 초기학습 비중: <b>{score.aiWeightPercent}%</b> (W_AI = 10)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                유저 집단지성: <b>{score.userWeightPercent}%</b> ({segment.userVoteCount}명 참여)
              </span>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="font-mono text-slate-400">
                수식: S_final = (10·S_AI + ∑U_i + TagΔ·N_eff) / (10 + N)
              </span>
              <span className="text-emerald-400/90 font-medium">베이지안 가중치 실시간 반영</span>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. 네이버 거리뷰 + 2-Stage 실시간 AI 재분석 뷰어
        ───────────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-green-500 text-white font-extrabold text-[11px] flex items-center justify-center shadow">
                N
              </span>
              <h3 className="text-base font-bold text-slate-200">
                네이버 거리뷰 & 2-Stage 실시간 AI Vision 판독
              </h3>
            </div>
            <button
              onClick={() => setShowDetections((prev) => !prev)}
              className="text-xs px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              {showDetections ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" /> AI 바운딩박스 숨김
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-400" /> AI 바운딩박스 표시
                </>
              )}
            </button>
          </div>

          {/* Viewport Frame */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
            {/* Viewport Meta Header */}
            <div className="px-3.5 py-2 border-b border-slate-800/80 bg-slate-900/90 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  NAVER 거리뷰 AI Vision
                </span>
                <span className="text-slate-600">|</span>
                <span className="font-mono text-slate-400">Pano: {segment.streetViewAi.panoId}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  {segment.streetViewAi.capturedDate}
                </span>
                <span className="text-slate-600">|</span>
                <span>{segment.streetViewAi.lastAiScanTimestamp}</span>
              </div>
            </div>

            {/* Image with Overlays */}
            <div className="relative aspect-video w-full bg-slate-900 overflow-hidden group">
              <img
                src={segment.streetViewAi.streetViewPreviewUrl}
                alt={segment.name}
                className="w-full h-full object-cover select-none transition-transform duration-700 group-hover:scale-105"
              />

              {/* Laser Scanning Effect during Realtime Scan */}
              {isScanning && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center z-30 transition-opacity">
                  {/* Moving scanning beam */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 shadow-[0_0_15px_#10b981] animate-bounce top-1/2" />
                  <div className="relative flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                    <div className="text-center">
                      <p className="text-sm font-bold text-white tracking-wide">
                        네이버 최신 파노라마 이미지 로드 중
                      </p>
                      <p className="text-xs text-emerald-400 mt-0.5">
                        2-Stage 실시간 AI Vision 신경망 분석 수행...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bounding Boxes */}
              {showDetections &&
                !isScanning &&
                segment.streetViewAi.detections.map((box) => {
                  const styleConfig = {
                    SAFETY_GOOD: {
                      border: 'border-emerald-400',
                      bg: 'bg-emerald-500/20',
                      tagBg: 'bg-emerald-600',
                      text: 'text-emerald-200',
                    },
                    SAFETY_WARN: {
                      border: 'border-rose-400',
                      bg: 'bg-rose-500/20',
                      tagBg: 'bg-rose-600',
                      text: 'text-rose-200',
                    },
                    BIKE_HAZARD: {
                      border: 'border-fuchsia-400',
                      bg: 'bg-fuchsia-500/20',
                      tagBg: 'bg-fuchsia-600',
                      text: 'text-fuchsia-200',
                    },
                    SCENERY: {
                      border: 'border-cyan-400',
                      bg: 'bg-cyan-500/20',
                      tagBg: 'bg-cyan-600',
                      text: 'text-cyan-200',
                    },
                  }[box.category];

                  return (
                    <div
                      key={box.id}
                      className={`absolute border-2 ${styleConfig.border} ${styleConfig.bg} rounded transition-all duration-300 pointer-events-auto hover:bg-opacity-40 group/box`}
                      style={{
                        left: `${box.x}%`,
                        top: `${box.y}%`,
                        width: `${box.w}%`,
                        height: `${box.h}%`,
                      }}
                    >
                      {/* Box Label Pill */}
                      <div className="absolute -top-6 left-0 flex items-center gap-1 z-10 whitespace-nowrap pointer-events-none">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded shadow ${styleConfig.tagBg} text-white`}
                        >
                          {box.label} ({Math.round(box.confidence * 100)}%)
                        </span>
                      </div>

                      {/* Tooltip on Hover */}
                      <div className="absolute bottom-1 left-1 right-1 opacity-0 group-hover/box:opacity-100 transition-opacity bg-slate-900/90 backdrop-blur-sm text-[11px] text-white p-1.5 rounded border border-slate-700 pointer-events-none z-20">
                        <span className="font-semibold text-amber-300">{box.impactText}</span>
                      </div>
                    </div>
                  );
                })}

              {/* Live Scan Status Pill */}
              <div className="absolute bottom-2.5 right-2.5 z-10">
                {segment.streetViewAi.isRealtimeUpdated ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm shadow-md">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    2차 실시간 AI 검증 완료 (+0.15점)
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 backdrop-blur-sm shadow-md">
                    <Info className="w-3.5 h-3.5 text-sky-400" />
                    1차 배치 학습 완료
                  </span>
                )}
              </div>
            </div>

            {/* AI Summary Comment */}
            <div className="p-3 bg-slate-900/80 border-t border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold text-slate-200">AI 비전 판독 요약: </span>
                <span className="text-slate-300">{segment.streetViewAi.aiSummaryComment}</span>
              </div>
            </div>

            {/* Realtime Diff Comment if available */}
            {segment.streetViewAi.isRealtimeUpdated && segment.streetViewAi.realtimeDiffComment && (
              <div className="px-3 py-2 bg-emerald-950/40 border-t border-emerald-900/60 text-xs text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  <b>실시간 재분석 결과:</b> {segment.streetViewAi.realtimeDiffComment}
                </span>
              </div>
            )}
          </div>

          {/* Interactive Trigger Button */}
          <button
            onClick={handleRealtimeScanClick}
            disabled={isScanning}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>🔄 현재 도로 클릭: 네이버 최신 거리뷰 실시간 AI 재분석</span>
          </button>

          {/* 4 Metric Mini-bars from streetViewAi */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {/* Lane Clarity */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5">
                <span>차선 선명도</span>
                <span className="font-mono font-bold text-slate-200">
                  {segment.streetViewAi.laneClarityScore}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${segment.streetViewAi.laneClarityScore}%` }}
                />
              </div>
            </div>

            {/* Surface Quality */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5">
                <span>노면 포장 품질</span>
                <span className="font-mono font-bold text-slate-200">
                  {segment.streetViewAi.surfaceQualityScore}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full"
                  style={{ width: `${segment.streetViewAi.surfaceQualityScore}%` }}
                />
              </div>
            </div>

            {/* Bike Surface Hazard Index */}
            <div
              className={`p-2.5 rounded-lg border ${
                mode === 'BIKE' && segment.streetViewAi.bikeSurfaceHazardIndex >= 40
                  ? 'bg-rose-950/30 border-rose-500/50'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span
                  className={
                    mode === 'BIKE' && segment.streetViewAi.bikeSurfaceHazardIndex >= 40
                      ? 'text-rose-300 font-semibold flex items-center gap-0.5'
                      : 'text-slate-400'
                  }
                >
                  바이크 위험도
                </span>
                <span
                  className={`font-mono font-bold ${
                    segment.streetViewAi.bikeSurfaceHazardIndex >= 40
                      ? 'text-rose-400'
                      : 'text-slate-200'
                  }`}
                >
                  {segment.streetViewAi.bikeSurfaceHazardIndex}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    segment.streetViewAi.bikeSurfaceHazardIndex >= 40 ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${segment.streetViewAi.bikeSurfaceHazardIndex}%` }}
                />
              </div>
            </div>

            {/* Scenery Openness */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5">
                <span>풍경 개방감</span>
                <span className="font-mono font-bold text-slate-200">
                  {segment.streetViewAi.sceneryOpennessScore}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${segment.streetViewAi.sceneryOpennessScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. 국가 공공데이터 & AI 산출 근거 (score.breakdown)
        ───────────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            국가 공공데이터 (TAAS · ITS · 표준노드링크) 검증치
          </h3>

          {/* Public Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* TAAS Accidents */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400">최근 1년 TAAS 사고</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span
                  className={`text-lg font-bold ${
                    segment.publicMetrics.accidentsLast1Yr > 5 ? 'text-rose-400' : 'text-slate-100'
                  }`}
                >
                  {segment.publicMetrics.accidentsLast1Yr}
                </span>
                <span className="text-xs text-slate-400">건</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                중상비율 {Math.round(segment.publicMetrics.severeAccidentRatio * 100)}%
              </div>
            </div>

            {/* IC/JC Merge Complexity */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400">합류/분기 복잡도</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span
                  className={`text-lg font-bold ${
                    segment.publicMetrics.icJcMergeComplexity >= 60
                      ? 'text-amber-400'
                      : 'text-slate-100'
                  }`}
                >
                  {segment.publicMetrics.icJcMergeComplexity}
                </span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {segment.publicMetrics.icJcMergeComplexity >= 60 ? '급차선 변경 주의' : '원활한 합류'}
              </div>
            </div>

            {/* ITS Congestion */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400">ITS 평균 혼잡도</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span
                  className={`text-lg font-bold ${
                    segment.publicMetrics.avgCongestionLevel >= 70
                      ? 'text-rose-400'
                      : segment.publicMetrics.avgCongestionLevel >= 40
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {segment.publicMetrics.avgCongestionLevel}
                </span>
                <span className="text-xs text-slate-400">%</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {segment.publicMetrics.avgCongestionLevel >= 70
                  ? '상습 정체 구간'
                  : segment.publicMetrics.avgCongestionLevel >= 40
                  ? '보통 소통'
                  : '소통 원활'}
              </div>
            </div>

            {/* Road Specs */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400">선형 곡률 / 경사도</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-bold text-slate-100">
                  {segment.publicMetrics.curvatureIndex}
                </span>
                <span className="text-xs text-slate-400">
                  / {segment.publicMetrics.slopeGrade}%
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                편도 {segment.publicMetrics.lanes}차로 · {segment.publicMetrics.speedLimit}km/h
              </div>
            </div>
          </div>

          {/* AI Score Breakdown Accordion / List */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 space-y-2.5">
            <div className="text-xs font-semibold text-slate-300 flex items-center justify-between pb-1 border-b border-slate-800/80">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                AI 평점 산출 근거 내역 ({score.breakdown.length}개 가감 요인)
              </span>
              <span className="text-[11px] text-slate-500">실시간 반영</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {score.breakdown.map((item, idx) => {
                const isPositive = item.delta > 0;
                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                            item.target === 'DIFFICULTY'
                              ? 'bg-sky-500/20 text-sky-400'
                              : item.target === 'ATTRACTIVENESS'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-indigo-500/20 text-indigo-400'
                          }`}
                        >
                          {item.target === 'DIFFICULTY'
                            ? '난이도'
                            : item.target === 'ATTRACTIVENESS'
                            ? '매력도'
                            : '종합'}
                        </span>
                        <span className="font-semibold text-slate-200">{item.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">{item.reason}</p>
                    </div>

                    <div
                      className={`font-mono font-bold text-sm px-2 py-0.5 rounded flex items-center gap-0.5 flex-shrink-0 ${
                        isPositive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>
                        {isPositive ? '+' : ''}
                        {item.delta.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            5. 유저 평점 더하기 & 태그 가중치 투표 폼
        ───────────────────────────────────────────────────────────── */}
        <form
          onSubmit={handleVoteSubmit}
          className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              유저 평점 더하기 & 집단지성 태그 투표
            </h3>
            <span className="text-xs text-slate-400">
              현재 참여: <b>{segment.userVoteCount}명</b>
            </span>
          </div>

          {/* Difficulty Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="diff-slider" className="font-semibold text-slate-300">
                내가 체감한 난이도 평점:
              </label>
              <span className="text-sky-400 font-mono font-bold text-sm">
                {userDiffRating.toFixed(1)}점
              </span>
            </div>

            <input
              id="diff-slider"
              type="range"
              min="1.0"
              max="5.0"
              step="0.5"
              value={userDiffRating}
              onChange={(e) => setUserDiffRating(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />

            <div className="flex justify-between text-[11px] text-slate-500">
              <button
                type="button"
                onClick={() => setUserDiffRating(1.0)}
                className={`hover:text-slate-300 ${userDiffRating === 1.0 ? 'text-sky-400 font-bold' : ''}`}
              >
                1.0 (극악)
              </button>
              <button
                type="button"
                onClick={() => setUserDiffRating(2.0)}
                className={`hover:text-slate-300 ${userDiffRating === 2.0 ? 'text-sky-400 font-bold' : ''}`}
              >
                2.0 (어려움)
              </button>
              <button
                type="button"
                onClick={() => setUserDiffRating(3.0)}
                className={`hover:text-slate-300 ${userDiffRating === 3.0 ? 'text-sky-400 font-bold' : ''}`}
              >
                3.0 (쉬운 편/기준)
              </button>
              <button
                type="button"
                onClick={() => setUserDiffRating(4.0)}
                className={`hover:text-slate-300 ${userDiffRating === 4.0 ? 'text-sky-400 font-bold' : ''}`}
              >
                4.0 (쾌적)
              </button>
              <button
                type="button"
                onClick={() => setUserDiffRating(5.0)}
                className={`hover:text-slate-300 ${userDiffRating === 5.0 ? 'text-sky-400 font-bold' : ''}`}
              >
                5.0 (초보천국)
              </button>
            </div>
          </div>

          {/* Attractiveness Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="attr-slider" className="font-semibold text-slate-300">
                내가 체감한 매력도 평점:
              </label>
              <span className="text-purple-400 font-mono font-bold text-sm">
                {userAttrRating.toFixed(1)}점
              </span>
            </div>

            <input
              id="attr-slider"
              type="range"
              min="1.0"
              max="5.0"
              step="0.5"
              value={userAttrRating}
              onChange={(e) => setUserAttrRating(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />

            <div className="flex justify-between text-[11px] text-slate-500">
              <button
                type="button"
                onClick={() => setUserAttrRating(1.0)}
                className={`hover:text-slate-300 ${userAttrRating === 1.0 ? 'text-purple-400 font-bold' : ''}`}
              >
                1.0 (삭막)
              </button>
              <button
                type="button"
                onClick={() => setUserAttrRating(2.0)}
                className={`hover:text-slate-300 ${userAttrRating === 2.0 ? 'text-purple-400 font-bold' : ''}`}
              >
                2.0 (보통 이하)
              </button>
              <button
                type="button"
                onClick={() => setUserAttrRating(3.0)}
                className={`hover:text-slate-300 ${userAttrRating === 3.0 ? 'text-purple-400 font-bold' : ''}`}
              >
                3.0 (무난)
              </button>
              <button
                type="button"
                onClick={() => setUserAttrRating(4.0)}
                className={`hover:text-slate-300 ${userAttrRating === 4.0 ? 'text-purple-400 font-bold' : ''}`}
              >
                4.0 (드라이브 추천)
              </button>
              <button
                type="button"
                onClick={() => setUserAttrRating(5.0)}
                className={`hover:text-slate-300 ${userAttrRating === 5.0 ? 'text-purple-400 font-bold' : ''}`}
              >
                5.0 (극상 뷰맛집)
              </button>
            </div>
          </div>

          {/* Quick Tags Selection Chips */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>특성 태그 선택 (다중 선택 가능):</span>
              <span className="text-[11px] text-slate-500">
                선택됨: {selectedTagIds.length}개
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {AVAILABLE_QUICK_TAGS.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.tagId);
                const diffDelta =
                  mode === 'CAR' ? tag.carDifficultyDelta : tag.bikeDifficultyDelta;
                const attrDelta =
                  mode === 'CAR' ? tag.carAttractivenessDelta : tag.bikeAttractivenessDelta;

                // Match with segment tags to show existing count if any
                const existingTag = segment.tags.find(
                  (t) => t.tagId === tag.tagId || t.label === tag.label
                );
                const count = existingTag ? existingTag.count : 0;

                return (
                  <button
                    type="button"
                    key={tag.tagId}
                    onClick={() => handleTagToggle(tag.tagId)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <span>{tag.label}</span>
                    {count > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono">
                        {count}
                      </span>
                    )}
                    <span className="text-[10px] opacity-75 font-mono">
                      (난이도 {diffDelta >= 0 ? `+${diffDelta}` : diffDelta} / 매력도{' '}
                      {attrDelta >= 0 ? `+${attrDelta}` : attrDelta})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confirmation Toast / Feedback Banner */}
          {voteSubmitted && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-fade-in shadow-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                성공적으로 평점(난이도 <b>{userDiffRating.toFixed(1)}</b> / 매력도{' '}
                <b>{userAttrRating.toFixed(1)}</b>)과 <b>{selectedTagIds.length}개 태그</b>가
                베이지안 집단지성 알고리즘에 반영되었습니다!
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>⚡ 내 평점 & 태그 가중치 반영하기</span>
          </button>
        </form>
      </div>
    </div>
  );
};
