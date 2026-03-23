import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutList,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import type { InventoryTransaction } from '../types/api';
import { downloadExcel } from '../utils/excel';
import { formatBusinessUnit, formatTransactionTypeLabel, sanitizeBusinessUnit } from '../utils/inventory-display';
import InventoryCalendarBoard from '../components/ledger/InventoryCalendarBoard';
import MaterialWorklistPanel from '../components/inventory/MaterialWorklistPanel';
import { getMaterialWorklistCodes, subscribeMaterialWorklist } from '../utils/material-worklist';

const PAGE_SIZE = 25;

type LedgerView = 'list' | 'calendar';

function getTodayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`;
}

function getRelativeDayKey(offsetDays: number) {
  const next = new Date();
  next.setDate(next.getDate() + offsetDays);
  return `${next.getFullYear()}-${`${next.getMonth() + 1}`.padStart(2, '0')}-${`${next.getDate()}`.padStart(2, '0')}`;
}

function formatDayLabel(day: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(`${day}T00:00:00`));
}

const Ledger: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode: LedgerView = searchParams.get('view') === 'calendar' ? 'calendar' : 'list';
  const daySearchParam = searchParams.get('day') ?? '';
  const materialSearchParam = searchParams.get('material') ?? '';
  const unitSearchParam = searchParams.get('unit') ?? 'ALL';
  const worklistScopeEnabled = searchParams.get('scope') === 'worklist';
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>(materialSearchParam);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [businessUnitFilter, setBusinessUnitFilter] = useState<string>(unitSearchParam);
  const [dayFilter, setDayFilter] = useState<string>(daySearchParam);
  const [page, setPage] = useState<number>(0);
  const [worklistCodes, setWorklistCodes] = useState<string[]>(() => getMaterialWorklistCodes());
  const worklistCodeSet = useMemo(() => new Set(worklistCodes), [worklistCodes]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const response = await api.get<InventoryTransaction[]>('/inventory/ledger');
      setTransactions(response.data.slice().sort((left, right) => new Date(right.transactionDate).getTime() - new Date(left.transactionDate).getTime()));
    } catch (error) {
      console.error('Failed to fetch ledger', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLedger();
  }, []);

  useEffect(() => subscribeMaterialWorklist(setWorklistCodes), []);

  useEffect(() => {
    setDayFilter(daySearchParam);
  }, [daySearchParam]);

  useEffect(() => {
    setSearchTerm(materialSearchParam);
    setPage(0);
  }, [materialSearchParam]);

  useEffect(() => {
    setBusinessUnitFilter(unitSearchParam);
    setPage(0);
  }, [unitSearchParam]);

  const handleExport = () => {
    const rows = filteredTransactions.map((transaction) => ({
      일자: new Date(transaction.transactionDate).toLocaleString(),
      유형: formatTransactionTypeLabel(transaction.transactionType),
      자재코드: transaction.material.materialCode,
      자재명: transaction.material.materialName,
      수량: transaction.transactionType === 'OUT' ? -transaction.quantity : transaction.quantity,
      사업장: sanitizeBusinessUnit(transaction.businessUnit) ?? '',
      담당자: transaction.manager ?? '',
      참조번호: transaction.reference ?? '',
      비고: transaction.note ?? '',
      등록자: transaction.createdBy?.email ?? '',
    }));
    downloadExcel(rows, '수불_현황');
  };

  const updateDayFilter = (nextDay: string) => {
    setDayFilter(nextDay);
    setPage(0);

    const nextParams = new URLSearchParams(searchParams);
    if (nextDay) {
      nextParams.set('day', nextDay);
    } else {
      nextParams.delete('day');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const updateSearchTerm = (nextSearchTerm: string) => {
    setSearchTerm(nextSearchTerm);
    setPage(0);

    const nextParams = new URLSearchParams(searchParams);
    const normalized = nextSearchTerm.trim();
    if (normalized) {
      nextParams.set('material', normalized);
    } else {
      nextParams.delete('material');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const updateBusinessUnitFilter = (nextBusinessUnit: string) => {
    setBusinessUnitFilter(nextBusinessUnit);
    setPage(0);

    const nextParams = new URLSearchParams(searchParams);
    if (nextBusinessUnit === 'ALL') {
      nextParams.delete('unit');
    } else {
      nextParams.set('unit', nextBusinessUnit);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setTypeFilter('ALL');
    setBusinessUnitFilter('ALL');
    setDayFilter('');
    setPage(0);
    setSearchParams(new URLSearchParams(viewMode === 'calendar' ? [['view', 'calendar']] : []), { replace: true });
  };

  const openCalendarDayInList = (date: string) => {
    setTypeFilter('ALL');
    setDayFilter(date);
    setPage(0);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('view');
    nextParams.set('day', date);
    setSearchParams(nextParams, { replace: true });
  };

  const filteredTransactions = transactions
    .filter((transaction) => !worklistScopeEnabled || worklistCodeSet.has(transaction.material.materialCode))
    .filter((transaction) => !dayFilter || transaction.transactionDate.startsWith(dayFilter))
    .filter((transaction) => businessUnitFilter === 'ALL' || sanitizeBusinessUnit(transaction.businessUnit) === businessUnitFilter)
    .filter((transaction) => typeFilter === 'ALL' || transaction.transactionType === typeFilter)
    .filter((transaction) =>
      [
        transaction.material.materialName,
        transaction.material.materialCode,
        transaction.manager,
        sanitizeBusinessUnit(transaction.businessUnit),
        transaction.createdBy?.email,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(searchTerm.toLowerCase())),
    );

  const businessUnits = Array.from(
    new Set(
      transactions
        .map((transaction) => sanitizeBusinessUnit(transaction.businessUnit))
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((left, right) => left.localeCompare(right, 'ko'));
  const ledgerMaterials = useMemo(
    () => Array.from(
      new Map(
        transactions.map((transaction) => [transaction.material.materialCode, transaction.material]),
      ).values(),
    ),
    [transactions],
  );

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);
  const pagedTransactions = filteredTransactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const inboundCount = transactions.filter((transaction) => transaction.transactionType === 'IN' || transaction.transactionType === 'RETURN').length;
  const outboundCount = transactions.filter((transaction) => transaction.transactionType === 'OUT').length;
  const totalInboundQty = transactions
    .filter((transaction) => transaction.transactionType === 'IN' || transaction.transactionType === 'RETURN')
    .reduce((sum, transaction) => sum + transaction.quantity, 0);
  const totalOutboundQty = transactions
    .filter((transaction) => transaction.transactionType === 'OUT')
    .reduce((sum, transaction) => sum + transaction.quantity, 0);
  const selectedDayTransactions = dayFilter
    ? transactions.filter((transaction) => transaction.transactionDate.startsWith(dayFilter))
    : [];
  const selectedDayInboundQty = selectedDayTransactions
    .filter((transaction) => transaction.transactionType === 'IN' || transaction.transactionType === 'RETURN')
    .reduce((sum, transaction) => sum + transaction.quantity, 0);
  const selectedDayOutboundQty = selectedDayTransactions
    .filter((transaction) => transaction.transactionType === 'OUT')
    .reduce((sum, transaction) => sum + transaction.quantity, 0);
  const activeDayLabel = dayFilter ? formatDayLabel(dayFilter) : '모든 날짜';
  const activeBusinessUnitLabel = businessUnitFilter === 'ALL' ? '모든 사업장' : formatBusinessUnit(businessUnitFilter);
  const activeTransactionTypeLabel = typeFilter === 'ALL'
    ? '모든 거래 유형'
    : formatTransactionTypeLabel(typeFilter as InventoryTransaction['transactionType']);
  const activeTransactionTypeSummary = typeFilter === 'ALL'
    ? '모든 거래 유형을'
    : `${activeTransactionTypeLabel}만`;
  const searchTermLabel = searchTerm.trim() ? `"${searchTerm.trim()}"` : '검색어 없이 전체 보기';
  const filterSummary = `${searchTerm.trim() ? `${searchTermLabel}를 찾고 있고` : '검색어 없이 전체를 보고 있고'} ${activeDayLabel} 기준으로 ${activeBusinessUnitLabel}에서 ${activeTransactionTypeSummary}${worklistScopeEnabled ? `, 오늘 처리 목록 ${worklistCodes.length}개 자재만 따로` : ''} 보고 있습니다.`;
  const hasActiveFilters = Boolean(searchTerm.trim()) || Boolean(dayFilter) || businessUnitFilter !== 'ALL' || typeFilter !== 'ALL' || worklistScopeEnabled;
  const emptyTitle = searchTerm.trim()
    ? `${searchTermLabel}에 맞는 거래가 없습니다.`
    : dayFilter
      ? `${formatDayLabel(dayFilter)}에 해당하는 거래가 없습니다.`
      : businessUnitFilter !== 'ALL'
        ? `${activeBusinessUnitLabel}에서 찾을 거래가 없습니다.`
        : typeFilter !== 'ALL'
          ? `${formatTransactionTypeLabel(typeFilter as InventoryTransaction['transactionType'])} 거래가 없습니다.`
          : '아직 표시할 거래가 없습니다.';
  const emptyDescription = hasActiveFilters
    ? '검색어를 지우거나 날짜, 사업장, 거래 유형을 바꾸면 다시 확인할 수 있습니다.'
    : '입고나 출고가 등록되면 이곳에 시간순으로 거래 내역이 표시됩니다.';

  const setViewMode = (nextView: LedgerView) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextView === 'calendar') {
      nextParams.set('view', 'calendar');
    } else {
      nextParams.delete('view');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const setWorklistScope = (enabled: boolean) => {
    const nextParams = new URLSearchParams(searchParams);
    if (enabled) {
      nextParams.set('scope', 'worklist');
    } else {
      nextParams.delete('scope');
    }
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <section className={`overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(140deg,rgba(255,255,255,0.95)_0%,rgba(244,249,255,0.98)_52%,rgba(238,244,255,0.98)_100%)] shadow-[0_24px_60px_rgba(15,23,42,0.08)] ${viewMode === 'calendar' ? 'px-4 py-4 md:px-5' : 'px-5 py-5 md:px-6'}`}>
        <div className={`flex flex-col gap-4 ${viewMode === 'calendar' ? 'xl:flex-row xl:items-center xl:justify-between' : 'xl:flex-row xl:items-end xl:justify-between'}`}>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">
              <Sparkles size={14} />
              {viewMode === 'calendar' ? '캘린더 작업 모드' : '거래 흐름 확인'}
            </div>
            {viewMode === 'calendar' ? (
              <>
                <h2 className="mt-3 text-xl font-black tracking-tight text-slate-900 md:text-[28px]">
                  거래가 몰린 날짜를 먼저 고르고, 상세는 필요할 때만 펼쳐보는 캘린더 작업 모드
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  헤더 높이를 줄이고 선택일 상세를 분리해서, 실제 작업 폭에서도 달력과 날짜 탐색이 먼저 보이도록 정리했습니다.
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-[32px]">
                  날짜와 사업장 기준으로 바로 좁혀보는 재고 수불부
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-[15px]">
                  현업에서 가장 많이 쓰는 “어느 날에 무엇이 얼마나 움직였는지” 기준으로 리스트와 캘린더를 바로 오갈 수 있게 정리했습니다.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void fetchLedger()}
              className="chat-focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              거래 새로고침
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="chat-focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white shadow-[0_18px_32px_rgba(15,23,42,0.16)] transition hover:bg-slate-800"
            >
              <Download size={16} />
              엑셀 다운로드
            </button>
          </div>
        </div>

        {viewMode === 'calendar' ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-white/84 px-3 py-1.5 text-xs font-semibold text-slate-600">
              전체 거래 {transactions.length.toLocaleString()}건
            </span>
            <span className="rounded-full border border-blue-100 bg-blue-50/90 px-3 py-1.5 text-xs font-semibold text-blue-700">
              입고·반입 {totalInboundQty.toLocaleString()} EA
            </span>
            <span className="rounded-full border border-amber-100 bg-amber-50/90 px-3 py-1.5 text-xs font-semibold text-amber-700">
              출고 {totalOutboundQty.toLocaleString()} EA
            </span>
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${(totalInboundQty - totalOutboundQty) >= 0 ? 'border border-emerald-100 bg-emerald-50/90 text-emerald-700' : 'border border-rose-100 bg-rose-50/90 text-rose-700'}`}>
              순흐름 {(totalInboundQty - totalOutboundQty) >= 0 ? '+' : ''}
              {(totalInboundQty - totalOutboundQty).toLocaleString()} EA
            </span>
            {dayFilter && (
              <span className="rounded-full border border-slate-200 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                선택일 {formatDayLabel(dayFilter)}
              </span>
            )}
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-white/80 bg-white/84 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">전체 거래</p>
              <p className="mt-4 text-[28px] font-black tracking-tight text-slate-900">{transactions.length}</p>
              <p className="mt-2 text-sm text-slate-500">현재 원장에 기록된 전체 거래 건수입니다.</p>
            </div>
            <div className="rounded-[24px] border border-white/80 bg-white/84 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">입고·반입</p>
              <p className="mt-4 text-[28px] font-black tracking-tight text-blue-700">{inboundCount}</p>
              <p className="mt-2 text-sm text-slate-500">누적 수량 {totalInboundQty.toLocaleString()} EA</p>
            </div>
            <div className="rounded-[24px] border border-white/80 bg-white/84 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">출고</p>
              <p className="mt-4 text-[28px] font-black tracking-tight text-amber-700">{outboundCount}</p>
              <p className="mt-2 text-sm text-slate-500">누적 수량 {totalOutboundQty.toLocaleString()} EA</p>
            </div>
            <div className="rounded-[24px] border border-white/80 bg-white/84 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">순흐름</p>
              <p className={`mt-4 text-[28px] font-black tracking-tight ${(totalInboundQty - totalOutboundQty) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {(totalInboundQty - totalOutboundQty) >= 0 ? '+' : ''}
                {(totalInboundQty - totalOutboundQty).toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-slate-500">입고와 출고의 누적 차이입니다.</p>
            </div>
          </div>
        )}

        {dayFilter && (
          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-[22px] border border-slate-900/5 bg-slate-900 px-4 py-3 text-white shadow-[0_20px_40px_rgba(15,23,42,0.14)]">
            <span className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-white/80">집중해서 보는 날짜</span>
            <span className="text-sm font-semibold">{formatDayLabel(dayFilter)}</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
              거래 {selectedDayTransactions.length}건
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
              입고 {selectedDayInboundQty.toLocaleString()} EA
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
              출고 {selectedDayOutboundQty.toLocaleString()} EA
            </span>
            <button
              type="button"
              onClick={() => updateDayFilter('')}
              className="chat-focus-ring ml-auto inline-flex min-h-10 items-center rounded-full bg-white px-3.5 text-xs font-bold text-slate-900 transition hover:bg-slate-100"
            >
              전체 기간으로 복귀
            </button>
          </div>
        )}

        <div className="mt-5 inline-flex rounded-full border border-slate-200 bg-white/88 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`chat-focus-ring inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
              viewMode === 'list'
                ? 'bg-slate-900 text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutList size={16} />
            리스트 뷰
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`chat-focus-ring inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
              viewMode === 'calendar'
                ? 'bg-slate-900 text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays size={16} />
            캘린더 뷰
          </button>
        </div>
      </section>

      <MaterialWorklistPanel
        materials={ledgerMaterials}
        badgeLabel="빠른 조회"
        itemLabel="조회 자재"
        title="원장에서 자주 보는 자재만 모아보는 빠른 선택 목록"
        description="현재 재고에서 미리 표시해둔 자재만 따로 묶어서, 거래 흐름을 빠르게 확인할 수 있습니다."
        accent="slate"
        selectionHint="이 목록을 기준으로 원장 거래를 바로 좁혀볼 수 있습니다."
        actions={[
          {
            label: worklistScopeEnabled ? '전체 자재 보기' : '작업 바구니 기준으로 보기',
            onClick: () => setWorklistScope(!worklistScopeEnabled),
            tone: 'primary',
            disabled: !worklistScopeEnabled && worklistCodes.length === 0,
          },
          { label: '입고 페이지로 이동', onClick: () => navigate('/inbound'), disabled: worklistCodes.length === 0 },
          { label: '출고 페이지로 이동', onClick: () => navigate('/outbound'), disabled: worklistCodes.length === 0 },
        ]}
        emptyTitle="아직 원장에서 묶어볼 자재를 고르지 않았습니다."
        emptyDescription="이 목록은 현재 재고에서 `+` 버튼으로 표시해둔 자재를 모아두는 곳입니다. 자주 확인하는 자재를 먼저 담아두면 원장에서 바로 좁혀볼 수 있습니다."
        emptySteps={[
          { title: '현재 재고에서 + 버튼 누르기', description: '원장에서 따로 보고 싶은 자재를 현재 재고 화면에서 먼저 표시해둡니다.' },
          { title: '원장에서 이 목록 기준으로 보기', description: '담아둔 자재만 필터링해서 같은 업무 묶음의 거래 흐름을 빠르게 모아봅니다.' },
          { title: '입고·출고 페이지로 바로 이동', description: '같은 목록을 입고나 출고 화면에서도 그대로 이어서 사용할 수 있습니다.' },
        ]}
        emptyActions={[
          { label: '현재 재고로 이동', onClick: () => navigate('/current-stock'), tone: 'primary' },
        ]}
      />

      {viewMode === 'calendar' && (
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/88 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.08em] text-slate-400">달력에 그대로 이어지는 조건</p>
              <h3 className="mt-2 text-lg font-black text-slate-900">리스트에서 보던 조건을 그대로 달력에 이어서 봅니다.</h3>
              <p className="mt-1 text-sm text-slate-500">자재 검색과 사업장 필터를 달력에도 그대로 적용해 월간 흐름을 좁혀볼 수 있습니다.</p>
            </div>

            <div className="grid gap-3 md:min-w-[640px] md:grid-cols-[minmax(0,1.2fr)_180px_auto]">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => updateSearchTerm(event.target.value)}
                  placeholder="자재명, 코드, 담당자, 사업장 검색..."
                  className="chat-focus-ring w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-200 focus:bg-white"
                />
              </div>

              <select
                value={businessUnitFilter}
                onChange={(event) => updateBusinessUnitFilter(event.target.value)}
                className="chat-focus-ring min-h-11 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-200 focus:bg-white"
              >
                <option value="ALL">전체 사업장</option>
                {businessUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="chat-focus-ring min-h-10 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  전체 필터 초기화
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold tracking-[0.08em] text-slate-400">지금 보고 있는 조건</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {businessUnitFilter === 'ALL' ? '전체 사업장' : formatBusinessUnit(businessUnitFilter)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {searchTerm ? `검색어 ${searchTerm}` : '전체 검색'}
            </span>
            {dayFilter && (
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                선택일 {formatDayLabel(dayFilter)}
              </span>
            )}
            {worklistScopeEnabled && (
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                작업 바구니 {worklistCodes.length}개 기준
              </span>
            )}
          </div>
        </section>
      )}

      {viewMode === 'calendar' ? (
        <InventoryCalendarBoard
          onOpenDayInList={openCalendarDayInList}
          monthSearchTerm={searchTerm}
          businessUnitFilter={businessUnitFilter}
          selectedDateHint={dayFilter || null}
        />
      ) : (
        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/88 shadow-[0_22px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="border-b border-slate-100 px-5 py-5 md:px-6">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:items-start">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-slate-600">
                  <LayoutList size={13} />
                  거래 목록 보기
                </div>
                <h3 className="mt-3 text-xl font-black tracking-tight text-slate-900 md:text-2xl">찾고 싶은 거래를 바로 좁혀보는 상세 원장</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  검색어, 사업장, 날짜, 거래 유형을 순서대로 고르면 원하는 거래만 빠르게 남길 수 있습니다.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['1. 찾고 싶은 내용 입력', '2. 사업장과 날짜 선택', '3. 거래 유형 고르기'].map((step) => (
                    <span
                      key={step}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
                    >
                      {step}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_220px]">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] lg:col-span-2">
                  <p className="text-xs font-bold text-slate-500">무엇을 찾고 있나요?</p>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => {
                        updateSearchTerm(event.target.value);
                      }}
                      placeholder="자재명, 자재코드, 담당자, 등록자 이메일, 사업장"
                      className="chat-focus-ring w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-200"
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    자재명, 자재코드, 담당자 이름, 등록자 이메일, 사업장명으로 바로 찾을 수 있습니다.
                  </p>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                  <p className="text-xs font-bold text-slate-500">어느 사업장을 볼까요?</p>
                  <select
                    value={businessUnitFilter}
                    onChange={(event) => updateBusinessUnitFilter(event.target.value)}
                    className="chat-focus-ring mt-3 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-200"
                  >
                    <option value="ALL">모든 사업장 보기</option>
                    {businessUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-500">어느 날짜를 볼까요?</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateDayFilter(getTodayKey())}
                        className="chat-focus-ring min-h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                      >
                        오늘
                      </button>
                      <button
                        type="button"
                        onClick={() => updateDayFilter(getRelativeDayKey(-1))}
                        className="chat-focus-ring min-h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                      >
                        어제
                      </button>
                    </div>
                  </div>
                  <label className="chat-focus-ring mt-3 flex min-h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 transition focus-within:border-sky-200">
                    <input
                      type="date"
                      value={dayFilter}
                      onChange={(event) => updateDayFilter(event.target.value)}
                      className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
                    />
                  </label>
                  <p className="mt-2 text-xs text-slate-500">비워두면 전체 기간을 그대로 봅니다.</p>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] lg:col-span-2">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-500">어떤 거래만 볼까요?</p>
                      <p className="mt-1 text-xs text-slate-500">
                        전체, 입고, 출고, 반입, 교환 중 필요한 거래만 남길 수 있습니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="chat-focus-ring inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      전체 조건 초기화
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      { label: '전체', value: 'ALL' },
                      { label: '입고', value: 'IN' },
                      { label: '출고', value: 'OUT' },
                      { label: '반입', value: 'RETURN' },
                      { label: '교환', value: 'EXCHANGE' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setTypeFilter(option.value);
                          setPage(0);
                        }}
                        className={`chat-focus-ring min-h-10 rounded-full px-3.5 text-xs font-semibold transition ${
                          typeFilter === option.value
                            ? 'bg-slate-900 text-white'
                            : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-bold tracking-[0.08em] text-slate-500">지금 보고 있는 조건</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                  {filterSummary}
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                현재 결과 {filteredTransactions.length.toLocaleString()}건
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                검색 {searchTermLabel}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                날짜 {activeDayLabel}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                사업장 {activeBusinessUnitLabel}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                거래 {typeFilter === 'ALL' ? activeTransactionTypeLabel : `${activeTransactionTypeLabel}만`}
              </span>
              {worklistScopeEnabled && (
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                  오늘 처리 목록 {worklistCodes.length}개 자재만 보기
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50/85">
                  <th className="px-4 md:px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">일시</th>
                  <th className="px-4 md:px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">유형</th>
                  <th className="px-4 md:px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">자재코드</th>
                  <th className="px-4 md:px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 hidden md:table-cell">자재명</th>
                  <th className="px-4 md:px-6 py-3.5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">수량</th>
                  <th className="px-4 md:px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 hidden xl:table-cell">담당자</th>
                  <th className="px-4 md:px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 hidden xl:table-cell">등록자</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pagedTransactions.map((transaction) => {
                  const isInbound = transaction.transactionType === 'IN' || transaction.transactionType === 'RETURN';
                  const rowMeta = [sanitizeBusinessUnit(transaction.businessUnit), transaction.manager].filter(Boolean).join(' · ');
                  const rowSupport = [transaction.reference ? `참조 ${transaction.reference}` : null, transaction.note].filter(Boolean).join(' · ');
                  return (
                    <tr
                      key={transaction.id}
                      className="transition-colors hover:bg-slate-50/60"
                      title={rowSupport || transaction.material.materialName}
                    >
                      <td className="px-4 md:px-6 py-3.5 whitespace-nowrap text-xs md:text-sm text-slate-500">
                        {new Date(transaction.transactionDate).toLocaleString()}
                      </td>
                      <td className="px-4 md:px-6 py-3.5 whitespace-nowrap">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          transaction.transactionType === 'OUT'
                            ? 'bg-amber-100 text-amber-700'
                            : transaction.transactionType === 'EXCHANGE'
                              ? 'bg-violet-100 text-violet-700'
                              : transaction.transactionType === 'RETURN'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                        }`}>
                          {formatTransactionTypeLabel(transaction.transactionType)}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-3.5 whitespace-nowrap text-xs md:text-sm font-bold text-slate-800">
                        {transaction.material.materialCode}
                      </td>
                      <td className="px-4 md:px-6 py-3.5 text-xs md:text-sm text-slate-600 hidden md:table-cell max-w-[300px] truncate">
                        <div className="max-w-[320px]">
                          <p className="truncate font-semibold text-slate-700">{transaction.material.materialName}</p>
                          <p className="mt-1 truncate text-[11px] text-slate-400">
                            {rowMeta || transaction.note || '추가 메모 없음'}
                          </p>
                          {rowSupport && (
                            <p className="mt-1 truncate text-[11px] text-slate-500">
                              {rowSupport}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-3.5 whitespace-nowrap text-right">
                        <span className={`text-sm font-black ${
                          isInbound ? 'text-blue-700' : 'text-amber-600'
                        }`}>
                          {isInbound ? '+' : '-'}
                          {transaction.quantity}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-3.5 whitespace-nowrap text-xs text-slate-500 hidden xl:table-cell">
                        {transaction.manager || '-'}
                      </td>
                      <td className="px-4 md:px-6 py-3.5 whitespace-nowrap text-xs text-slate-400 hidden xl:table-cell">
                        {transaction.createdBy?.email || 'System'}
                      </td>
                    </tr>
                  );
                })}
                {pagedTransactions.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-sm font-medium text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                          찾는 거래가 아직 보이지 않습니다
                        </span>
                        <p className="text-base font-semibold text-slate-700">{emptyTitle}</p>
                        <p className="max-w-md text-sm leading-6 text-slate-500">
                          {emptyDescription}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {searchTerm.trim() && (
                            <button
                              type="button"
                              onClick={() => updateSearchTerm('')}
                              className="chat-focus-ring inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                            >
                              검색어 지우기
                            </button>
                          )}
                          {dayFilter && (
                            <button
                              type="button"
                              onClick={() => updateDayFilter('')}
                              className="chat-focus-ring inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                            >
                              날짜 전체로 보기
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="chat-focus-ring inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                          >
                            전체 조건 초기화
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-3">
              <span className="text-xs font-medium text-slate-400">
                총 {filteredTransactions.length}건 중 {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filteredTransactions.length)}건
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPage((previous) => Math.max(0, previous - 1))}
                  disabled={page === 0}
                  className="chat-focus-ring rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((previous) => Math.min(totalPages - 1, previous + 1))}
                  disabled={page >= totalPages - 1}
                  className="chat-focus-ring rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default Ledger;
