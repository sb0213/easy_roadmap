import React, { useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  Car,
  CheckCircle2,
  Clock,
  Compass,
  Eye,
  MapPin,
  Route,
  ShieldCheck,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { ComputedRoadScore, RoadSegment, VehicleMode } from '../types/road';

export interface RouteComparisonModalProps {
  isOpen: boolean;
  mode: VehicleMode;
  segments: RoadSegment[];
  scoresMap: Record<string, ComputedRoadScore>;
  onClose: () => void;
  onSelectSegmentFromRoute: (segmentId: string) => void;
}

export const RouteComparisonModal: React.FC<RouteComparisonModalProps> = ({
  isOpen,
  mode,
  segments,
  scoresMap,
  onClose,
  onSelectSegmentFromRoute,
}) => {
  // ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lookup helper for segments
  const segmentMap = useMemo(() => {
    const map: Record<string, RoadSegment> = {};
    segments.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [segments]);

  if (!isOpen) return null;

  // Segment IDs for Traditional Route (Fastest route)
  const traditionalRouteSegmentIds = ['seg-teheran-gangnam', 'seg-seongsu-jc', 'seg-yeouido-ic'];

  // Segment IDs for Easy Roadmap AI Recommended Route
  const aiRouteSegmentIds =
    mode === 'CAR'
      ? ['seg-banpo-main', 'seg-jamsil-lake', 'seg-bukhangang-scenic']
      : ['seg-banpo-main', 'seg-bugak-winding', 'seg-bukhangang-scenic'];

  const handleSelect = (segId: string) => {
    onSelectSegmentFromRoute(segId);
    onClose();
  };

  const handleApplyAiRoute = () => {
    // Start with the first recommended segment
    onSelectSegmentFromRoute(aiRouteSegmentIds[0]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-5xl my-auto rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                AI 경로 비교 시뮬레이터
              </span>
              <span className="text-xs text-slate-400">
                {mode === 'CAR' ? '🚗 초보안심 내비 모드' : '🏍️ 바이크 투어링 모드'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2">
              일반 최단시간 빠른길 <span className="text-slate-500 font-normal">VS</span> Easy Roadmap AI 안심 경로
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-slate-300">출발:</span> 강남/서초 (강남역·테헤란로)
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="font-semibold text-slate-300">도착:</span> 경기 북한강/강북 (서종 IC 방면)
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Key Takeaway Callout */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/20 to-slate-900 border border-emerald-500/30 flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex-1 text-xs sm:text-sm">
              <div className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
                <span>Easy Roadmap AI 분석 결론:</span>
                <span className="text-emerald-400">단 +5분만 더 투자하세요!</span>
              </div>
              <p className="text-slate-300 mt-0.5 leading-relaxed">
                {mode === 'CAR'
                  ? '기존 내비는 5분을 아끼려다 극악의 성수대교 JC 합류(사고위험 4.2배)로 유도합니다. AI 안심 경로는 5차선 광폭 반포대로와 북한강 비단길을 타므로 초보자도 스트레스 없이 쾌적하게 도착합니다.'
                  : '기존 내비는 최단시간을 위해 동부간선·강변북로 등 자동차전용도로로 잘못 유도(과태료 30만원 및 치명적 위험)합니다. AI 추천 경로는 100% 합법 일반도로와 A급 비단길 노면, 북악 와인딩 코너링을 선사합니다.'}
              </p>
            </div>
          </div>

          {/* Side-by-Side Route Comparison Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Route A: Traditional Fastest Route */}
            <div className="rounded-2xl bg-slate-950/60 border border-rose-900/40 p-5 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-rose-900/40 border-b border-l border-rose-700/50 rounded-bl-xl text-[11px] font-bold text-rose-300">
                기존 일반 내비 빠른길
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <Clock className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-200 text-base">최단시간 우선 경로 (티맵/카카오 기본)</h3>
                    <div className="flex items-center gap-2 text-xs mt-0.5">
                      <span className="font-bold text-rose-400 text-sm">38분 소요</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-slate-400">총 29.4 km</span>
                      <span className="text-slate-500">|</span>
                      <span className="font-bold text-rose-400">평균 1.8★ (위험)</span>
                    </div>
                  </div>
                </div>

                {/* Warning Banner */}
                <div className="p-3 mb-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">
                      {mode === 'CAR' ? '초보운전자 주의 경보:' : '🚨 이륜차 통행금지 구역 포함:'}
                    </span>
                    <span className="text-slate-300 ml-1">
                      {mode === 'CAR'
                        ? '성수대교 북단 JC (합류복잡도 92)에서 120m 내 3연속 차선변경 필요! 테헤란로 상습 꼬리물기 혼잡.'
                        : '동부간선/강변북로/성수JC 등 자동차전용도로 포함! 도로교통법 위반 과태료 및 대형차 속도차 사고 위험.'}
                    </span>
                  </div>
                </div>

                {/* Segments included in Route A */}
                <div className="space-y-2 mb-4">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    경유 주요 도로 구간 (클릭 시 지도 이동)
                  </div>
                  {traditionalRouteSegmentIds.map((id) => {
                    const seg = segmentMap[id];
                    const score = scoresMap[id];
                    if (!seg) return null;
                    const isRestricted = score?.isRestrictedForBike ?? (mode === 'BIKE' && seg.publicMetrics.isAutoOnly);
                    const overall = score?.finalOverallScore ?? 1.8;

                    return (
                      <div
                        key={id}
                        onClick={() => handleSelect(id)}
                        className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-rose-500/40 cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isRestricted ? 'bg-rose-500 animate-pulse' : 'bg-rose-500'
                            }`}
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-200 group-hover:text-rose-300 flex items-center gap-1.5">
                              {seg.name}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {seg.publicMetrics.icJcMergeComplexity > 50
                                ? `합류복잡도 ${seg.publicMetrics.icJcMergeComplexity}/100 극악`
                                : `혼잡도 ${seg.publicMetrics.avgCongestionLevel}% · 사고 ${seg.publicMetrics.accidentsLast1Yr}건`}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          {isRestricted ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                              통행불가
                            </span>
                          ) : (
                            <span className="text-xs font-black text-rose-400">{overall.toFixed(1)}★</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>예상 통행료: 0원</span>
                <span className="text-rose-400 font-semibold">초보 스트레스 지수: 95점 (극심)</span>
              </div>
            </div>

            {/* Route B: Easy Roadmap AI Recommended Route */}
            <div className="rounded-2xl bg-emerald-950/20 border-2 border-emerald-500/60 p-5 flex flex-col justify-between relative overflow-hidden shadow-xl shadow-emerald-950/40">
              <div className="absolute top-0 right-0 px-3.5 py-1 bg-emerald-500 text-slate-950 rounded-bl-xl text-[11px] font-black flex items-center gap-1 shadow-md">
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                AI 추천 BEST
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-emerald-100 text-base">
                      {mode === 'CAR' ? '초보안심 & 뷰맛집 힐링 경로' : '바이크 성지 & 비단길 투어링 경로'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs mt-0.5">
                      <span className="font-bold text-emerald-400 text-sm">43분 소요 (+5분)</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-slate-300">총 32.1 km</span>
                      <span className="text-slate-500">|</span>
                      <span className="font-bold text-emerald-400">평균 4.6★ (명품)</span>
                    </div>
                  </div>
                </div>

                {/* AI Benefit Banner */}
                <div className="p-3 mb-4 rounded-xl bg-emerald-900/30 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">
                      {mode === 'CAR' ? '초보 안심 보증 팩터:' : '🏍️ 라이더 특화 프리미엄:'}
                    </span>
                    <span className="text-slate-200 ml-1">
                      {mode === 'CAR'
                        ? '반포대로 5차선 광폭 직선 도로 + 갓길 불법주정차 0% + 북한강 수변 파노라마 96%로 편안함 극대화.'
                        : '자동차전용도로 100% 합법 회피 + 배수로 그레이팅/포트홀 슬립 위험 0% 비단길 노면 + 코너링 재미.'}
                    </span>
                  </div>
                </div>

                {/* Segments included in Route B */}
                <div className="space-y-2 mb-4">
                  <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                    추천 경유 구간 (클릭 시 지도 이동)
                  </div>
                  {aiRouteSegmentIds.map((id) => {
                    const seg = segmentMap[id];
                    const score = scoresMap[id];
                    if (!seg) return null;
                    const overall = score?.finalOverallScore ?? 4.7;

                    return (
                      <div
                        key={id}
                        onClick={() => handleSelect(id)}
                        className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-emerald-500/30 hover:border-emerald-400 cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                          <div>
                            <div className="text-xs font-bold text-slate-100 group-hover:text-emerald-300 flex items-center gap-1.5">
                              {seg.name}
                            </div>
                            <div className="text-[11px] text-slate-300 mt-0.5">
                              {seg.streetViewAi.aiSummaryComment.slice(0, 36)}…
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-400">{overall.toFixed(1)}★</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                <span>예상 통행료: 0원</span>
                <span className="text-emerald-400 font-bold">초보 안심 만족도: 98점 (최상)</span>
              </div>
            </div>
          </div>

          {/* Detailed Metric Comparison Matrix */}
          <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              상세 항목별 1:1 비교 분석표
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2 font-medium">비교 항목</th>
                    <th className="pb-2 font-medium text-rose-400">기존 빠른길 (일반 내비)</th>
                    <th className="pb-2 font-medium text-emerald-400">Easy Roadmap AI 안심 추천</th>
                    <th className="pb-2 font-medium text-right">개선 효과</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr>
                    <td className="py-2.5 font-semibold text-slate-200">총 소요 시간</td>
                    <td className="py-2.5">38분</td>
                    <td className="py-2.5 text-emerald-300 font-semibold">43분</td>
                    <td className="py-2.5 text-right font-medium text-slate-400">+5분 차이</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-slate-200">종합 안전 평점</td>
                    <td className="py-2.5 text-rose-400">1.8★ (위험·난이도 높음)</td>
                    <td className="py-2.5 text-emerald-400 font-bold">4.6★ (초보천국 / 성지)</td>
                    <td className="py-2.5 text-right font-bold text-emerald-400">+2.8★ 대폭 상승</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-slate-200">차선 합류 난이도</td>
                    <td className="py-2.5 text-rose-400">합류복잡도 92 (극악 JC 합류)</td>
                    <td className="py-2.5 text-emerald-300">합류복잡도 10 (광폭 직선 위주)</td>
                    <td className="py-2.5 text-right text-emerald-400 font-medium">합류 스트레스 90% 완화</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-slate-200">노면 포장 & 시인성</td>
                    <td className="py-2.5">포트홀, 배수로 그레이팅 다수</td>
                    <td className="py-2.5 text-emerald-300">A급 신설 비단길 노면 (96점)</td>
                    <td className="py-2.5 text-right text-emerald-400 font-medium">슬립 위험 0% 검증</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-semibold text-slate-200">주변 경관 & 개방감</td>
                    <td className="py-2.5">도심 방음벽 & 빌딩숲 (25점)</td>
                    <td className="py-2.5 text-emerald-300">북한강 수변 파노라마 (96점)</td>
                    <td className="py-2.5 text-right text-emerald-400 font-medium">드라이브 만족도 3.8배</td>
                  </tr>
                  {mode === 'BIKE' && (
                    <tr className="bg-rose-950/20">
                      <td className="py-2.5 font-bold text-rose-300">이륜차 통행 적법성</td>
                      <td className="py-2.5 text-rose-400 font-bold">🚫 불법 (전용도로 과태료 30만)</td>
                      <td className="py-2.5 text-emerald-400 font-bold">✅ 100% 합법 일반도로</td>
                      <td className="py-2.5 text-right font-bold text-emerald-400">합법 주행 보장</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>경로 내 각 도로 카드를 클릭하면 지도로 바로 이동하여 상세 정보를 확인합니다.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-all active:scale-95"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleApplyAiRoute}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-black shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>이 안심 추천 경로로 지도 탐색</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
