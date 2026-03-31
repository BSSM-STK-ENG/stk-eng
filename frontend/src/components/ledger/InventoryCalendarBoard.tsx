import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import api from '../../api/axios';
import type {
  InventoryCalendarDay,
  InventoryCalendarResponse,
  InventoryCalendarTransaction,
  TransactionType,
} from '../../types/api';
import { formatBusinessUnit, sanitizeBusinessUnit } from '../../utils/inventory-display';

type TransactionFilter = 'ALL' | 'INBOUND' | 'OUTBOUND' | 'OTHER';

interface CalendarCell {
  date: string;
  inCurrentMonth: boolean;
  summary: InventoryCalendarDay | null;
}

interface InventoryCalendarBoardProps {
  onOpenDayInList?: (date: string) => void;
  monthSearchTerm?: string;
  businessUnitFilter?: string;
  selectedDateHint?: string | null;
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function parseMonthKey(month: string) {
  const [yearPart = '0', monthPart = '1'] = month.split('-');

  return {
    year: Number(yearPart),
    monthNumber: Number(monthPart),
  };
}

function toMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

function getCurrentMonthKey() {
  return toMonthKey(new Date());
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

function formatDate(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('ko-KR', options ?? { month: 'long', day: 'numeric' }).format(new Date(`${date}T00:00:00`));
}

function formatMonthLabel(month: string) {
  const { year, monthNumber } = parseMonthKey(month);
  return `${year}년 ${monthNumber}월`;
}

function addMonths(month: string, delta: number) {
  const { year, monthNumber } = parseMonthKey(month);
  const next = new Date(year, monthNumber - 1 + delta, 1);
  return toMonthKey(next);
}

function isSameDate(left: string, right: string) {
  return left === right;
}

function isToday(date: string) {
  const today = new Date();
  return date === `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`;
}

function matchesTransactionFilter(transaction: InventoryCalendarTransaction, filter: TransactionFilter) {
  if (filter === 'ALL') {
    return true;
  }

  if (filter === 'INBOUND') {
    return transaction.transactionType === 'IN' || transaction.transactionType === 'RETURN';
  }

  if (filter === 'OUTBOUND') {
    return transaction.transactionType === 'OUT';
  }

  return transaction.transactionType === 'EXCHANGE';
}

function extractErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  return '캘린더 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
}

function resolveTagClasses(transactionType: TransactionType) {
  switch (transactionType) {
    case 'IN':
      return 'bg-blue-100 text-blue-700';
    case 'OUT':
      return 'bg-amber-100 text-amber-700';
    case 'RETURN':
      return 'bg-blue-100 text-blue-700';
    case 'EXCHANGE':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function buildCalendarCells(month: string, days: InventoryCalendarDay[]) {
  const { year, monthNumber } = parseMonthKey(month);
  const firstDate = new Date(year, monthNumber - 1, 1);
  const firstWeekday = firstDate.getDay();
  const firstVisibleDate = new Date(year, monthNumber - 1, 1 - firstWeekday);
  const summariesByDate = new Map(days.map((day) => [day.date, day]));
  const cells: CalendarCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const current = new Date(firstVisibleDate);
    current.setDate(firstVisibleDate.getDate() + index);
    const dateKey = `${current.getFullYear()}-${`${current.getMonth() + 1}`.padStart(2, '0')}-${`${current.getDate()}`.padStart(2, '0')}`;

    cells.push({
      date: dateKey,
      inCurrentMonth: current.getMonth() === monthNumber - 1,
      summary: summariesByDate.get(dateKey) ?? null,
    });
  }

  return cells;
}

function summarizeTransactionsByDay(days: InventoryCalendarDay[], transactions: InventoryCalendarTransaction[]) {
  const summaries = new Map<string, InventoryCalendarDay>();

  for (const day of days) {
    summaries.set(day.date, {
      date: day.date,
      inboundQty: 0,
      outboundQty: 0,
      netQty: 0,
      inboundCount: 0,
      outboundCount: 0,
      transactionCount: 0,
    });
  }

  for (const transaction of transactions) {
    const dayKey = transaction.transactionDate.slice(0, 10);
    const current = summaries.get(dayKey);
    if (!current) {
      continue;
    }

    current.transactionCount += 1;

    if (transaction.transactionType === 'IN' || transaction.transactionType === 'RETURN') {
      current.inboundQty += transaction.quantity;
      current.inboundCount += 1;
    } else if (transaction.transactionType === 'OUT') {
      current.outboundQty += transaction.quantity;
      current.outboundCount += 1;
    }

    current.netQty = current.inboundQty - current.outboundQty;
  }

  return days.map((day) => summaries.get(day.date) ?? day);
}

function supportsWideDetailLayout() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }

