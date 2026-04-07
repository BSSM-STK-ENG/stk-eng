import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import type { InventoryTransaction } from '../types/api';
import { downloadExcel } from '../utils/excel';
import { formatAppDate, formatAppDateTime } from '../utils/date-format';
import { formatBusinessUnit, formatTransactionTypeLabel, sanitizeBusinessUnit } from '../utils/inventory-display';
import AdminSearchField from '../components/common/AdminSearchField';

const PAGE_SIZE = 25;

const Ledger: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>(() => searchParams.get('material') ?? '');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [businessUnitFilter, setBusinessUnitFilter] = useState<string>(() => searchParams.get('unit') ?? 'ALL');
  const [dayFilter, setDayFilter] = useState<string>(() => searchParams.get('day') ?? '');
  const [page, setPage] = useState<number>(0);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const response = await api.get<InventoryTransaction[]>('/inventory/ledger');
      setTransactions(
        response.data
          .slice()
          .sort((left, right) => new Date(right.transactionDate).getTime() - new Date(left.transactionDate).getTime()),
      );
    } catch (error) {
      console.error('Failed to fetch ledger', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLedger();
  }, []);

  useEffect(() => {
    setSearchTerm(searchParams.get('material') ?? '');
    setBusinessUnitFilter(searchParams.get('unit') ?? 'ALL');
    setDayFilter(searchParams.get('day') ?? '');
  }, [searchParams]);

  const syncSearchParams = (nextSearchTerm: string, nextDay: string, nextBusinessUnit: string) => {
    const nextParams = new URLSearchParams(searchParams);

    if (nextSearchTerm.trim()) {
      nextParams.set('material', nextSearchTerm.trim());
    } else {
      nextParams.delete('material');
    }

    if (nextDay) {
      nextParams.set('day', nextDay);
    } else {
      nextParams.delete('day');
    }

    if (nextBusinessUnit !== 'ALL') {
      nextParams.set('unit', nextBusinessUnit);
    } else {
      nextParams.delete('unit');
    }

    setSearchParams(nextParams, { replace: true });
  };

  const updateSearchTerm = (nextSearchTerm: string) => {
    setSearchTerm(nextSearchTerm);
    setPage(0);
    syncSearchParams(nextSearchTerm, dayFilter, businessUnitFilter);
  };

  const updateDayFilter = (nextDay: string) => {
    setDayFilter(nextDay);
    setPage(0);
    syncSearchParams(searchTerm, nextDay, businessUnitFilter);
  };

  const updateBusinessUnitFilter = (nextBusinessUnit: string) => {
    setBusinessUnitFilter(nextBusinessUnit);
    setPage(0);
    syncSearchParams(searchTerm, dayFilter, nextBusinessUnit);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setTypeFilter('ALL');
    setBusinessUnitFilter('ALL');
    setDayFilter('');
    setPage(0);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const filteredTransactions = useMemo(
    () =>
      transactions
        .filter((transaction) => !dayFilter || transaction.transactionDate.startsWith(dayFilter))
        .filter((transaction) => businessUnitFilter === 'ALL' || sanitizeBusinessUnit(transaction.businessUnit) === businessUnitFilter)
        .filter((transaction) => typeFilter === 'ALL' || transaction.transactionType === typeFilter)
        .filter((transaction) =>
          [
            transaction.material.materialName,
            transaction.material.materialCode,
            transaction.material.description,
            transaction.manager,
            sanitizeBusinessUnit(transaction.businessUnit),
            transaction.createdBy?.email,
            transaction.note,
            transaction.reference,
          ]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(searchTerm.toLowerCase())),
        ),
    [businessUnitFilter, dayFilter, searchTerm, transactions, typeFilter],
  );

  const businessUnits = useMemo(
    () =>
      Array.from(
        new Set(
          transactions
            .map((transaction) => sanitizeBusinessUnit(transaction.businessUnit))
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((left, right) => left.localeCompare(right, 'ko')),
    [transactions],
  );

  const handleExport = () => {
    const rows = filteredTransactions.map((transaction) => ({
      일자: formatAppDateTime(transaction.transactionDate),
      유형: formatTransactionTypeLabel(transaction.transactionType),
      사업장: sanitizeBusinessUnit(transaction.businessUnit) ?? '',
      자재코드: transaction.material.materialCode,
      자재명: transaction.material.materialName,
      자재설명: transaction.material.description ?? '',
      수량: transaction.transactionType === 'OUT' ? -transaction.quantity : transaction.quantity,
      담당자: transaction.manager ?? '',
      참조번호: transaction.reference ?? '',
      비고: transaction.note ?? '',
    }));
    downloadExcel(rows, '수불_현황');
  };

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);
  const pagedTransactions = filteredTransactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const hasActiveFilters = Boolean(searchTerm.trim()) || Boolean(dayFilter) || businessUnitFilter !== 'ALL' || typeFilter !== 'ALL';
  const activeDayLabel = dayFilter
    ? formatAppDate(`${dayFilter}T00:00:00`)
    : '모든 날짜';
  const activeBusinessUnitLabel = businessUnitFilter === 'ALL' ? '모든 사업장' : formatBusinessUnit(businessUnitFilter);
  const activeTypeLabel = typeFilter === 'ALL' ? '모든 거래 유형' : formatTransactionTypeLabel(typeFilter as InventoryTransaction['transactionType']);
  const emptyTitle = searchTerm.trim()
    ? `"${searchTerm.trim()}"에 맞는 거래가 없습니다.`
    : dayFilter
      ? '선택한 날짜에 해당하는 거래가 없습니다.'
      : businessUnitFilter !== 'ALL'
        ? `${formatBusinessUnit(businessUnitFilter)}에서 찾을 거래가 없습니다.`
        : typeFilter !== 'ALL'
          ? `${formatTransactionTypeLabel(typeFilter as InventoryTransaction['transactionType'])} 거래가 없습니다.`
          : '아직 표시할 거래가 없습니다.';

  return (
    <div className="admin-page">
      <section className="admin-header">
        <div className="admin-header-row">
          <div className="min-w-0">
            <p className="admin-kicker">재고 수불부</p>
            <h2 className="admin-page-title">재고 수불 조회</h2>
            <p className="admin-page-description">입고, 출고, 반입, 교환 내역을 조회합니다.</p>
          </div>

          <div className="admin-toolbar">
            <button type="button" onClick={() => void fetchLedger()} className="admin-btn chat-focus-ring">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              새로고침
            </button>
            <button type="button" onClick={handleExport} className="admin-btn admin-btn-primary chat-focus-ring">
              <Download size={15} />
              엑셀 다운로드
            </button>
          </div>
        </div>
      </section>

      <section className="admin-table-panel">
        <div className="border-b border-slate-100 px-5 py-5 md:px-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
            <AdminSearchField
              value={searchTerm}
              onChange={updateSearchTerm}
              placeholder="자재명, 자재코드, 설명, 담당자, 사업장 검색"
            />

            <select
              value={businessUnitFilter}
              onChange={(event) => updateBusinessUnitFilter(event.target.value)}
              className="admin-select chat-focus-ring"
            >
              <option value="ALL">전체 사업장</option>
              {businessUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>

            <label className="chat-focus-ring flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
              <input
                type="date"
                value={dayFilter}
                onChange={(event) => updateDayFilter(event.target.value)}
                className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
              />
            </label>

            <div className="flex items-center justify-end">
              <button type="button" onClick={handleResetFilters} className="admin-btn chat-focus-ring">
                초기화
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
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
                className={`chat-focus-ring admin-pill ${typeFilter === option.value ? 'admin-pill-active' : ''}`}
              >
                {option.label}
              </button>
            ))}

            <span className="ml-auto inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600">
              현재 결과 {filteredTransactions.length.toLocaleString()}건
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3 md:px-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">지금 보고 있는 조건</p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              {searchTerm.trim() ? `"${searchTerm.trim()}"` : '전체 거래'}, {activeDayLabel}, {activeBusinessUnitLabel}, {activeTypeLabel}
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {pagedTransactions.map((transaction) => {
            const isInbound = transaction.transactionType === 'IN' || transaction.transactionType === 'RETURN';
            const typeTone = isInbound ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';
            return (
              <article key={transaction.id} className="space-y-3 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${typeTone}`}>
                        {formatTransactionTypeLabel(transaction.transactionType)}
                      </span>
                      <span className="text-xs font-medium text-slate-500">{formatAppDateTime(transaction.transactionDate)}</span>
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold text-slate-900">{transaction.material.materialName}</p>
                    <p className="mt-1 text-xs text-slate-500">{transaction.material.materialCode}</p>
                    {transaction.material.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">{transaction.material.description}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-base font-bold ${isInbound ? 'text-blue-700' : 'text-amber-600'}`}>
                    {isInbound ? '+' : '-'}
                    {transaction.quantity.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">사업장</p>
                    <p className="mt-1">{formatBusinessUnit(transaction.businessUnit) || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">담당자</p>
                    <p className="mt-1">{transaction.manager || '-'}</p>
                  </div>
                </div>
                {(transaction.reference || transaction.note) && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">비고</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {[transaction.reference ? `참조 ${transaction.reference}` : null, transaction.note].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                )}
              </article>
            );
          })}

          {pagedTransactions.length === 0 && !loading && (
            <div className="px-5 py-16 text-center text-sm font-medium text-slate-400">
              <div className="flex flex-col items-center gap-3">
                <p className="text-base font-semibold text-slate-700">{emptyTitle}</p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="chat-focus-ring inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    전체 조건 초기화
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="hidden md:block">
          <table className="min-w-full table-fixed divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50/85">
                <th className="w-[190px] px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 md:px-6">일시</th>
                <th className="w-[96px] px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 md:px-6">유형</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 md:px-6">자재</th>
                <th className="w-[220px] px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 md:px-6">사업장 / 담당자</th>
                <th className="w-[120px] px-4 py-3.5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 md:px-6">수량</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pagedTransactions.map((transaction) => {
                const isInbound = transaction.transactionType === 'IN' || transaction.transactionType === 'RETURN';
                return (
                  <tr key={transaction.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3.5 text-sm text-slate-600 md:px-6">
                      {formatAppDateTime(transaction.transactionDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 md:px-6">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          transaction.transactionType === 'OUT'
                            ? 'bg-amber-100 text-amber-700'
                            : transaction.transactionType === 'EXCHANGE'
                              ? 'bg-amber-100 text-amber-700'
                              : transaction.transactionType === 'RETURN'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {formatTransactionTypeLabel(transaction.transactionType)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-700 md:px-6">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{transaction.material.materialName}</p>
                        <p className="mt-1 text-xs text-slate-400">{transaction.material.materialCode}</p>
                        {transaction.material.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-400">{transaction.material.description}</p>
                        )}
                        {(transaction.reference || transaction.note) && (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                            {[transaction.reference ? `참조 ${transaction.reference}` : null, transaction.note].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500 md:px-6">
                      <p>{formatBusinessUnit(transaction.businessUnit) || '-'}</p>
                      <p className="mt-1 text-xs text-slate-400">{transaction.manager || '-'}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right md:px-6">
                      <span className={`text-sm font-bold ${isInbound ? 'text-blue-700' : 'text-amber-600'}`}>
                        {isInbound ? '+' : '-'}
                        {transaction.quantity.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {pagedTransactions.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-sm font-medium text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-base font-semibold text-slate-700">{emptyTitle}</p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="chat-focus-ring inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                        >
                          전체 조건 초기화
                        </button>
                      )}
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
    </div>
  );
};

export default Ledger;
