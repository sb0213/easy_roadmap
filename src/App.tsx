import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  VehicleMode,
  RoadSegment,
  ComputedRoadScore,
  SegmentCategory,
} from './types/road';
import { calculateRoadScore, getScoreColor } from './engine/scoringEngine';
import { INITIAL_ROAD_SEGMENTS, AVAILABLE_QUICK_TAGS } from './data/mockRoads';
import { RoadMapCanvas } from './components/RoadMapCanvas';
import { RoadDetailSheet } from './components/RoadDetailSheet';
import { RouteComparisonModal } from './components/RouteComparisonModal';
import {
  Car,
  Bike,
  Compass,
  MapPin,
  Smartphone,
  Monitor,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Info,
} from 'lucide-react';

type FilterType = 'ALL' | 'EASY_4PLUS' | 'IC_JC_WARN' | 'SCENIC' | 'BIKE_RECOMMEND';
type ViewLayout = 'SPLIT_DESKTOP' | 'MOBILE_FRAME';
type RightPanelView = 'DETAIL' | 'LIST';

export const App: React.FC = () => {
  // 1. Core State
  const [segments, setSegments] = useState<RoadSegment[]>(INITIAL_ROAD_SEGMENTS);
  const [mode, setMode] = useState<VehicleMode>('CAR');
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>('seg-bukhangang-scenic');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRouteModalOpen, setIsRouteModalOpen] = useState<boolean>(false);
  const [viewLayout, setViewLayout] = useState<ViewLayout>('SPLIT_DESKTOP');
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>('DETAIL');

  // Mobile frame internal navigation state
  const [mobileTab, setMobileTab] = useState<'MAP' | 'DETAIL' | 'LIST'>('MAP');

  // 2. Dynamic Scores Map (Re-calculated when segments or mode changes)
  const scoresMap = useMemo<Record<string, ComputedRoadScore>>(() => {
    const map: Record<string, ComputedRoadScore> = {};
    for (const seg of segments) {
      map[seg.id] = calculateRoadScore(seg, mode);
    }
    return map;
  }, [segments, mode]);

  // Selected Segment & Score (Robust fallback guarantees no blank/crash)
  const selectedSegment = useMemo<RoadSegment>(() => {
    return (
      segments.find((s) => s.id === selectedSegmentId) ||
      segments[0] ||
      INITIAL_ROAD_SEGMENTS[0]
    );
  }, [segments, selectedSegmentId]);

  const selectedScore = useMemo<ComputedRoadScore>(() => {
    if (!selectedSegment) return calculateRoadScore(INITIAL_ROAD_SEGMENTS[0], mode);
    return scoresMap[selectedSegment.id] || calculateRoadScore(selectedSegment, mode);
  }, [scoresMap, selectedSegment, mode]);

  // Carousel ref & auto-scroll to active card
  const carouselContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!carouselContainerRef.current || !selectedSegment?.id) return;
    const activeEl = carouselContainerRef.current.querySelector(
      `[data-segment-id="${selectedSegment.id}"]`
    );
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedSegment?.id]);

  // Filtered Segments
  const filteredSegments = useMemo<RoadSegment[]>(() => {
    return segments.filter((seg) => {
      const score = scoresMap[seg.id];

      // Search keyword filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = seg.name.toLowerCase().includes(q);
        const matchSub = seg.subName.toLowerCase().includes(q);
        const matchRegion = seg.region.toLowerCase().includes(q);
        const matchTag = seg.tags.some((t) => t.label.toLowerCase().includes(q));
        if (!matchName && !matchSub && !matchRegion && !matchTag) return false;
      }

      // Filter chips
      switch (activeFilter) {
        case 'EASY_4PLUS':
          return score ? score.finalOverallScore >= 4.0 : true;
        case 'IC_JC_WARN':
          return (
            seg.category === 'IC_RAMP' ||
            seg.category === 'JC_MERGE' ||
            seg.publicMetrics.icJcMergeComplexity >= 50
          );
        case 'SCENIC':
          return (
            seg.category === 'SCENIC_WINDING' ||
            seg.streetViewAi.sceneryOpennessScore >= 75
          );
        case 'BIKE_RECOMMEND':
          return (
            !seg.publicMetrics.isAutoOnly &&
            ((score && score.finalOverallScore >= 3.8) || seg.category === 'SCENIC_WINDING')
          );
        case 'ALL':
        default:
          return true;
      }
    });
  }, [segments, scoresMap, activeFilter, searchQuery]);

  // Filter Counts for Badges
  const filterCounts = useMemo(() => {
    return {
      all: segments.length,
      easy: segments.filter((s) => (scoresMap[s.id]?.finalOverallScore || 0) >= 4.0).length,
      icJc: segments.filter(
        (s) => s.category === 'IC_RAMP' || s.category === 'JC_MERGE' || s.publicMetrics.icJcMergeComplexity >= 50
      ).length,
      scenic: segments.filter(
        (s) => s.category === 'SCENIC_WINDING' || s.streetViewAi.sceneryOpennessScore >= 75
      ).length,
      bikeRec: segments.filter(
        (s) => !s.publicMetrics.isAutoOnly && ((scoresMap[s.id]?.finalOverallScore || 0) >= 3.8 || s.category === 'SCENIC_WINDING')
      ).length,
    };
  }, [segments, scoresMap]);

  // Handlers
  const handleSelectSegment = (segmentId: string) => {
    setSelectedSegmentId(segmentId);
    setRightPanelView('DETAIL');
    if (mobileTab === 'LIST') {
      setMobileTab('DETAIL');
    }
  };

  const handleTriggerRealtimeScan = (segmentId: string) => {
    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.id !== segmentId) return seg;
        return {
          ...seg,
          streetViewAi: {
            ...seg.streetViewAi,
            isRealtimeUpdated: true,
            lastAiScanTimestamp: '방금 전 (클릭 실시간 거리뷰 재분석 완료)',
            laneClarityScore: Math.min(100, seg.streetViewAi.laneClarityScore + 2),
            surfaceQualityScore: Math.min(100, seg.streetViewAi.surfaceQualityScore + 2),
          },
        };
      })
    );
  };

  const handleSubmitUserVote = (
    segmentId: string,
    diffRating: number,
    attrRating: number,
    selectedTagIds: string[]
  ) => {
    setSegments((prev) =>
      prev.map((seg) => {
        if (seg.id !== segmentId) return seg;
        const updatedTags = [...seg.tags];

        for (const tagId of selectedTagIds) {
          const existingIdx = updatedTags.findIndex((t) => t.tagId === tagId);
          if (existingIdx >= 0) {
            updatedTags[existingIdx] = {
              ...updatedTags[existingIdx],
              count: updatedTags[existingIdx].count + 1,
            };
          } else {
            const quickTag = AVAILABLE_QUICK_TAGS.find((q) => q.tagId === tagId);
            if (quickTag) {
              updatedTags.push({
                ...quickTag,
                count: 1,
              });
            }
          }
        }

        return {
          ...seg,
          userVoteCount: seg.userVoteCount + 1,
          userDifficultySum: seg.userDifficultySum + diffRating,
          userAttractivenessSum: seg.userAttractivenessSum + attrRating,
          tags: updatedTags,
        };
      })
    );
  };

  const handleSelectSegmentFromRoute = (segmentId: string) => {
    setActiveFilter('ALL');
    setSearchQuery('');
    setSelectedSegmentId(segmentId);
    setRightPanelView('DETAIL');
    setMobileTab('DETAIL');
    setIsRouteModalOpen(false);
  };

  const handlePrevSegment = () => {
    const list = filteredSegments.length > 0 ? filteredSegments : segments;
    const currentIndex = list.findIndex((s) => s.id === selectedSegment.id);
    const prevIndex = currentIndex >= 0 ? (currentIndex - 1 + list.length) % list.length : 0;
    setSelectedSegmentId(list[prevIndex].id);
  };

  const handleNextSegment = () => {
    const list = filteredSegments.length > 0 ? filteredSegments : segments;
    const currentIndex = list.findIndex((s) => s.id === selectedSegment.id);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % list.length : 0;
    setSelectedSegmentId(list[nextIndex].id);
  };

  const activeStepperList = filteredSegments.length > 0 ? filteredSegments : segments;
  const currentStepperIndex = activeStepperList.findIndex((s) => s.id === selectedSegment.id);

  // Helper for category badge styling
  const getCategoryMeta = (cat: SegmentCategory) => {
    switch (cat) {
      case 'IC_RAMP':
        return { label: 'IC 램프', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'JC_MERGE':
        return { label: 'JC 분기점', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
      case 'SCENIC_WINDING':
        return { label: '와인딩·경관', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'INTERSECTION':
        return { label: '도심 교차', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30' };
      case 'MAIN_ROAD':
      default:
        return { label: '일반 본선', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* 1. TOP GLOBAL NAVIGATION BAR */}
      <header className="flex-shrink-0 h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between z-30">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-sky-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Compass className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-1.5">
                Easy Roadmap
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  AI Nav
                </span>
              </h1>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium hidden sm:block">
              국가 공공데이터 × 네이버 거리뷰 AI 도로평점 내비
            </p>
          </div>
        </div>

        {/* Center/Right Controls: Vehicle Mode & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* VEHICLE MODE SWITCHER */}
          <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex items-center shadow-inner">
            <button
              onClick={() => setMode('CAR')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                mode === 'CAR'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="자동차 모드: 초보·장롱면허 운전자 안심 도로 중심"
            >
              <Car className="w-4 h-4" />
              <span className="hidden md:inline">자동차 모드</span>
              <span className="md:hidden">자동차</span>
            </button>
            <button
              onClick={() => setMode('BIKE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                mode === 'BIKE'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="바이크 모드: 전용도로 우회, 노면 포트홀·그레이팅 감지, 와인딩 가산"
            >
              <Bike className="w-4 h-4" />
              <span className="hidden md:inline">바이크 모드</span>
              <span className="md:hidden">바이크</span>
            </button>
          </div>

          {/* AI ROUTE COMPARISON BUTTON */}
          <button
            onClick={() => setIsRouteModalOpen(true)}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-sky-500/20 via-indigo-500/20 to-emerald-500/20 hover:from-sky-500/30 hover:to-emerald-500/30 text-sky-300 border border-sky-400/30 hover:border-sky-400/50 shadow-md transition-all active:scale-95"
          >
            <Compass className="w-4 h-4 text-sky-400 animate-spin-slow" />
            <span className="hidden sm:inline">🧭 AI 안심 내비 경로 비교</span>
            <span className="sm:hidden">경로 비교</span>
          </button>

          {/* VIEW LAYOUT TOGGLE (Desktop Split vs Mobile Frame Simulator) */}
          <div className="hidden lg:flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewLayout('SPLIT_DESKTOP')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                viewLayout === 'SPLIT_DESKTOP'
                  ? 'bg-slate-800 text-sky-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="와이드 대시보드 뷰 (PC 최적화)"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewLayout('MOBILE_FRAME')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                viewLayout === 'MOBILE_FRAME'
                  ? 'bg-slate-800 text-emerald-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="스마트폰 내비게이션 시뮬레이터 뷰"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. BIKE MODE ACTIVE BANNER (Highlighted when BIKE mode is selected) */}
      {mode === 'BIKE' && (
        <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900/90 to-teal-950/90 border-b border-emerald-500/30 px-4 py-2 flex items-center justify-between text-xs sm:text-sm z-20 animate-fadeIn">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
              <Bike className="w-4 h-4" />
            </div>
            <p className="text-emerald-200">
              <strong className="text-emerald-300 font-semibold mr-1.5">바이크 모드 활성화:</strong>
              자동차전용도로 차단, 노면(포트홀·그레이팅) 위험 가중치 2.5배, 와인딩 코너링 매력도 보너스가 적용됩니다.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-emerald-400/90 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            라이더 안심 필터 가동 중
          </div>
        </div>
      )}

      {/* 3. SUB HEADER: FILTER CHIPS & SEARCH BAR */}
      <div className="flex-shrink-0 bg-slate-900/60 border-b border-slate-800/80 px-4 py-2 flex flex-wrap items-center justify-between gap-2 z-20">
        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeFilter === 'ALL'
                ? 'bg-slate-700 text-white font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            전체 구간 ({filterCounts.all})
          </button>
          <button
            onClick={() => setActiveFilter('EASY_4PLUS')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeFilter === 'EASY_4PLUS'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
            }`}
          >
            🟢 4.0★ 이상 안심·명품길 ({filterCounts.easy})
          </button>
          <button
            onClick={() => setActiveFilter('IC_JC_WARN')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeFilter === 'IC_JC_WARN'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-amber-300 hover:bg-slate-800'
            }`}
          >
            ⚠️ IC·분기점 주의구간 ({filterCounts.icJc})
          </button>
          <button
            onClick={() => setActiveFilter('SCENIC')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeFilter === 'SCENIC'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-sky-300 hover:bg-slate-800'
            }`}
          >
            🌸 뷰맛집·와인딩 코스 ({filterCounts.scenic})
          </button>
          {mode === 'BIKE' && (
            <button
              onClick={() => setActiveFilter('BIKE_RECOMMEND')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeFilter === 'BIKE_RECOMMEND'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-teal-300 hover:bg-slate-800'
              }`}
            >
              🏍️ 라이더 추천 코스 ({filterCounts.bikeRec})
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="구간명, 지역, 태그 검색..."
            className="w-full bg-slate-950/70 text-xs text-slate-200 placeholder-slate-500 rounded-lg pl-8 pr-7 py-1.5 border border-slate-800 focus:outline-none focus:border-emerald-500/60 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. MAIN WORKSPACE CONTENT */}
      {viewLayout === 'SPLIT_DESKTOP' ? (
        /* ================= DESKTOP SPLIT VIEW ================= */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* LEFT: MAP CANVAS & BOTTOM FLOATING CAROUSEL */}
          <div className="flex-1 relative h-[50vh] lg:h-full overflow-hidden bg-slate-950">
            {/* Interactive Leaflet Road Map Canvas */}
            <RoadMapCanvas
              segments={filteredSegments}
              allSegments={segments}
              scoresMap={scoresMap}
              selectedSegmentId={selectedSegmentId}
              mode={mode}
              onSelectSegment={handleSelectSegment}
            />

            {/* FLOATING QUICK CAROUSEL OVER MAP (Bottom) */}
            {filteredSegments.length > 0 && (
              <div className="absolute bottom-3 left-3 right-3 z-[350] pointer-events-none">
                <div
                  ref={carouselContainerRef}
                  className="pointer-events-auto flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
                >
                  {filteredSegments.map((seg) => {
                    const segScore = scoresMap[seg.id] || calculateRoadScore(seg, mode);
                    const isSelected = seg.id === selectedSegment.id;
                    const catMeta = getCategoryMeta(seg.category);

                    return (
                      <div
                        key={seg.id}
                        data-segment-id={seg.id}
                        onClick={() => handleSelectSegment(seg.id)}
                        className={`flex-shrink-0 w-64 p-2.5 rounded-xl cursor-pointer transition-all border backdrop-blur-md shadow-xl ${
                          isSelected
                            ? 'bg-slate-900/95 border-emerald-400/80 ring-2 ring-emerald-400/40 translate-y-[-2px]'
                            : 'bg-slate-900/80 border-slate-700/60 hover:bg-slate-900/95 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${catMeta.color}`}
                          >
                            {catMeta.label}
                          </span>
                          <div
                            className="px-1.5 py-0.5 rounded text-[11px] font-extrabold flex items-center gap-1 shadow-sm"
                            style={{
                              backgroundColor: `${segScore.heatmapColor}25`,
                              color: segScore.heatmapColor,
                              border: `1px solid ${segScore.heatmapColor}50`,
                            }}
                          >
                            <span>★</span>
                            <span>{segScore.finalOverallScore.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="font-semibold text-xs text-white truncate">{seg.name}</div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{seg.subName}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: DETAIL SHEET & ROAD LIST PANEL */}
          <div className="w-full lg:w-[480px] xl:w-[540px] flex-shrink-0 h-[50vh] lg:h-full bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col overflow-hidden z-20">
            {/* Panel Tab Switcher Header */}
            <div className="flex-shrink-0 h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setRightPanelView('DETAIL')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    rightPanelView === 'DETAIL'
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📊 상세 분석 & 거리뷰 AI
                </button>
                <button
                  onClick={() => setRightPanelView('LIST')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    rightPanelView === 'LIST'
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📋 구간 목록 ({filteredSegments.length})
                </button>
              </div>

              {/* Quick prev/next segment stepper */}
              <div className="flex items-center gap-1 text-slate-400">
                <button
                  onClick={handlePrevSegment}
                  className="p-1.5 rounded-md hover:bg-slate-800 hover:text-slate-200 transition-colors"
                  title="이전 구간 보기"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono text-slate-500 px-1">
                  {currentStepperIndex >= 0 ? currentStepperIndex + 1 : 1} / {activeStepperList.length}
                </span>
                <button
                  onClick={handleNextSegment}
                  className="p-1.5 rounded-md hover:bg-slate-800 hover:text-slate-200 transition-colors"
                  title="다음 구간 보기"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Panel Body Content */}
            <div className="flex-1 overflow-y-auto">
              {rightPanelView === 'DETAIL' ? (
                <RoadDetailSheet
                  key={selectedSegment.id}
                  segment={selectedSegment}
                  score={selectedScore}
                  mode={mode}
                  onTriggerRealtimeScan={handleTriggerRealtimeScan}
                  onSubmitUserVote={handleSubmitUserVote}
                  onClose={() => setRightPanelView('LIST')}
                />
              ) : (
                /* Road List View */
                <div className="p-4 space-y-3">
                  <div className="text-xs text-slate-400 font-medium mb-1">
                    총 {filteredSegments.length}개 구간 탐색 중 (클릭 시 지도 이동 및 AI 분석 표시)
                  </div>
                  {filteredSegments.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                      <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-300">검색 조건에 맞는 구간이 없습니다.</p>
                      <p className="text-xs text-slate-500 mt-1">필터를 초기화하거나 다른 검색어를 입력해보세요.</p>
                      <button
                        onClick={() => {
                          setActiveFilter('ALL');
                          setSearchQuery('');
                        }}
                        className="mt-3 px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium cursor-pointer transition-colors"
                      >
                        전체 구간 보기
                      </button>
                    </div>
                  ) : (
                    filteredSegments.map((seg) => {
                    const score = scoresMap[seg.id] || calculateRoadScore(seg, mode);
                    const isSelected = seg.id === selectedSegment.id;
                    const catMeta = getCategoryMeta(seg.category);

                    return (
                      <div
                        key={seg.id}
                        onClick={() => handleSelectSegment(seg.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800/90 border-emerald-400/80 ring-1 ring-emerald-400/50'
                            : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${catMeta.color}`}
                              >
                                {catMeta.label}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">
                                {seg.region}
                              </span>
                            </div>
                            <h3 className="font-bold text-sm text-white">{seg.name}</h3>
                          </div>

                          <div
                            className="px-2.5 py-1 rounded-lg text-right flex-shrink-0"
                            style={{
                              backgroundColor: `${score.heatmapColor}20`,
                              border: `1px solid ${score.heatmapColor}40`,
                            }}
                          >
                            <div
                              className="text-base font-extrabold"
                              style={{ color: score.heatmapColor }}
                            >
                              ★ {score.finalOverallScore.toFixed(1)}
                            </div>
                            <div className="text-[9px] text-slate-300 font-medium">
                              {score.gradeLabel.split(' · ')[0]}
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-1 mb-2.5">{seg.subName}</p>

                        {/* Badges / Metrics Row */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-300 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                            난이도: <strong>{score.finalDifficultyScore.toFixed(1)}</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                            매력도: <strong>{score.finalAttractivenessScore.toFixed(1)}</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                            사고: {seg.publicMetrics.accidentsLast1Yr}건
                          </span>
                          {seg.publicMetrics.isAutoOnly && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] border border-rose-500/30">
                              자동차전용
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ================= MOBILE SIMULATOR FRAME VIEW ================= */
        <div className="flex-1 flex items-center justify-center p-3 lg:p-6 overflow-hidden bg-slate-950 relative">
          {/* Subtle Ambient Glow */}
          <div className="absolute w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none"></div>

          {/* Smartphone Simulator Mockup Frame */}
          <div className="w-[390px] h-[780px] max-h-[94vh] bg-slate-900 rounded-[48px] border-[10px] border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative flex flex-col overflow-hidden ring-1 ring-white/10">
            {/* Top Speaker / Dynamic Island */}
            <div className="h-6 bg-slate-950 flex items-center justify-center relative flex-shrink-0">
              <div className="w-24 h-4 bg-black rounded-full flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-slate-900 ml-auto mr-2"></div>
              </div>
            </div>

            {/* Mobile Header Bar */}
            <div className="h-12 bg-slate-900/90 border-b border-slate-800 px-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-1.5 font-bold text-sm text-white">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>Easy Roadmap</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMode(mode === 'CAR' ? 'BIKE' : 'CAR')}
                  className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-800 border border-slate-700 text-slate-200"
                >
                  {mode === 'CAR' ? '🚗 자동차' : '🏍️ 바이크'}
                </button>
                <button
                  onClick={() => setIsRouteModalOpen(true)}
                  className="p-1 rounded-md bg-sky-500/20 text-sky-300"
                  title="경로 비교"
                >
                  <Compass className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Mobile Body Content based on mobileTab */}
            <div className="flex-1 overflow-hidden flex flex-col relative">
              {mobileTab === 'MAP' && (
                <div className="flex-1 relative">
                  <RoadMapCanvas
                    segments={filteredSegments}
                    allSegments={segments}
                    scoresMap={scoresMap}
                    selectedSegmentId={selectedSegmentId}
                    mode={mode}
                    onSelectSegment={handleSelectSegment}
                  />

                  {/* Floating Mini Card at Bottom of Mobile Map */}
                  <div
                    onClick={() => setMobileTab('DETAIL')}
                    className="absolute bottom-2 left-2 right-2 bg-slate-900/95 border border-emerald-500/50 rounded-xl p-2.5 shadow-2xl z-[350] cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        선택 구간 AI 분석
                      </span>
                      <span
                        className="text-xs font-bold"
                        style={{ color: selectedScore.heatmapColor }}
                      >
                        ★ {selectedScore.finalOverallScore.toFixed(1)}
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-white truncate">
                      {selectedSegment.name}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
                      <span>{selectedSegment.region}</span>
                      <span className="text-emerald-400 font-medium">터치하여 상세 분석 →</span>
                    </div>
                  </div>
                </div>
              )}

              {mobileTab === 'DETAIL' && (
                <div className="flex-1 overflow-y-auto">
                  <RoadDetailSheet
                    key={selectedSegment.id}
                    segment={selectedSegment}
                    score={selectedScore}
                    mode={mode}
                    onTriggerRealtimeScan={handleTriggerRealtimeScan}
                    onSubmitUserVote={handleSubmitUserVote}
                    onClose={() => setMobileTab('MAP')}
                  />
                </div>
              )}

              {mobileTab === 'LIST' && (
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  <div className="text-[11px] text-slate-400 mb-1">
                    전체 구간 목록 ({filteredSegments.length})
                  </div>
                  {filteredSegments.map((seg) => {
                    const score = scoresMap[seg.id] || calculateRoadScore(seg, mode);
                    const isSelected = seg.id === selectedSegment.id;

                    return (
                      <div
                        key={seg.id}
                        onClick={() => {
                          handleSelectSegment(seg.id);
                          setMobileTab('DETAIL');
                        }}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800 border-emerald-400'
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold text-white">
                          <span className="truncate">{seg.name}</span>
                          <span style={{ color: score.heatmapColor }}>
                            ★ {score.finalOverallScore.toFixed(1)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {seg.subName}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mobile Bottom Navigation Bar */}
            <div className="h-12 bg-slate-950 border-t border-slate-800 flex items-center justify-around flex-shrink-0 z-20">
              <button
                onClick={() => setMobileTab('MAP')}
                className={`flex flex-col items-center justify-center text-[10px] ${
                  mobileTab === 'MAP' ? 'text-emerald-400 font-bold' : 'text-slate-400'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>지도</span>
              </button>
              <button
                onClick={() => setMobileTab('DETAIL')}
                className={`flex flex-col items-center justify-center text-[10px] ${
                  mobileTab === 'DETAIL' ? 'text-emerald-400 font-bold' : 'text-slate-400'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>AI 상세</span>
              </button>
              <button
                onClick={() => setMobileTab('LIST')}
                className={`flex flex-col items-center justify-center text-[10px] ${
                  mobileTab === 'LIST' ? 'text-emerald-400 font-bold' : 'text-slate-400'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>구간 목록</span>
              </button>
            </div>
          </div>

          {/* Desktop Helper Card next to mobile simulator */}
          <div className="hidden xl:flex flex-col ml-8 w-80 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="font-bold text-white text-base flex items-center gap-2 mb-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              모바일 내비 시뮬레이터
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              실제 스마트폰 차량/바이크 거치대 환경에서의 UI/UX, 노면 주의 알림 가시성 및 원터치 조작성을 테스트할 수 있습니다.
            </p>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 space-y-2 mb-4">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                특화 기능
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                <li>하단 미니 카드로 빠른 AI 점수 확인</li>
                <li>바이크 진입 시 붉은 경고 팝업</li>
                <li>실시간 거리뷰 재분석 원터치 갱신</li>
              </ul>
            </div>
            <button
              onClick={() => setViewLayout('SPLIT_DESKTOP')}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <Monitor className="w-4 h-4" />
              와이드 대시보드로 돌아가기
            </button>
          </div>
        </div>
      )}

      {/* 5. ROUTE COMPARISON MODAL */}
      <RouteComparisonModal
        isOpen={isRouteModalOpen}
        mode={mode}
        segments={segments}
        scoresMap={scoresMap}
        onClose={() => setIsRouteModalOpen(false)}
        onSelectSegmentFromRoute={handleSelectSegmentFromRoute}
      />
    </div>
  );
};

export default App;
