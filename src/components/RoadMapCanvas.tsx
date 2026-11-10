import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  AlertTriangle,
  Bike,
  Car,
  Compass,
  Layers,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ComputedRoadScore, RoadSegment, SegmentCategory, VehicleMode } from '../types/road';

export interface RoadMapCanvasProps {
  segments: RoadSegment[];
  scoresMap: Record<string, ComputedRoadScore>;
  selectedSegmentId: string | null;
  mode: VehicleMode;
  onSelectSegment: (segmentId: string) => void;
}

const CAPITAL_CENTER: [number, number] = [37.5400, 127.0800];
const DEFAULT_ZOOM = 11;

function getCategoryBadge(category: SegmentCategory): { label: string; badgeClass: string } {
  switch (category) {
    case 'IC_RAMP':
      return { label: 'IC', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    case 'JC_MERGE':
      return { label: 'JC', badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    case 'SCENIC_WINDING':
      return { label: '와인딩', badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
    case 'MAIN_ROAD':
      return { label: '본선', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    case 'INTERSECTION':
      return { label: '교차로', badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
    default:
      return { label: '도로', badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/40' };
  }
}

function getShortRoadName(fullName: string): string {
  // Strip parentheses and return clean short name
  const clean = fullName.replace(/\s*\([^)]*\)/g, '').trim();
  const parts = clean.split(' ');
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }
  return clean.length > 9 ? clean.slice(0, 9) + '…' : clean;
}

export const RoadMapCanvas: React.FC<RoadMapCanvasProps> = ({
  segments,
  scoresMap,
  selectedSegmentId,
  mode,
  onSelectSegment,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylinesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);

  // Initialize Map Once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: CAPITAL_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
    });

    // CartoDB Dark Matter tiles for ultra vivid heatmap popping
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO &copy; OpenStreetMap',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Layer groups
    const polylinesGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);
    polylinesLayerGroupRef.current = polylinesGroup;
    markersLayerGroupRef.current = markersGroup;

    mapRef.current = map;

    // Trigger map redraw on resize
    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
    });
    resizeObserver.observe(containerRef.current);

    // Initial resize trigger after layout stabilizes
    const initTimer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(initTimer);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Smooth flyTo on selectedSegmentId change
  useEffect(() => {
    if (!mapRef.current || !selectedSegmentId) return;
    const target = segments.find((s) => s.id === selectedSegmentId);
    if (target) {
      mapRef.current.flyTo(target.centerCoord, 13, {
        duration: 0.8,
        easeLinearity: 0.25,
      });
    }
  }, [selectedSegmentId, segments]);

  // Redraw Polylines & Markers when segments, scoresMap, mode, or selection changes
  useEffect(() => {
    const map = mapRef.current;
    const polyGroup = polylinesLayerGroupRef.current;
    const markerGroup = markersLayerGroupRef.current;

    if (!map || !polyGroup || !markerGroup) return;

    polyGroup.clearLayers();
    markerGroup.clearLayers();

    segments.forEach((segment) => {
      const score = scoresMap[segment.id];
      const isSelected = segment.id === selectedSegmentId;
      const isRestricted = score?.isRestrictedForBike ?? (mode === 'BIKE' && segment.publicMetrics.isAutoOnly);
      const heatmapColor = score?.heatmapColor || '#10b981';
      const overallScore = score?.finalOverallScore ?? 3.0;

      // 1. Glow / Halo Polyline (Outer)
      const glowPoly = L.polyline(segment.coordinates, {
        color: isRestricted ? '#ef4444' : heatmapColor,
        weight: isSelected ? 14 : 9,
        opacity: isSelected ? 0.6 : 0.2,
        lineCap: 'round',
        lineJoin: 'round',
      });
      polyGroup.addLayer(glowPoly);

      // 2. Core Polyline
      const corePoly = L.polyline(segment.coordinates, {
        color: isRestricted ? '#f87171' : heatmapColor,
        weight: isSelected ? 8 : 5,
        opacity: isRestricted ? 0.85 : 0.95,
        dashArray: isRestricted ? '8, 8' : undefined,
        lineCap: 'round',
        lineJoin: 'round',
      });

      // 3. Transparent Click Target (Hitbox)
      const hitPoly = L.polyline(segment.coordinates, {
        color: 'transparent',
        weight: 22,
        opacity: 0,
      });

      const handlePolyClick = () => {
        onSelectSegment(segment.id);
      };

      const handlePolyMouseOver = () => {
        if (!isSelected) {
          glowPoly.setStyle({ weight: 12, opacity: 0.45 });
          corePoly.setStyle({ weight: 7 });
        }
      };

      const handlePolyMouseOut = () => {
        if (!isSelected) {
          glowPoly.setStyle({ weight: 9, opacity: 0.2 });
          corePoly.setStyle({ weight: 5 });
        }
      };

      hitPoly.on('click', handlePolyClick);
      hitPoly.on('mouseover', handlePolyMouseOver);
      hitPoly.on('mouseout', handlePolyMouseOut);

      corePoly.on('click', handlePolyClick);
      corePoly.on('mouseover', handlePolyMouseOver);
      corePoly.on('mouseout', handlePolyMouseOut);

      polyGroup.addLayer(corePoly);
      polyGroup.addLayer(hitPoly);

      if (isSelected) {
        glowPoly.bringToFront();
        corePoly.bringToFront();
      }

      // 4. Custom L.divIcon Floating Pill Marker at segment.centerCoord
      const { label: catLabel, badgeClass: catBadgeClass } = getCategoryBadge(segment.category);
      const shortName = getShortRoadName(segment.name);

      let scoreDisplayHtml = '';
      if (isRestricted) {
        scoreDisplayHtml = `
          <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-bold text-rose-300 bg-rose-950/70 border border-rose-500/50 rounded-full animate-pulse">
            🏍️통행불가
          </span>
        `;
      } else {
        const starColor = overallScore >= 4.3 ? 'text-emerald-400' : overallScore >= 3.0 ? 'text-yellow-400' : 'text-rose-400';
        scoreDisplayHtml = `
          <span class="text-xs font-black ${starColor}">
            ${overallScore.toFixed(1)}★
          </span>
        `;
      }

      const markerHtml = `
        <div class="group relative flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer transition-all duration-200 select-none shadow-2xl backdrop-blur-md ${
          isSelected
            ? 'bg-slate-900 border-2 border-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/50 scale-110 z-50'
            : isRestricted
            ? 'bg-slate-950/95 border border-rose-500/70 hover:border-rose-400 hover:scale-105'
            : 'bg-slate-900/90 border border-slate-700/80 hover:border-slate-400 hover:scale-105'
        }">
          <span class="px-1.5 py-0.5 text-[10px] font-bold rounded border ${catBadgeClass}">
            ${catLabel}
          </span>
          <span class="text-xs font-semibold text-slate-100 whitespace-nowrap max-w-[95px] truncate">
            ${shortName}
          </span>
          ${scoreDisplayHtml}
          ${
            isSelected
              ? '<span class="absolute -top-1 -right-1 flex h-2.5 w-2.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span></span>'
              : ''
          }
        </div>
      `;

      const divIcon = L.divIcon({
        className: 'easy-roadmap-custom-marker',
        html: markerHtml,
        iconSize: [160, 36],
        iconAnchor: [80, 18],
      });

      const marker = L.marker(segment.centerCoord, { icon: divIcon, zIndexOffset: isSelected ? 1000 : 100 });
      marker.on('click', () => {
        onSelectSegment(segment.id);
      });

      markerGroup.addLayer(marker);
    });
  }, [segments, scoresMap, selectedSegmentId, mode, onSelectSegment]);

  // Controls handler
  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  const handleResetView = useCallback(() => {
    mapRef.current?.flyTo(CAPITAL_CENTER, DEFAULT_ZOOM, { duration: 0.8 });
  }, []);

  const handleFitAll = useCallback(() => {
    if (!mapRef.current || segments.length === 0) return;
    const allCoords: [number, number][] = segments.flatMap((s) => s.coordinates);
    const bounds = L.latLngBounds(allCoords);
    mapRef.current.fitBounds(bounds, { padding: [50, 50], duration: 0.8 });
  }, [segments]);

  return (
    <div className="relative w-full h-full min-h-0 overflow-hidden bg-slate-950 font-sans select-none">
      {/* Leaflet Canvas Container */}
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Top Floating Badge & Status */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-xl backdrop-blur-md text-xs font-semibold">
          {mode === 'CAR' ? (
            <>
              <Car className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-200">초보안심 드라이브 모드</span>
            </>
          ) : (
            <>
              <Bike className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-200">바이크 투어링 모드</span>
            </>
          )}
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400 font-normal">| {segments.length}개 핵심구간 실시간 스캔</span>
        </div>
      </div>

      {/* Map Control Buttons (Top-Right) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={handleZoomIn}
          title="지도 확대"
          className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 shadow-lg backdrop-blur-md transition-all active:scale-95"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="지도 축소"
          className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 shadow-lg backdrop-blur-md transition-all active:scale-95"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleResetView}
          title="수도권 기본 뷰로 리셋"
          className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 shadow-lg backdrop-blur-md transition-all active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleFitAll}
          title="전체 도로 한눈에 보기"
          className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 shadow-lg backdrop-blur-md transition-all active:scale-95"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Map Legend (Floats above the bottom carousel) */}
      <div className="absolute bottom-24 left-3 sm:bottom-28 sm:left-4 z-20 pointer-events-auto max-w-[310px]">
        <div className="p-3 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs text-slate-200 transition-all">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-slate-100">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>도로 안전·풍경 평점 범례</span>
            </div>
            <button
              type="button"
              onClick={() => setLegendOpen(!legendOpen)}
              className="text-[11px] text-slate-400 hover:text-slate-200 underline"
            >
              {legendOpen ? '접기' : '보기'}
            </button>
          </div>

          {legendOpen && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                <span className="font-semibold text-emerald-300">4.3 ~ 5.0★</span>
                <span className="text-slate-300">명품 / 초보천국 (에메랄드)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                <span className="font-semibold text-green-300">3.5 ~ 4.2★</span>
                <span className="text-slate-300">무난 / 양호 (그린)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/50" />
                <span className="font-semibold text-yellow-300">2.8 ~ 3.4★</span>
                <span className="text-slate-300">보통 / 주의 (옐로우)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                <span className="font-semibold text-rose-400">1.0 ~ 2.7★</span>
                <span className="text-slate-300">고난도 / 위험 (레드)</span>
              </div>

              {mode === 'BIKE' && (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                  <span className="w-4 border-b-2 border-dashed border-rose-400" />
                  <span className="font-semibold text-rose-400">통행불가</span>
                  <span className="text-slate-300">자동차전용 (점선)</span>
                </div>
              )}

              <div className="pt-1.5 text-[10px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>국토부 TAAS/ITS + 거리뷰 AI 비전 + 집단지성</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