  return window.matchMedia('(min-width: 1536px)').matches;
}

const SURFACE_CARD_CLASS = 'rounded-[28px] border border-white/80 bg-white/88 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)]';

interface SelectedDayDetailBodyProps {
  selectedDate: string | null;
  selectedDay: InventoryCalendarDay | null;
  hasSelectedDateActivity: boolean;
  selectedTransactions: InventoryCalendarTransaction[];
  transactionFilter: TransactionFilter;
  onTransactionFilterChange: (filter: TransactionFilter) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onOpenDayInList?: (date: string) => void;
  onClose?: () => void;
  showCloseButton?: boolean;
  className?: string;
}

function SelectedDayDetailBody({
  selectedDate,
  selectedDay,
  hasSelectedDateActivity,
  selectedTransactions,
  transactionFilter,
  onTransactionFilterChange,
  searchTerm,
  onSearchTermChange,
  onOpenDayInList,
  onClose,
  showCloseButton = false,
  className = SURFACE_CARD_CLASS,
}: SelectedDayDetailBodyProps) {
  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Selected Day</p>
          <h4 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
            {selectedDate ? formatDate(selectedDate, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) : '날짜를 선택하세요'}
          </h4>
          <p className="mt-2 text-sm text-slate-500">
            {hasSelectedDateActivity ? '이 날짜의 원장 흐름과 작업 메모를 바로 확인할 수 있습니다.' : '선택한 날짜에는 아직 기록된 거래가 없습니다.'}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {selectedDate && onOpenDayInList && (
            <button
              type="button"
              onClick={() => onOpenDayInList(selectedDate)}
              className="chat-focus-ring inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              리스트 원장 보기
            </button>
          )}
          {showCloseButton && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="chat-focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              aria-label="선택일 상세 닫기"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-[20px] bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">입고</p>
          <p className="mt-2 text-lg font-black text-blue-700">{formatNumber(selectedDay?.inboundQty ?? 0)}</p>
        </div>
        <div className="rounded-[20px] bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">출고</p>
          <p className="mt-2 text-lg font-black text-amber-700">{formatNumber(selectedDay?.outboundQty ?? 0)}</p>
        </div>
        <div className="rounded-[20px] bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">거래</p>
          <p className="mt-2 text-lg font-black text-slate-900">{formatNumber(selectedDay?.transactionCount ?? 0)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { id: 'ALL' as const, label: '전체' },
          { id: 'INBOUND' as const, label: '입고·반입' },
          { id: 'OUTBOUND' as const, label: '출고' },
          { id: 'OTHER' as const, label: '기타' },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onTransactionFilterChange(option.id)}
            className={`chat-focus-ring min-h-10 rounded-full px-3.5 text-xs font-semibold transition ${
              transactionFilter === option.id
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <label className="mt-4 flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3">
        <Search size={16} className="text-slate-400" />
        <input
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="자재명, 담당자, 비고 검색"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none"
        />
      </label>

      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-400">
        <span>검색 결과</span>
        <span>{formatNumber(selectedTransactions.length)}건</span>
      </div>

      <div className="mt-5 space-y-3">
        {selectedTransactions.length > 0 ? (
          selectedTransactions.map((transaction) => (
            <article
              key={transaction.id}
              className="rounded-[22px] border border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.86),rgba(255,255,255,0.98))] p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${resolveTagClasses(transaction.transactionType)}`}>
                      {transaction.transactionLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                      <Clock3 size={12} />
                      {new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' }).format(new Date(transaction.transactionDate))}
                    </span>
                  </div>
                  <p className="mt-3 truncate text-sm font-black text-slate-900">{transaction.materialName}</p>
                  <p className="mt-1 text-xs text-slate-500">{transaction.materialCode}</p>
                </div>
                <p className={`text-right text-lg font-black ${
                  transaction.transactionType === 'OUT'
                    ? 'text-amber-600'
                    : transaction.transactionType === 'EXCHANGE'
                      ? 'text-amber-600'
                      : 'text-blue-700'
                }`}>
                  {transaction.transactionType === 'OUT' ? '-' : transaction.transactionType === 'EXCHANGE' ? '±' : '+'}
                  {formatNumber(transaction.quantity)}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-medium text-slate-500">
                {transaction.manager && <span className="rounded-full bg-slate-100 px-2.5 py-1">담당 {transaction.manager}</span>}
                {sanitizeBusinessUnit(transaction.businessUnit) && <span className="rounded-full bg-slate-100 px-2.5 py-1">사업장 {formatBusinessUnit(transaction.businessUnit)}</span>}
                {transaction.createdByEmail && <span className="rounded-full bg-slate-100 px-2.5 py-1">등록 {transaction.createdByEmail}</span>}
                {transaction.reference && <span className="rounded-full bg-slate-100 px-2.5 py-1">참조 {transaction.reference}</span>}
              </div>

              {transaction.note && (
                <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600">
                  {transaction.note}
                </p>
              )}
            </article>
          ))
        ) : (
          <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-400">
            선택한 날짜에 표시할 거래 내역이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

interface CalendarInsightsCardProps {
  busiestDay: InventoryCalendarDay | null;
  totalInboundQty: number;
  totalOutboundQty: number;
  className?: string;
}

function CalendarInsightsCard({
  busiestDay,
  totalInboundQty,
  totalOutboundQty,
  className = SURFACE_CARD_CLASS,
}: CalendarInsightsCardProps) {
  const netQty = totalInboundQty - totalOutboundQty;

  return (
    <div className={className}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">월간 인사이트</p>
      <div className="mt-4 space-y-3">
        <div className="rounded-[20px] bg-slate-50 px-4 py-4">
          <p className="text-sm font-bold text-slate-800">가장 바쁜 날</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {busiestDay
              ? `${formatDate(busiestDay.date)}에 ${busiestDay.transactionCount}건의 거래가 몰렸습니다.`
              : '이 달에는 아직 기록된 거래가 없습니다.'}
          </p>
        </div>
        <div className="rounded-[20px] bg-slate-50 px-4 py-4">
          <p className="text-sm font-bold text-slate-800">순흐름</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {netQty >= 0
              ? `입고가 출고보다 ${formatNumber(netQty)} EA 많습니다.`
              : `출고가 입고보다 ${formatNumber(Math.abs(netQty))} EA 많습니다.`}
          </p>
        </div>
        <div className="rounded-[20px] bg-slate-50 px-4 py-4">
          <p className="text-sm font-bold text-slate-800">활용 팁</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            거래가 많은 날짜를 먼저 눌러 자재, 담당자, 메모를 비교하면 월말 재고 변동 이슈를 훨씬 빨리 찾을 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

const InventoryCalendarBoard: React.FC<InventoryCalendarBoardProps> = ({
  onOpenDayInList,
  monthSearchTerm = '',
  businessUnitFilter = 'ALL',
  selectedDateHint = null,
}) => {
  const [month, setMonth] = useState<string>(getCurrentMonthKey);
  const [calendarData, setCalendarData] = useState<InventoryCalendarResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('ALL');
  const [detailSearchTerm, setDetailSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isWideDetailLayout, setIsWideDetailLayout] = useState<boolean>(supportsWideDetailLayout);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState<boolean>(false);

  const fetchCalendar = async (targetMonth: string, refreshMode = false) => {
    if (refreshMode) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get<InventoryCalendarResponse>('/inventory/calendar', {
        params: { month: targetMonth },
      });

      setCalendarData(response.data);
      setError(null);
      setSelectedDate((previous) => {
        const availableDates = response.data.days.map((day) => day.date);
        const summariesByDate = new Map(response.data.days.map((day) => [day.date, day]));
        if (previous && availableDates.includes(previous)) {
          return previous;
        }

        const todayDate = new Date();
        const todayKey = `${todayDate.getFullYear()}-${`${todayDate.getMonth() + 1}`.padStart(2, '0')}-${`${todayDate.getDate()}`.padStart(2, '0')}`;
        if ((summariesByDate.get(todayKey)?.transactionCount ?? 0) > 0) {
          return todayKey;
        }

        const activeDate = response.data.days.find((day) => day.transactionCount > 0)?.date;
        return activeDate ?? response.data.monthStart;
      });
    } catch (requestError) {
      setError(extractErrorMessage(requestError));
      setCalendarData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchCalendar(month);
  }, [month]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(min-width: 1536px)');
    const syncLayout = (event: MediaQueryList | MediaQueryListEvent) => {
      setIsWideDetailLayout(event.matches);
    };

    syncLayout(mediaQuery);

    const listener = (event: MediaQueryListEvent) => {
      syncLayout(event);
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    if (isWideDetailLayout) {
      setDetailDrawerOpen(false);
    }
  }, [isWideDetailLayout]);

  useEffect(() => {
    if (selectedDateHint) {
      setSelectedDate(selectedDateHint);
    }
  }, [selectedDateHint]);

  const days = calendarData?.days ?? [];
  const normalizedMonthQuery = monthSearchTerm.trim().toLowerCase();
  const normalizedBusinessUnitFilter = businessUnitFilter === 'ALL' ? null : businessUnitFilter;
  const filteredMonthTransactions = useMemo(
    () =>
      (calendarData?.transactions ?? []).filter((transaction) => {
        if (normalizedBusinessUnitFilter && sanitizeBusinessUnit(transaction.businessUnit) !== normalizedBusinessUnitFilter) {
          return false;
        }

        if (!normalizedMonthQuery) {
          return true;
        }

        return [
          transaction.materialCode,
          transaction.materialName,
          transaction.manager,
          sanitizeBusinessUnit(transaction.businessUnit),
          transaction.note,
          transaction.reference,
          transaction.createdByEmail,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedMonthQuery));
      }),
    [calendarData?.transactions, normalizedBusinessUnitFilter, normalizedMonthQuery],
  );
  const filteredDays = useMemo(
    () => summarizeTransactionsByDay(days, filteredMonthTransactions),
    [days, filteredMonthTransactions],
  );
  const calendarCells = buildCalendarCells(month, filteredDays);
  const selectedDay = filteredDays.find((day) => day.date === selectedDate) ?? null;
  const selectedTransactions = filteredMonthTransactions
    .filter((transaction) => selectedDate != null && transaction.transactionDate.startsWith(selectedDate))
    .filter((transaction) => matchesTransactionFilter(transaction, transactionFilter))
    .filter((transaction) => {
      const query = detailSearchTerm.trim().toLowerCase();
      if (!query) {
        return true;
      }

      return [
        transaction.materialCode,
        transaction.materialName,
        transaction.manager,
        sanitizeBusinessUnit(transaction.businessUnit),
        transaction.note,
        transaction.reference,
        transaction.createdByEmail,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query));
    })
    .sort((left, right) => new Date(right.transactionDate).getTime() - new Date(left.transactionDate).getTime());

  const activeDays = filteredDays.filter((day) => day.transactionCount > 0);
  const busiestDay = [...activeDays].sort((left, right) => right.transactionCount - left.transactionCount)[0] ?? null;
  const inboundDays = activeDays.filter((day) => day.inboundQty > 0).length;
  const outboundDays = activeDays.filter((day) => day.outboundQty > 0).length;
  const currentMonthLabel = formatMonthLabel(month);
  const hasSelectedDateActivity = (selectedDay?.transactionCount ?? 0) > 0;
  const quickJumpDays = useMemo(
    () =>
      [...activeDays]
        .sort((left, right) => {
          if (right.transactionCount !== left.transactionCount) {
            return right.transactionCount - left.transactionCount;
          }

          return left.date.localeCompare(right.date);
        })
        .slice(0, 8),
    [activeDays],
  );

  const handleSelectDate = (date: string, revealDetails = true) => {
    setSelectedDate(date);
    if (!isWideDetailLayout && revealDetails) {
      setDetailDrawerOpen(true);
    }
  };

  return (
    <section
      className="overflow-hidden rounded-[30px] border border-white/70 p-4 shadow-[var(--shadow-panel-strong)] backdrop-blur-xl md:p-5"
      style={{ background: 'var(--calendar-surface)' }}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700">
              <CalendarDays size={14} />
              Operational Calendar
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <h3 className="text-[26px] font-black tracking-tight text-slate-900">{currentMonthLabel}</h3>
              <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-600">
                활성일 {activeDays.length}일
              </span>
              <span className="rounded-full border border-blue-100 bg-blue-50/90 px-3 py-1.5 text-xs font-semibold text-blue-700">
                입고 {formatCompactNumber(filteredDays.reduce((sum, day) => sum + day.inboundQty, 0))} EA
              </span>
              <span className="rounded-full border border-amber-100 bg-amber-50/90 px-3 py-1.5 text-xs font-semibold text-amber-700">
                출고 {formatCompactNumber(filteredDays.reduce((sum, day) => sum + day.outboundQty, 0))} EA
              </span>
              {normalizedBusinessUnitFilter && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  사업장 {formatBusinessUnit(normalizedBusinessUnitFilter)}
                </span>
              )}
              {normalizedMonthQuery && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  검색어 {monthSearchTerm}
                </span>
              )}
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              거래가 있는 날짜를 먼저 빠르게 고르고, 선택일 상세는 필요한 순간에만 열리도록 흐름을 가볍게 바꿨습니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMonth(addMonths(month, -1))}
              className="chat-focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              <ChevronLeft size={16} />
              이전 달
            </button>
            <button
              type="button"
              onClick={() => setMonth(getCurrentMonthKey())}
              className="chat-focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              오늘 기준
            </button>
            <button
              type="button"
              onClick={() => setMonth(addMonths(month, 1))}
              className="chat-focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              다음 달
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => void fetchCalendar(month, true)}
              disabled={refreshing}
              className="chat-focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white shadow-[0_18px_32px_rgba(15,23,42,0.16)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              새로고침
            </button>
          </div>
        </div>

        {!loading && !error && (
          <div className="rounded-[24px] border border-white/70 bg-white/74 px-3 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Quick Jump
              </span>
              {quickJumpDays.length > 0 ? (
                quickJumpDays.map((day) => {
                  const isActiveQuickJump = selectedDate != null && isSameDate(selectedDate, day.date);
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => handleSelectDate(day.date)}
                      className={`chat-focus-ring inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-xs font-semibold transition ${
                        isActiveQuickJump
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      <span>{formatDate(day.date)}</span>
                      <span className={isActiveQuickJump ? 'text-white/70' : 'text-slate-400'}>{day.transactionCount}건</span>
                    </button>
                  );
                })
              ) : (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
                  이번 달에는 아직 거래가 없습니다.
                </span>
              )}
              {!isWideDetailLayout && selectedDate && (
                <button
                  type="button"
                  onClick={() => setDetailDrawerOpen(true)}
                  className="chat-focus-ring ml-auto inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                >
                  선택일 상세 열기
                </button>
              )}
            </div>
          </div>
        )}

        {!loading && !error && !isWideDetailLayout && selectedDate && (
          <div className="rounded-[24px] border border-white/80 bg-white/84 p-4 shadow-[0_18px_36px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Selected Day</p>
                <h4 className="mt-2 text-lg font-black text-slate-900">
                  {formatDate(selectedDate, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                </h4>
                <p className="mt-1 text-sm text-slate-500">
                  {hasSelectedDateActivity ? '상세 내역은 하단 드로어에서 확인합니다.' : '기록이 없는 날짜입니다.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailDrawerOpen(true)}
                className="chat-focus-ring inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                선택일 상세 보기
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-[18px] bg-slate-50 px-3 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">입고</p>
                <p className="mt-1.5 text-lg font-black text-blue-700">{formatNumber(selectedDay?.inboundQty ?? 0)}</p>
              </div>
              <div className="rounded-[18px] bg-slate-50 px-3 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">출고</p>
                <p className="mt-1.5 text-lg font-black text-amber-700">{formatNumber(selectedDay?.outboundQty ?? 0)}</p>
              </div>
              <div className="rounded-[18px] bg-slate-50 px-3 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">거래</p>
                <p className="mt-1.5 text-lg font-black text-slate-900">{formatNumber(selectedDay?.transactionCount ?? 0)}</p>
              </div>
            </div>
          </div>
        )}

        <div className={`grid gap-5 ${isWideDetailLayout ? '2xl:grid-cols-[minmax(0,1.45fr)_380px]' : ''}`}>
          <div className="rounded-[28px] border border-white/80 bg-white/88 p-4 shadow-[0_20px_45px_rgba(15,23,42,0.06)] sm:p-5">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Month Navigator</p>
                <h4 className="mt-1.5 text-[26px] font-black tracking-tight text-slate-900">{currentMonthLabel}</h4>
                <p className="mt-1 text-sm text-slate-500">거래가 있는 날짜만 강하게 드러나도록 표시합니다.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">활성일 {activeDays.length}</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                  입고일 {inboundDays}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                  출고일 {outboundDays}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                  최다 거래일 {busiestDay ? formatDate(busiestDay.date) : '-'}
                </span>
              </div>
            </div>

            {(loading && !calendarData) && (
              <div className="mt-5 flex min-h-[560px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 text-slate-500">
                <LoaderCircle size={28} className="animate-spin text-slate-500" />
                <p className="mt-4 text-sm font-semibold">월간 캘린더를 불러오는 중입니다.</p>
              </div>
            )}

            {!loading && error && (
              <div className="mt-5 flex min-h-[560px] flex-col items-center justify-center rounded-[24px] border border-rose-200 bg-rose-50/80 px-6 text-center">
                <AlertTriangle size={28} className="text-rose-500" />
                <p className="mt-4 text-base font-bold text-rose-800">캘린더 데이터를 불러오지 못했습니다.</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-rose-700">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <>
                <div className="mt-5 grid grid-cols-7 gap-2">
                  {WEEKDAY_LABELS.map((weekday) => (
                    <div
                      key={weekday}
                      className="rounded-2xl bg-slate-50 px-2 py-3 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400"
                    >
                      {weekday}
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-7 gap-2">
                  {calendarCells.map((cell) => {
                    const isSelected = selectedDate != null && isSameDate(selectedDate, cell.date);
                    const isCurrentDay = isToday(cell.date);
                    const inbound = cell.summary?.inboundQty ?? 0;
                    const outbound = cell.summary?.outboundQty ?? 0;
                    const transactionCount = cell.summary?.transactionCount ?? 0;
                    const dayNumber = Number(cell.date.split('-')[2]);

                    return (
                      <button
                        key={cell.date}
                        type="button"
                        aria-label={`${cell.date} 거래 ${transactionCount}건`}
                        onClick={() => handleSelectDate(cell.date)}
                        aria-pressed={isSelected}
                        className={`chat-focus-ring relative min-h-[118px] rounded-[24px] border p-3 text-left transition-all ${
                          isSelected
                            ? 'border-slate-900 text-white shadow-[var(--calendar-day-shadow)]'
                            : cell.inCurrentMonth
                              ? 'border-white/80 bg-white/84 text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]'
                              : 'border-transparent bg-slate-100/70 text-slate-300'
                        }`}
                        style={isSelected ? { background: 'var(--calendar-day-selected)' } : undefined}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-lg font-black ${isSelected ? 'text-white' : cell.inCurrentMonth ? 'text-slate-900' : 'text-slate-300'}`}>
                            {dayNumber}
                          </span>
                          {isCurrentDay && (
                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                              isSelected ? 'bg-white/16 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              Today
                            </span>
                          )}
                        </div>

                        {transactionCount > 0 ? (
                          <>
                            <div className="mt-6 space-y-2">
                              {inbound > 0 && (
                                <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                  isSelected ? 'bg-white/12 text-white/90' : 'bg-[var(--calendar-day-inbound)] text-blue-700'
                                }`}>
                                  <TrendingUp size={12} />
                                  입고 {formatCompactNumber(inbound)}
                                </div>
                              )}
                              {outbound > 0 && (
                                <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                  isSelected ? 'bg-white/10 text-white/80' : 'bg-[var(--calendar-day-outbound)] text-amber-700'
                                }`}>
                                  <TrendingDown size={12} />
                                  출고 {formatCompactNumber(outbound)}
                                </div>
                              )}
                            </div>

                            <div className="mt-4">
                              <div className={`h-1.5 rounded-full ${isSelected ? 'bg-white/12' : 'bg-slate-100'}`}>
                                <div
                                  className={`h-full rounded-full ${isSelected ? 'bg-white/70' : 'bg-slate-700'}`}
                                  style={{ width: `${Math.min(100, transactionCount * 14)}%` }}
                                />
                              </div>
                              <p className={`mt-2 text-[11px] font-semibold ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                                {transactionCount}건의 거래
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="mt-10 flex h-[40px] items-end">
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              isSelected ? 'bg-white/70' : cell.inCurrentMonth ? 'bg-slate-200' : 'bg-transparent'
                            }`} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {isWideDetailLayout && (
            <aside className="space-y-3">
              <SelectedDayDetailBody
                selectedDate={selectedDate}
                selectedDay={selectedDay}
                hasSelectedDateActivity={hasSelectedDateActivity}
                selectedTransactions={selectedTransactions}
                transactionFilter={transactionFilter}
                onTransactionFilterChange={setTransactionFilter}
                searchTerm={detailSearchTerm}
                onSearchTermChange={setDetailSearchTerm}
                onOpenDayInList={onOpenDayInList}
              />
              <CalendarInsightsCard
                busiestDay={busiestDay}
                totalInboundQty={filteredDays.reduce((sum, day) => sum + day.inboundQty, 0)}
                totalOutboundQty={filteredDays.reduce((sum, day) => sum + day.outboundQty, 0)}
              />
            </aside>
          )}
        </div>
      </div>
      {!isWideDetailLayout && detailDrawerOpen && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[90] bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() => setDetailDrawerOpen(false)}
          >
            <div
              className="absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-t-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(244,248,255,0.98),rgba(255,255,255,0.98))] shadow-[0_-20px_60px_rgba(15,23,42,0.24)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="max-h-[88vh] overflow-y-auto p-4 sm:p-5">
                <SelectedDayDetailBody
                  selectedDate={selectedDate}
                  selectedDay={selectedDay}
                  hasSelectedDateActivity={hasSelectedDateActivity}
                  selectedTransactions={selectedTransactions}
                  transactionFilter={transactionFilter}
                  onTransactionFilterChange={setTransactionFilter}
                  searchTerm={detailSearchTerm}
                  onSearchTermChange={setDetailSearchTerm}
                  onOpenDayInList={onOpenDayInList}
                  onClose={() => setDetailDrawerOpen(false)}
                  showCloseButton
                />
                <CalendarInsightsCard
                  className="mt-4 rounded-[28px] border border-white/80 bg-white/88 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)]"
                  busiestDay={busiestDay}
                  totalInboundQty={filteredDays.reduce((sum, day) => sum + day.inboundQty, 0)}
                  totalOutboundQty={filteredDays.reduce((sum, day) => sum + day.outboundQty, 0)}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
};

export default InventoryCalendarBoard;
