import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  Filter,
  LineChart,
  LoaderCircle,
  RefreshCw,
  Search,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import axios from 'axios';
import api from '../../api/axios';
import type { MaterialDto, StockTrendResponse } from '../../types/api';
import { formatLocation, isMeaningfulInventoryValue, sanitizeLocation } from '../../utils/inventory-display';
import { getFavoriteMaterialCodes, getRecentMaterialCodes, subscribeMaterialPreferences } from '../../utils/material-preferences';
import { addMaterialWorklistCodes, getMaterialWorklistCodes, subscribeMaterialWorklist } from '../../utils/material-worklist';

type PeriodPreset = '7d' | '30d' | '90d' | 'custom';

interface DateRange {
  from: string;
  to: string;
}

interface StockTrendPanelProps {
  materials: MaterialDto[];
  loadingMaterials?: boolean;
  onRefresh?: () => Promise<void>;
}

const MAX_SELECTED_MATERIALS = 4;
const CHART_WIDTH = 960;
const CHART_HEIGHT = 380;
const CHART_PADDING = {
  top: 26,
  right: 26,
  bottom: 34,
  left: 58,
};

const SERIES_COLORS = [
  { stroke: 'var(--trend-line-1)', fill: 'var(--trend-line-1-soft)' },
  { stroke: 'var(--trend-line-2)', fill: 'var(--trend-line-2-soft)' },
  { stroke: 'var(--trend-line-3)', fill: 'var(--trend-line-3-soft)' },
  { stroke: 'var(--trend-line-4)', fill: 'var(--trend-line-4-soft)' },
];

const PRESET_OPTIONS: Array<{ id: PeriodPreset; label: string; days: number | null }> = [
  { id: '7d', label: '7일', days: 7 },
  { id: '30d', label: '30일', days: 30 },
  { id: '90d', label: '90일', days: 90 },
  { id: 'custom', label: '직접 선택', days: null },
];

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPresetRange(days: number): DateRange {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  return {
    from: toIsoDate(from),
    to: toIsoDate(to),
  };
}

function areStringArraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((value, index) => value === b[index]);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDateLabel(value: string, options?: Intl.DateTimeFormatOptions) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('ko-KR', options ?? { month: 'short', day: 'numeric' }).format(date);
}

function formatDateRangeLabel(from: string, to: string) {
  return `${formatDateLabel(from, { year: 'numeric', month: 'short', day: 'numeric' })} - ${formatDateLabel(to, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })}`;
}

function pickDefaultMaterialCodes(materials: MaterialDto[]) {
  const eligibleMaterials = materials.filter(
    (material) => isMeaningfulInventoryValue(material.materialCode) && isMeaningfulInventoryValue(material.materialName),
  );
  const sourceMaterials = eligibleMaterials.length > 0 ? eligibleMaterials : materials;

  return [...sourceMaterials]
    .sort((left, right) => (right.currentStockQty ?? 0) - (left.currentStockQty ?? 0) || left.materialCode.localeCompare(right.materialCode))
    .slice(0, 3)
    .map((material) => material.materialCode);
}

function extractErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  return '트렌드 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
}

