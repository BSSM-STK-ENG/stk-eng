import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Clock3,
  Loader2,
  PackageX,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Warehouse,
} from 'lucide-react';
import api from '../api/axios';
import InfoTooltip from '../components/common/InfoTooltip';
import type { DashboardSummary } from '../types/api';
import { formatAppDateTime } from '../utils/date-format';
import { formatBusinessUnit, formatTransactionTypeLabel, isInboundType } from '../utils/inventory-display';

type DayMetric = {
  key: string;
  label: string;
  inboundQty: number;
  outboundQty: number;
  count: number;
};

function formatCompactDateLabel(dayKey: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric' }).format(new Date(`${dayKey}T00:00:00`));
}

function formatQty(value: number) {
  return `${value.toLocaleString()} EA`;
}

function formatSignedQty(value: number) {
  if (value === 0) {
    return '0 EA';
  }
  return `${value > 0 ? '+' : '-'}${Math.abs(value).toLocaleString()} EA`;
}


function getMetricToneClasses(tone: 'slate' | 'blue' | 'amber') {
  switch (tone) {
    case 'blue':
      return {
        card: 'border-slate-200 bg-white',
        icon: 'bg-blue-50 text-blue-600',
        value: 'text-slate-900',
      };
    case 'amber':
      return {
        card: 'border-slate-200 bg-white',
        icon: 'bg-amber-50 text-amber-600',
        value: 'text-slate-900',
      };
    case 'slate':
    default:
      return {
        card: 'border-slate-200 bg-white',
        icon: 'bg-slate-100 text-slate-700',
        value: 'text-slate-900',
      };
  }
}

function MetricCard({
  icon,
  label,
  value,
  helpText,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helpText?: string;
  tone: 'slate' | 'blue' | 'amber';
  onClick?: () => void;
}) {
  const toneClasses = getMetricToneClasses(tone);

  const content = (
    <>
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses.icon}`}>
        {icon}
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
        {helpText ? <InfoTooltip label={helpText} /> : null}
      </div>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${toneClasses.value}`}>{value}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`chat-focus-ring rounded-2xl border p-4 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50/80 ${toneClasses.card}`}
      >
        {content}
      </button>
    );
  }

  return <article className={`rounded-2xl border p-4 shadow-sm ${toneClasses.card}`}>{content}</article>;
}

function buildLinePoints(values: number[], width: number, height: number) {
  const paddingX = 20;
  const paddingTop = 16;
  const paddingBottom = 28;
  const maxValue = Math.max(1, ...values);
  const drawableWidth = width - paddingX * 2;
  const drawableHeight = height - paddingTop - paddingBottom;
  const stepX = values.length > 1 ? drawableWidth / (values.length - 1) : drawableWidth;

  return values.map((value, index) => {
    const x = paddingX + stepX * index;
    const y = paddingTop + drawableHeight - (value / maxValue) * drawableHeight;
    return {
      x,
      y: Number.isFinite(y) ? y : paddingTop + drawableHeight,
    };
  });
}

function toPointString(points: Array<{ x: number; y: number }>) {
  return points
    .map((value, index) => {
      const point = typeof value === 'number' ? { x: index, y: value } : value;
      return `${point.x},${point.y}`;
    })
    .join(' ');
}

function toAreaString(points: Array<{ x: number; y: number }>, height: number) {
  if (points.length === 0) {
    return '';
  }

  const baseline = height - 28;
  return `${points[0]!.x},${baseline} ${toPointString(points)} ${points[points.length - 1]!.x},${baseline}`;
}