function getPointDelta(current: number, previous: number | null) {
  if (previous == null) {
    return 0;
  }

  return current - previous;
}

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    const firstPoint = points[0]!;
    return `M ${firstPoint.x} ${firstPoint.y}`;
  }

  const firstPoint = points[0]!;
  let path = `M ${firstPoint.x} ${firstPoint.y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]!;
    const previous = points[index - 1] ?? current;
    const next = points[index + 1]!;
    const afterNext = points[index + 2] ?? next;

    const controlPointOneX = current.x + (next.x - previous.x) / 6;
    const controlPointOneY = current.y + (next.y - previous.y) / 6;
    const controlPointTwoX = next.x - (afterNext.x - current.x) / 6;
    const controlPointTwoY = next.y - (afterNext.y - current.y) / 6;

    path += ` C ${controlPointOneX} ${controlPointOneY}, ${controlPointTwoX} ${controlPointTwoY}, ${next.x} ${next.y}`;
  }

  return path;
}

function buildAreaPath(points: Array<{ x: number; y: number }>, baselineY: number) {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    const firstPoint = points[0]!;
    return `M ${firstPoint.x} ${baselineY} L ${firstPoint.x} ${firstPoint.y} L ${firstPoint.x} ${baselineY} Z`;
  }

  const firstPoint = points[0]!;
  const lastPoint = points[points.length - 1]!;
  return `${buildSmoothPath(points)} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`;
}

function getTickValues(min: number, max: number, tickCount: number) {
  if (tickCount <= 1) {
    return [max];
  }

  const step = (max - min) / (tickCount - 1);
  return Array.from({ length: tickCount }, (_, index) => max - step * index);
}

function getTickIndexes(length: number, tickCount: number) {
  if (length <= tickCount) {
    return Array.from({ length }, (_, index) => index);
  }

  const indexes = new Set<number>();
  const lastIndex = Math.max(length - 1, 0);

  for (let index = 0; index < tickCount; index += 1) {
    indexes.add(Math.round((lastIndex * index) / (tickCount - 1)));
  }

  return Array.from(indexes).sort((left, right) => left - right);
}

function MetricCard({
  eyebrow,
  value,
  note,
  accentClassName,
}: {
  eyebrow: string;
  value: string;
  note: string;
  accentClassName: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/70 bg-white/84 p-4 shadow-[0_20px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm">
      <p className="text-xs font-bold text-slate-400">{eyebrow}</p>
      <p className={`mt-3 text-[28px] font-black tracking-tight ${accentClassName}`}>{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p>
    </div>
  );
}

const StockTrendPanel: React.FC<StockTrendPanelProps> = ({ materials, loadingMaterials = false, onRefresh }) => {
  const [preset, setPreset] = useState<PeriodPreset>('30d');
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetRange(30));
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState<boolean>(false);
  const [materialQuery, setMaterialQuery] = useState<string>('');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [trendData, setTrendData] = useState<StockTrendResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [favoriteCodes, setFavoriteCodes] = useState<string[]>(() => getFavoriteMaterialCodes());
  const [recentCodes, setRecentCodes] = useState<string[]>(() => getRecentMaterialCodes());
  const [worklistCodes, setWorklistCodes] = useState<string[]>(() => getMaterialWorklistCodes());
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const favoriteCodeSet = useMemo(() => new Set(favoriteCodes), [favoriteCodes]);
  const recentCodeOrder = useMemo(
    () => new Map(recentCodes.map((code, index) => [code, index])),
    [recentCodes],
  );
  const worklistCodeSet = useMemo(() => new Set(worklistCodes), [worklistCodes]);

  const availableMaterials = [...materials].sort((left, right) => {
    const leftFavoriteRank = favoriteCodeSet.has(left.materialCode) ? 0 : 1;
    const rightFavoriteRank = favoriteCodeSet.has(right.materialCode) ? 0 : 1;
    if (leftFavoriteRank !== rightFavoriteRank) {
      return leftFavoriteRank - rightFavoriteRank;
    }

    const leftRecentRank = recentCodeOrder.get(left.materialCode) ?? Number.MAX_SAFE_INTEGER;
    const rightRecentRank = recentCodeOrder.get(right.materialCode) ?? Number.MAX_SAFE_INTEGER;
    if (leftRecentRank !== rightRecentRank) {
      return leftRecentRank - rightRecentRank;
    }

    return left.materialName.localeCompare(right.materialName, 'ko-KR') || left.materialCode.localeCompare(right.materialCode);
  });
  const selectedMaterials = selectedCodes
    .map((code) => materials.find((material) => material.materialCode === code))
    .filter((material): material is MaterialDto => Boolean(material));
  const filteredMaterials = availableMaterials.filter((material) =>
    [material.materialCode, material.materialName, sanitizeLocation(material.location)]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(materialQuery.toLowerCase())),
  );

  useEffect(() => {
    return subscribeMaterialPreferences((preferences) => {
      setFavoriteCodes(preferences.favorites);
      setRecentCodes(preferences.recent);
    });
  }, []);

  useEffect(() => subscribeMaterialWorklist(setWorklistCodes), []);

  useEffect(() => {
    setSelectedCodes((previous) => {
      if (!materials.length) {
        return previous.length === 0 ? previous : [];
      }

      const availableCodeSet = new Set(materials.map((material) => material.materialCode));
      const sanitized = previous.filter((code) => availableCodeSet.has(code)).slice(0, MAX_SELECTED_MATERIALS);

      if (sanitized.length > 0) {
        return areStringArraysEqual(previous, sanitized) ? previous : sanitized;
      }

      const favoriteDefaults = favoriteCodes.filter((code) => availableCodeSet.has(code)).slice(0, MAX_SELECTED_MATERIALS);
      const defaults = favoriteDefaults.length > 0 ? favoriteDefaults : pickDefaultMaterialCodes(materials);
      return areStringArraysEqual(previous, defaults) ? previous : defaults;
    });
  }, [favoriteCodes, materials]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopoverOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!selectedCodes.length || !dateRange.from || !dateRange.to) {
      return;
    }

    if (dateRange.from > dateRange.to) {
      setError('조회 시작일은 종료일보다 빠르거나 같아야 합니다.');
      setTrendData(null);
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    setError(null);

    void api
      .get<StockTrendResponse>('/inventory/stock-trends', {
        params: {
          from: dateRange.from,
          to: dateRange.to,
          materialCodes: selectedCodes.join(','),
        },
        signal: controller.signal,
      })
      .then((response) => {
        setTrendData(response.data);
        setLastUpdatedAt(new Date().toISOString());
        setHoverIndex(null);
      })
      .catch((requestError: unknown) => {
        if (axios.isCancel(requestError)) {
          return;
        }

        setTrendData(null);
        setError(extractErrorMessage(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [dateRange.from, dateRange.to, selectedCodes]);

  const handlePresetChange = (nextPreset: PeriodPreset) => {
    setPreset(nextPreset);

    if (nextPreset === 'custom') {
      return;
    }

    const option = PRESET_OPTIONS.find((presetOption) => presetOption.id === nextPreset);
    if (option?.days) {
      setDateRange(getPresetRange(option.days));
    }
  };

  const handleDateRangeChange = (key: keyof DateRange, value: string) => {
    setPreset('custom');
    setDateRange((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleToggleMaterial = (materialCode: string) => {
    setSelectedCodes((previous) => {
      if (previous.includes(materialCode)) {
        return previous.filter((code) => code !== materialCode);
      }

      if (previous.length >= MAX_SELECTED_MATERIALS) {
        return previous;
      }

      return [...previous, materialCode];
    });
  };

  const handleRefresh = async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setRefreshing(true);
    try {
      await onRefresh?.();

      setLoading(true);
      setError(null);

      const response = await api.get<StockTrendResponse>('/inventory/stock-trends', {
        params: {
          from: dateRange.from,
          to: dateRange.to,
          materialCodes: selectedCodes.join(','),
        },
        signal: controller.signal,
      });

      setTrendData(response.data);
      setLastUpdatedAt(new Date().toISOString());
      setHoverIndex(null);
    } catch (requestError) {
      if (!axios.isCancel(requestError)) {
        setTrendData(null);
        setError(extractErrorMessage(requestError));
      }
    } finally {
      setRefreshing(false);
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const pointDates = trendData?.series[0]?.points.map((point) => point.date) ?? [];
  const totalPointCount = pointDates.length;
  const focusIndex = hoverIndex == null ? Math.max(totalPointCount - 1, 0) : hoverIndex;
  const focusDate = pointDates[focusIndex] ?? dateRange.to;

  let minStock = 0;
  let maxStock = 0;
  for (const series of trendData?.series ?? []) {
    minStock = Math.min(minStock, ...series.points.map((point) => point.stockQty));
    maxStock = Math.max(maxStock, ...series.points.map((point) => point.stockQty));
  }

  const ySpan = Math.max(maxStock - minStock, 10);
  const yPadding = Math.max(Math.round(ySpan * 0.14), 4);
  const chartMin = Math.max(0, minStock - yPadding);
  const chartMax = maxStock + yPadding;
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const baselineY = CHART_HEIGHT - CHART_PADDING.bottom;
  const xStep = totalPointCount > 1 ? plotWidth / (totalPointCount - 1) : 0;
  const yTicks = getTickValues(chartMin, chartMax, 5);
  const xTicks = getTickIndexes(totalPointCount, 5);
  const hasSeries = Boolean(trendData?.series.length);

  const chartSeries = (trendData?.series ?? []).map((series, index) => {
    const palette = SERIES_COLORS[index % SERIES_COLORS.length]!;
    const points = series.points.map((point, pointIndex) => {
      const x = CHART_PADDING.left + xStep * pointIndex;
      const normalized = chartMax === chartMin ? 0.5 : (point.stockQty - chartMin) / (chartMax - chartMin);
      const y = baselineY - normalized * plotHeight;
      return {
        x,
        y,
        ...point,
      };
    });

    return {
      ...series,
      stroke: palette.stroke,
      fill: palette.fill,
      points,
      linePath: buildSmoothPath(points),
      areaPath: buildAreaPath(points, baselineY),
    };
  });

  const focusSeries = chartSeries.map((series) => {
    const activePoint = series.points[focusIndex];
    const previousPoint = focusIndex > 0 ? series.points[focusIndex - 1] : null;

    return {
      ...series,
      activePoint,
      deltaFromPrevious: activePoint ? getPointDelta(activePoint.stockQty, previousPoint?.stockQty ?? null) : 0,
    };
  });

  const totalCurrentStock = focusSeries.reduce((sum, series) => sum + (series.activePoint?.stockQty ?? 0), 0);
  const totalPeriodChange = chartSeries.reduce((sum, series) => sum + series.changeQty, 0);
  const safetyRiskCount = focusSeries.filter(
    (series) => (series.safeStockQty ?? 0) > 0 && (series.activePoint?.stockQty ?? 0) <= (series.safeStockQty ?? 0),
  ).length;
  const aggregateInbound = focusSeries.reduce((sum, series) => sum + (series.activePoint?.inboundQty ?? 0), 0);
  const aggregateOutbound = focusSeries.reduce((sum, series) => sum + (series.activePoint?.outboundQty ?? 0), 0);
  const mostChangedSeries = chartSeries
    .slice()
    .sort((left, right) => Math.abs(right.changeQty) - Math.abs(left.changeQty))[0] ?? null;
  const selectedCodesInWorklist = selectedCodes.filter((code) => worklistCodeSet.has(code));
  const allSelectedCodesQueued = selectedCodes.length > 0 && selectedCodesInWorklist.length === selectedCodes.length;
  const worklistLabel = worklistCodes.length > 0 ? `오늘 처리 목록 ${worklistCodes.length}개` : '오늘 처리 목록 비어 있음';

  const handleAddSelectedToWorklist = () => {
    if (!selectedCodes.length) {
      return;
    }

    setWorklistCodes(addMaterialWorklistCodes(selectedCodes));
  };

  return (
    <section
      className="overflow-hidden rounded-[32px] border border-white/70 p-4 shadow-[var(--shadow-panel-strong)] backdrop-blur-xl sm:p-6"
      style={{ background: 'var(--trend-panel-bg)' }}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
              <LineChart size={14} />
              최근 재고 변화
            </div>
            <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-900 md:text-[30px]">
              어느 자재 재고가 늘고 줄었는지 바로 보는 그래프
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-[15px]">
              기간을 고르고, 비교할 자재를 선택하면, 최근 재고가 얼마나 줄었는지 또는 회복됐는지 선 그래프로 바로 확인할 수 있습니다.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="rounded-full border border-white/70 bg-white/75 px-3 py-1.5">
                1. 기간 선택
              </span>
              <span className="rounded-full border border-white/70 bg-white/75 px-3 py-1.5">
                2. 비교할 자재 고르기
              </span>
              <span className="rounded-full border border-white/70 bg-white/75 px-3 py-1.5">
                3. 그래프와 요약 확인
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
              <span className="rounded-full border border-white/70 bg-white/75 px-3 py-1.5">
                보는 기간 {formatDateRangeLabel(dateRange.from, dateRange.to)}
              </span>
              <span className="rounded-full border border-white/70 bg-white/75 px-3 py-1.5">
                비교 중인 자재 {selectedCodes.length}개
              </span>
              <span className="rounded-full border border-white/70 bg-white/75 px-3 py-1.5">
                {worklistLabel}
              </span>
              {lastUpdatedAt && (
                <span className="rounded-full border border-white/70 bg-white/75 px-3 py-1.5">
                  최근 업데이트 {new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' }).format(new Date(lastUpdatedAt))}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:min-w-[360px] xl:max-w-[420px]">
            <div className="rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-bold text-slate-400">얼마 동안 볼까요?</p>
              <p className="mt-1 text-sm text-slate-600">최근 7일, 30일, 90일 또는 직접 날짜를 고를 수 있습니다.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {PRESET_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handlePresetChange(option.id)}
                    className={`chat-focus-ring min-h-10 rounded-full px-3.5 text-sm font-semibold transition-all ${
                      preset === option.id
                        ? 'bg-slate-900 text-white shadow-[0_14px_25px_rgba(15,23,42,0.18)]'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
                  <CalendarDays size={16} className="text-slate-400" />
                  <input
                    aria-label="조회 시작일"
                    type="date"
                    value={dateRange.from}
                    onChange={(event) => handleDateRangeChange('from', event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none"
                  />
                </label>
                <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
                  <CalendarDays size={16} className="text-slate-400" />
                  <input
                    aria-label="조회 종료일"
                    type="date"
                    value={dateRange.to}
                    onChange={(event) => handleDateRangeChange('to', event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none"
                  />
                </label>
              </div>
            </div>

            <div ref={popoverRef} className="relative rounded-[24px] border border-white/70 bg-white/80 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-400">비교할 자재 고르기</p>
                  <p className="mt-1 text-sm text-slate-600">최대 4개까지 한 그래프에서 같이 볼 수 있습니다.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPopoverOpen((previous) => !previous)}
                  aria-label="자재 선택"
                  className="chat-focus-ring inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                >
                  <Filter size={16} />
                  자재 고르기
                  <ChevronDown size={16} className={`transition-transform ${popoverOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {selectedMaterials.length > 0 ? (
                  selectedMaterials.map((material, index) => {
                    const selectedColor = SERIES_COLORS[index % SERIES_COLORS.length]!;

                    return (
                      <span
                        key={material.materialCode}
                        className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                        style={{
                          backgroundColor: selectedColor.fill,
                          color: '#0f172a',
                        }}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: selectedColor.stroke }}
                        />
                        {material.materialName}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-sm text-slate-400">아직 비교할 자재를 고르지 않았습니다.</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddSelectedToWorklist}
                  disabled={!selectedCodes.length || allSelectedCodesQueued}
                  className="chat-focus-ring inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Check size={14} />
                  {allSelectedCodesQueued ? '이 자재들은 이미 오늘 처리 목록에 있습니다' : `이 자재 ${selectedCodes.length}개를 오늘 처리 목록에 담기`}
                </button>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                  담아두면 입고, 출고, 원장에서 다시 찾지 않아도 됩니다.
                </span>
              </div>

              {popoverOpen && (
                <div className="absolute right-0 top-[calc(100%+12px)] z-20 w-full rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_28px_60px_rgba(15,23,42,0.15)] xl:w-[420px]">
                  <div className="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3">
                    <Search size={16} className="text-slate-400" />
                    <input
                      value={materialQuery}
                      onChange={(event) => setMaterialQuery(event.target.value)}
                      placeholder="자재명 또는 코드 검색"
                      className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none"
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>비교 중 {selectedCodes.length}개 / 최대 {MAX_SELECTED_MATERIALS}개</span>
                    {(favoriteCodes.length > 0 || recentCodes.length > 0) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                        <Star size={12} className="text-amber-500" />
                        자주 쓰는 자재가 먼저 보입니다.
                      </span>
                    )}
                    {selectedCodes.length >= MAX_SELECTED_MATERIALS && (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                        <AlertTriangle size={13} />
                        더 이상 추가할 수 없습니다.
                      </span>
                    )}
                  </div>

                  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                    {filteredMaterials.map((material) => {
                      const checked = selectedCodes.includes(material.materialCode);

                      return (
                        <button
                          key={material.materialCode}
                          type="button"
                          onClick={() => handleToggleMaterial(material.materialCode)}
                          className={`chat-focus-ring flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                            checked
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              checked ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-transparent'
                            }`}
                          >
                            <Check size={13} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-slate-800">{material.materialName}</span>
                            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                              <span>
                                {material.materialCode} · 현재 {formatNumber(material.currentStockQty ?? 0)} EA
                                {sanitizeLocation(material.location) ? ` · ${formatLocation(material.location)}` : ''}
                              </span>
                              {favoriteCodeSet.has(material.materialCode) && (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                  즐겨찾기
                                </span>
                              )}
                            </span>
                          </span>
                        </button>
                      );
                    })}

                    {filteredMaterials.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                        조건에 맞는 자재가 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            eyebrow="지금 보고 있는 날짜"
            value={formatDateLabel(focusDate, { month: 'long', day: 'numeric' })}
            note={`선택한 기간 ${trendData?.totalDays ?? 0}일 중 이 날짜 기준으로 요약하고 있습니다.`}
            accentClassName="text-slate-900"
          />
          <MetricCard
            eyebrow="이 날짜에 남아 있는 수량"
            value={`${formatCompactNumber(totalCurrentStock)} EA`}
            note={`지금 선택한 자재들을 합치면 ${formatNumber(totalCurrentStock)} EA 가 남아 있습니다.`}
            accentClassName="text-blue-700"
          />
          <MetricCard
            eyebrow="기간 동안 얼마나 변했나"
            value={`${totalPeriodChange >= 0 ? '+' : ''}${formatCompactNumber(totalPeriodChange)} EA`}
            note={totalPeriodChange >= 0 ? '선택한 기간 동안 재고가 전반적으로 늘었습니다.' : '선택한 기간 동안 재고가 전반적으로 줄었습니다.'}
            accentClassName={totalPeriodChange >= 0 ? 'text-emerald-600' : 'text-amber-600'}
          />
          <MetricCard
            eyebrow="안전재고 이하 자재"
            value={`${safetyRiskCount} 종`}
            note={safetyRiskCount > 0 ? '안전재고보다 적은 자재가 있어 우선 확인이 필요합니다.' : '선택 자재는 모두 안전재고보다 충분합니다.'}
            accentClassName={safetyRiskCount > 0 ? 'text-amber-600' : 'text-slate-900'}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_340px]">
          <div className="rounded-[28px] border border-white/70 bg-[var(--surface-elevated)] p-4 shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:p-5">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400">선택한 날짜 상세</p>
                <h4 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                  {formatDateLabel(focusDate, { year: 'numeric', month: 'long', day: 'numeric' })}
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <TrendingUp size={14} />
                  입고 {formatNumber(aggregateInbound)} EA
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                  <TrendingDown size={14} />
                  출고 {formatNumber(aggregateOutbound)} EA
                </span>
                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  disabled={refreshing}
                  className="chat-focus-ring inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                  데이터 새로고침
                </button>
              </div>
            </div>

            <div className="mt-5 min-h-[420px]">
              {(loading || loadingMaterials) && (
                <div className="flex h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 text-slate-500">
                  <LoaderCircle size={28} className="animate-spin text-slate-500" />
                  <p className="mt-4 text-sm font-semibold">재고 변동 흐름을 계산하고 있습니다.</p>
                  <p className="mt-1 text-xs text-slate-400">일별 재고 수량과 입출고량을 함께 정리하는 중입니다.</p>
                </div>
              )}

              {!loading && !loadingMaterials && error && (
                <div className="flex h-[420px] flex-col items-center justify-center rounded-[24px] border border-rose-200 bg-rose-50/80 px-6 text-center">
                  <AlertTriangle size={28} className="text-rose-500" />
                  <p className="mt-4 text-base font-bold text-rose-800">트렌드 분석을 불러오지 못했습니다.</p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-rose-700">{error}</p>
                  <button
                    type="button"
                    onClick={() => void handleRefresh()}
                    className="chat-focus-ring mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700"
                  >
                    <RefreshCw size={15} />
                    다시 시도
                  </button>
                </div>
              )}

              {!loading && !loadingMaterials && !error && !hasSeries && (
                <div className="flex h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 px-6 text-center">
                  <LineChart size={28} className="text-slate-400" />
                  <p className="mt-4 text-base font-bold text-slate-700">표시할 재고 추세 데이터가 없습니다.</p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    자재를 선택하거나 기간을 조정하면 재고 수량 변화 꺾은선 그래프를 확인할 수 있습니다.
                  </p>
                </div>
              )}

              {!loading && !loadingMaterials && !error && hasSeries && (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    {focusSeries.map((series) => (
                      <div
                        key={series.materialCode}
                        className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-3.5"
                        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)' }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: series.stroke }}
                              />
                              <p className="truncate text-sm font-bold text-slate-800">{series.materialName}</p>
                            </div>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {series.materialCode}
                              {sanitizeLocation(series.location) ? ` · ${formatLocation(series.location)}` : ''}
                            </p>
                          </div>
                          <p className="text-right text-lg font-black text-slate-900">{formatNumber(series.activePoint?.stockQty ?? 0)}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${
                            series.deltaFromPrevious >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {series.deltaFromPrevious >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                            전일 대비 {series.deltaFromPrevious >= 0 ? '+' : ''}
                            {formatNumber(series.deltaFromPrevious)}
                          </span>
                          {(series.safeStockQty ?? 0) > 0 && (series.activePoint?.stockQty ?? 0) <= (series.safeStockQty ?? 0) ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                              <AlertTriangle size={13} />
                              안전재고 주의
                            </span>
                          ) : (
                            <span className="text-slate-500">안전재고 {(series.safeStockQty ?? 0).toLocaleString()} EA</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.86),rgba(255,255,255,0.96))] px-2 py-4 sm:px-4">
                    <svg
                      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                      role="img"
                      aria-label="자재별 재고 수량 변화 그래프"
                      className="h-[360px] w-full"
                      onMouseLeave={() => setHoverIndex(null)}
                      onMouseMove={(event) => {
                        if (totalPointCount <= 1) {
                          return;
                        }

                        const bounds = event.currentTarget.getBoundingClientRect();
                        const relativeX = ((event.clientX - bounds.left) / bounds.width) * CHART_WIDTH;
                        const rawIndex = Math.round((relativeX - CHART_PADDING.left) / xStep);
                        const nextIndex = Math.max(0, Math.min(totalPointCount - 1, rawIndex));
                        setHoverIndex(nextIndex);
                      }}
                    >
                      <defs>
                        {chartSeries.map((series) => (
                          <linearGradient
                            key={`gradient-${series.materialCode}`}
                            id={`trend-gradient-${series.materialCode}`}
                            x1="0"
                            x2="0"
                            y1="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor={series.stroke} stopOpacity="0.22" />
                            <stop offset="100%" stopColor={series.stroke} stopOpacity="0.02" />
                          </linearGradient>
                        ))}
                      </defs>

                      {yTicks.map((tick) => {
                        const normalized = chartMax === chartMin ? 0.5 : (tick - chartMin) / (chartMax - chartMin);
                        const y = baselineY - normalized * plotHeight;

                        return (
                          <g key={`y-tick-${tick}`}>
                            <line
                              x1={CHART_PADDING.left}
                              x2={CHART_WIDTH - CHART_PADDING.right}
                              y1={y}
                              y2={y}
                              stroke="var(--trend-grid)"
                              strokeDasharray="3 6"
                            />
                            <text x={16} y={y + 4} fill="var(--trend-axis)" fontSize="12" fontWeight="600">
                              {formatCompactNumber(Math.round(tick))}
                            </text>
                          </g>
                        );
                      })}

                      {xTicks.map((tickIndex) => {
                        const x = CHART_PADDING.left + xStep * tickIndex;
                        return (
                          <text
                            key={`x-tick-${tickIndex}`}
                            x={x}
                            y={CHART_HEIGHT - 8}
                            textAnchor="middle"
                            fill="var(--trend-axis)"
                            fontSize="12"
                            fontWeight="600"
                          >
                            {formatDateLabel(pointDates[tickIndex] ?? focusDate)}
                          </text>
                        );
                      })}

                      {chartSeries.map((series) => (
                        <path
                          key={`area-${series.materialCode}`}
                          d={series.areaPath}
                          fill={`url(#trend-gradient-${series.materialCode})`}
                          opacity="0.9"
                        />
                      ))}

                      {hoverIndex != null && totalPointCount > 0 && (
                        <line
                          x1={CHART_PADDING.left + xStep * hoverIndex}
                          x2={CHART_PADDING.left + xStep * hoverIndex}
                          y1={CHART_PADDING.top}
                          y2={baselineY}
                          stroke="var(--trend-focus)"
                          strokeDasharray="5 6"
                        />
                      )}

                      {chartSeries.map((series) => (
                        <path
                          key={`line-${series.materialCode}`}
                          d={series.linePath}
                          fill="none"
                          stroke={series.stroke}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}

                      {focusSeries.map((series) =>
                        series.activePoint ? (
                          <g key={`focus-point-${series.materialCode}`}>
                            <circle cx={series.activePoint.x} cy={series.activePoint.y} r="9" fill={series.stroke} opacity="0.12" />
                            <circle cx={series.activePoint.x} cy={series.activePoint.y} r="5" fill="white" stroke={series.stroke} strokeWidth="3" />
                          </g>
                        ) : null,
                      )}
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-3">
            <div className="rounded-[28px] border border-white/70 bg-white/84 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">해석 포인트</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-[20px] bg-slate-50/90 p-4">
                  <p className="text-sm font-bold text-slate-800">가장 큰 변화</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {mostChangedSeries
                      ? `${mostChangedSeries.materialName} 자재가 기간 중 가장 큰 변동을 보였습니다.`
                      : '차트 데이터가 준비되면 가장 큰 변동 자재를 보여줍니다.'}
                  </p>
                </div>
                <div className="rounded-[20px] bg-slate-50/90 p-4">
                  <p className="text-sm font-bold text-slate-800">주의 자재</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {safetyRiskCount > 0
                      ? `${safetyRiskCount}개 자재가 안전재고 이하로 떨어져 있습니다. 해당 카드에 경고 배지를 표시했습니다.`
                      : '선택 자재는 모두 안전재고 위를 유지하고 있습니다.'}
                  </p>
                </div>
                <div className="rounded-[20px] bg-slate-50/90 p-4">
                  <p className="text-sm font-bold text-slate-800">업무 활용</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    기간을 줄이면 급격한 일별 변동을, 늘리면 자재별 재고 회복 패턴과 소진 속도를 장기적으로 확인할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            {focusSeries.map((series) => (
              <div
                key={`legend-${series.materialCode}`}
                className="rounded-[24px] border border-white/70 bg-white/84 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: series.stroke }} />
                      <p className="truncate text-sm font-black text-slate-900">{series.materialName}</p>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{series.materialCode}</p>
                  </div>
                  {(series.safeStockQty ?? 0) > 0 && (series.activePoint?.stockQty ?? 0) <= (series.safeStockQty ?? 0) ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                      <AlertTriangle size={12} />
                      위험
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                      <Check size={12} />
                      안정
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-slate-50 px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">현재 재고</p>
                    <p className="mt-2 text-xl font-black text-slate-900">{formatNumber(series.activePoint?.stockQty ?? 0)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">기간 변화</p>
                    <p className={`mt-2 text-xl font-black ${series.changeQty >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {series.changeQty >= 0 ? '+' : ''}
                      {formatNumber(series.changeQty)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>시작 {formatNumber(series.startStockQty)} EA</span>
                  <span>종료 {formatNumber(series.endStockQty)} EA</span>
                </div>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </section>
  );
};

export default StockTrendPanel;