function TrendLineChart({
  days,
  inboundTotal,
  outboundTotal,
}: {
  days: DayMetric[];
  inboundTotal: number;
  outboundTotal: number;
}) {
  const chartWidth = 720;
  const chartHeight = 240;
  const values = days.flatMap((day) => [day.inboundQty, day.outboundQty]);
  const maxValue = Math.max(1, ...values);
  const inboundPoints = buildLinePoints(days.map((day) => day.inboundQty), chartWidth, chartHeight);
  const outboundPoints = buildLinePoints(days.map((day) => day.outboundQty), chartWidth, chartHeight);
  const activeDays = days.filter((day) => day.count > 0).length;
  const guideValues = [0, 0.33, 0.66, 1];
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const activeIndex = hoveredIndex;
  const activeDay = activeIndex !== null ? days[activeIndex] ?? null : null;
  const activeInboundPoint = activeIndex !== null ? inboundPoints[activeIndex] ?? null : null;
  const activeOutboundPoint = activeIndex !== null ? outboundPoints[activeIndex] ?? null : null;
  const hoverStepWidth = days.length > 1 ? inboundPoints[1]!.x - inboundPoints[0]!.x : chartWidth - 40;
  const tooltipWidth = 176;
  const tooltipX =
    activeInboundPoint !== null
      ? Math.min(Math.max(activeInboundPoint.x - tooltipWidth / 2, 24), chartWidth - tooltipWidth - 24)
      : 24;
  const tooltipY = 24;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">최근 7일 입출고 흐름</p>
          <p className="mt-1 text-xs text-slate-500">날짜별 입고와 출고 수량 변화를 바로 확인합니다.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
          <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
            7일 입고 {formatQty(inboundTotal)}
          </span>
          <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
            7일 출고 {formatQty(outboundTotal)}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-600">
            거래 발생 {activeDays}일
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-64 w-full"
              role="img"
              aria-label="최근 7일 입출고 흐름 그래프"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                <linearGradient id="dashboard-inbound-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="dashboard-outbound-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              <rect x="20" y="16" width={chartWidth - 40} height={chartHeight - 44} rx="16" fill="#f8fafc" />

              {guideValues.map((ratio) => {
                const y = 16 + (chartHeight - 44) * (1 - ratio);
                return (
                  <g key={ratio}>
                    <line x1="20" y1={y} x2={chartWidth - 20} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                    <text x="0" y={y + 4} fill="#94a3b8" fontSize="11">
                      {Math.round(maxValue * ratio).toLocaleString()}
                    </text>
                  </g>
                );
              })}

              <polygon fill="url(#dashboard-inbound-fill)" points={toAreaString(inboundPoints, chartHeight)} />
              <polygon fill="url(#dashboard-outbound-fill)" points={toAreaString(outboundPoints, chartHeight)} />

	              <polyline fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={toPointString(inboundPoints)} />
	              <polyline fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={toPointString(outboundPoints)} />

	              {activeDay && activeInboundPoint && activeOutboundPoint ? (
	                <g>
	                  <line
	                    x1={activeInboundPoint.x}
	                    y1="16"
	                    x2={activeInboundPoint.x}
	                    y2={chartHeight - 28}
	                    stroke="#cbd5e1"
	                    strokeDasharray="4 4"
	                  />
	                  <rect
	                    x={tooltipX}
	                    y={tooltipY}
	                    width={tooltipWidth}
	                    height="74"
	                    rx="16"
	                    fill="#ffffff"
	                    stroke="#cbd5e1"
	                    strokeWidth="1"
	                  />
	                  <text x={tooltipX + 16} y={tooltipY + 22} fill="#0f172a" fontSize="12" fontWeight="700">
	                    {activeDay.label}
	                  </text>
	                  <text x={tooltipX + 16} y={tooltipY + 42} fill="#2563eb" fontSize="12" fontWeight="600">
	                    입고 {activeDay.inboundQty.toLocaleString()} EA
	                  </text>
	                  <text x={tooltipX + 16} y={tooltipY + 60} fill="#d97706" fontSize="12" fontWeight="600">
	                    출고 {activeDay.outboundQty.toLocaleString()} EA
	                  </text>
	                </g>
	              ) : null}

	              {days.map((day, index) => {
	                const inboundPoint = inboundPoints[index]!;
	                const outboundPoint = outboundPoints[index]!;
	                const segmentStart =
	                  index === 0 ? 20 : Math.max(20, inboundPoint.x - hoverStepWidth / 2);
	                const segmentEnd =
	                  index === days.length - 1
	                    ? chartWidth - 20
	                    : Math.min(chartWidth - 20, inboundPoint.x + hoverStepWidth / 2);

	                return (
	                  <g key={day.key}>
	                    <rect
	                      x={segmentStart}
	                      y="16"
	                      width={segmentEnd - segmentStart}
	                      height={chartHeight - 44}
	                      fill="transparent"
	                      tabIndex={0}
	                      aria-label={`${day.label} 입고 ${day.inboundQty.toLocaleString()}개, 출고 ${day.outboundQty.toLocaleString()}개`}
	                      onMouseEnter={() => setHoveredIndex(index)}
	                      onFocus={() => setHoveredIndex(index)}
	                      onBlur={() => setHoveredIndex((current) => (current === index ? null : current))}
	                    />
	                    <circle
	                      cx={inboundPoint.x}
	                      cy={inboundPoint.y}
	                      r={activeIndex === index ? '6' : '4.5'}
	                      fill="#3b82f6"
	                      stroke="#ffffff"
	                      strokeWidth="2"
	                    />
	                    <circle
	                      cx={outboundPoint.x}
	                      cy={outboundPoint.y}
	                      r={activeIndex === index ? '6' : '4.5'}
	                      fill="#f59e0b"
	                      stroke="#ffffff"
	                      strokeWidth="2"
	                    />
	                  </g>
	                );
	              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<DashboardSummary>('/dashboard/summary');
      setSummary(response.data);
      setLastUpdatedAt(new Date().toISOString());
    } catch {
      setError('대시보드 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const recentWeekDays: DayMetric[] = (summary?.recentWeek ?? []).map((day) => ({
    key: day.date,
    label: formatCompactDateLabel(day.date),
    inboundQty: day.inboundQty,
    outboundQty: day.outboundQty,
    count: day.count,
  }));

  const weekInboundQty = recentWeekDays.reduce((sum, day) => sum + day.inboundQty, 0);
  const weekOutboundQty = recentWeekDays.reduce((sum, day) => sum + day.outboundQty, 0);
  const todayInboundQty = summary?.todayInboundQty ?? 0;
  const todayOutboundQty = summary?.todayOutboundQty ?? 0;
  const todayNetQty = todayInboundQty - todayOutboundQty;
  const recentTransactions = summary?.recentTransactions ?? [];

  const moveToCurrentStock = (scope: 'ALL' | 'LOW' | 'ZERO' | 'AVAILABLE') => {
    const params = new URLSearchParams();
    if (scope !== 'ALL') {
      params.set('scope', scope);
    }
    navigate(`/stock/current${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div className="admin-page">
      <section className="admin-header">
        <div className="admin-header-row">
          <div className="min-w-0">
            <p className="admin-kicker">대시보드</p>
            <h2 className="admin-page-title">재고 현황</h2>
          </div>

          <div className="admin-toolbar">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              마지막 갱신 {lastUpdatedAt ? formatAppDateTime(lastUpdatedAt) : '-'}
            </div>
            <button type="button" onClick={() => void loadDashboard()} className="admin-btn chat-focus-ring">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              새로고침
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard icon={<Warehouse size={18} />} label="현재 총 재고" value={formatQty(summary?.totalStockQty ?? 0)} tone="slate" helpText="등록된 모든 자재의 현재 재고 수량 합계입니다." onClick={() => moveToCurrentStock('ALL')} />
        <MetricCard icon={<Boxes size={18} />} label="관리 중인 자재" value={`${(summary?.totalMaterials ?? 0).toLocaleString()}개`} tone="slate" helpText="현재 시스템에 등록되어 관리 중인 자재 개수입니다." onClick={() => moveToCurrentStock('ALL')} />
        <MetricCard icon={<ArrowUpRight size={18} />} label="오늘 입고" value={formatQty(todayInboundQty)} tone="blue" />
        <MetricCard icon={<ArrowDownRight size={18} />} label="오늘 출고" value={formatQty(todayOutboundQty)} tone="amber" />
        <MetricCard icon={<ShieldAlert size={18} />} label="안전재고 이하" value={`${(summary?.lowCount ?? 0).toLocaleString()}개`} tone="slate" helpText="현재 재고가 설정한 안전재고 이하로 내려간 자재 수입니다." onClick={() => moveToCurrentStock('LOW')} />
        <MetricCard icon={<PackageX size={18} />} label="재고 없음" value={`${(summary?.zeroCount ?? 0).toLocaleString()}개`} tone="slate" helpText="현재 재고 수량이 0개인 자재 수입니다." onClick={() => moveToCurrentStock('ZERO')} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <TrendLineChart days={recentWeekDays} inboundTotal={weekInboundQty} outboundTotal={weekOutboundQty} />

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <p className="text-sm font-semibold text-slate-900">요약</p>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between px-5 py-4 text-sm">
              <span className="inline-flex items-center gap-2 text-slate-600"><ArrowUpRight size={16} className="text-blue-600" />오늘 입고</span>
              <span className="font-semibold text-slate-900">{formatQty(todayInboundQty)}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-4 text-sm">
              <span className="inline-flex items-center gap-2 text-slate-600"><ArrowDownRight size={16} className="text-amber-600" />오늘 출고</span>
              <span className="font-semibold text-slate-900">{formatQty(todayOutboundQty)}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-4 text-sm">
              <span className="inline-flex items-center gap-2 text-slate-600"><Activity size={16} className="text-slate-500" />오늘 순변화</span>
              <span className={`font-semibold ${todayNetQty >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>{formatSignedQty(todayNetQty)}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-4 text-sm">
              <span className="inline-flex items-center gap-2 text-slate-600"><ShieldCheck size={16} className="text-slate-500" />정상 재고</span>
              <span className="font-semibold text-slate-900">{(summary?.stableCount ?? 0).toLocaleString()}개</span>
            </div>
            <div className="flex items-center justify-between px-5 py-4 text-sm">
              <span className="inline-flex items-center gap-2 text-slate-600"><ShieldAlert size={16} className="text-slate-500" />안전재고 이하</span>
              <span className="font-semibold text-slate-900">{(summary?.lowCount ?? 0).toLocaleString()}개</span>
            </div>
            <div className="flex items-center justify-between px-5 py-4 text-sm">
              <span className="inline-flex items-center gap-2 text-slate-600"><PackageX size={16} className="text-slate-500" />재고 없음</span>
              <span className="font-semibold text-slate-900">{(summary?.zeroCount ?? 0).toLocaleString()}개</span>
            </div>
            <div className="flex items-center justify-between px-5 py-4 text-sm">
              <span className="inline-flex items-center gap-2 text-slate-600"><ArrowUpRight size={16} className="text-blue-600" />최근 7일 입고</span>
              <span className="font-semibold text-slate-900">{formatQty(weekInboundQty)}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-4 text-sm">
              <span className="inline-flex items-center gap-2 text-slate-600"><ArrowDownRight size={16} className="text-amber-600" />최근 7일 출고</span>
              <span className="font-semibold text-slate-900">{formatQty(weekOutboundQty)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="inline-flex items-center gap-2">
            <Clock3 size={16} className="text-slate-500" />
            <p className="text-sm font-semibold text-slate-900">최근 거래</p>
          </div>
          <span className="text-xs text-slate-500">{recentTransactions.length}건</span>
        </div>
        <div className="divide-y divide-slate-100">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => {
              const inbound = isInboundType(transaction.transactionType);
              const quantityLabel = formatQty(transaction.quantity);

              return (
                <div key={transaction.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{transaction.materialCode}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {transaction.businessUnit ? formatBusinessUnit(transaction.businessUnit) : ''}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        inbound ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {formatTransactionTypeLabel(transaction.transactionType)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className={`text-sm font-semibold ${inbound ? 'text-blue-700' : 'text-amber-700'}`}>
                      {inbound ? '+' : '-'}
                      {quantityLabel}
                    </p>
                    <p className="text-xs text-slate-400">{formatAppDateTime(transaction.transactionDate)}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-5 py-10 text-center text-sm text-slate-500">아직 등록된 거래가 없습니다.</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
