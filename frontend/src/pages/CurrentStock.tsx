import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, Download, PencilLine, RefreshCw, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { queryKeys, useMaterials } from '../api/queries';
import AdminSearchField from '../components/common/AdminSearchField';
import type { MaterialDto } from '../types/api';
import { getErrorMessage } from '../utils/api-error';
import { downloadExcel } from '../utils/excel';
import { formatLocation, sanitizeLocation } from '../utils/inventory-display';

const PAGE_SIZE = 25;
type StockFocusScope = 'ALL' | 'LOW' | 'ZERO' | 'AVAILABLE';

function resolveScope(raw: string | null): StockFocusScope {
  if (raw === 'LOW' || raw === 'ZERO' || raw === 'AVAILABLE' || raw === 'ALL') {
    return raw;
  }
  return 'AVAILABLE';
}

const CurrentStock = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>(() => searchParams.get('q') ?? '');
  const [scope, setScope] = useState<StockFocusScope>(() => resolveScope(searchParams.get('scope')));
  const [page, setPage] = useState<number>(0);
  const [editingLocationCode, setEditingLocationCode] = useState<string | null>(null);
  const [locationDraft, setLocationDraft] = useState<string>('');
  const [locationSaving, setLocationSaving] = useState<boolean>(false);

  const { data: materialsData = [], isLoading: loading } = useMaterials();
  const materials = materialsData;

  const searchedMaterials = useMemo(
    () =>
      [...materials]
        .filter((material) => {
          const query = searchTerm.toLowerCase();
          return (
            material.materialName?.toLowerCase().includes(query) ||
            material.materialCode?.toLowerCase().includes(query) ||
            sanitizeLocation(material.location)?.toLowerCase().includes(query) ||
            material.description?.toLowerCase().includes(query)
          );
        })
        .sort(
          (left, right) =>
            left.materialName.localeCompare(right.materialName, 'ko-KR') ||
            left.materialCode.localeCompare(right.materialCode, 'ko-KR'),
        ),
    [materials, searchTerm],
  );

  const filtered = useMemo(
    () =>
      searchedMaterials.filter((material) => {
        const currentStock = material.currentStockQty ?? 0;
        const safeStock = material.safeStockQty ?? 0;
        switch (scope) {
          case 'LOW':
            return safeStock > 0 && currentStock > 0 && currentStock <= safeStock;
          case 'ZERO':
            return currentStock <= 0;
          case 'AVAILABLE':
            return currentStock > 0;
          case 'ALL':
          default:
            return true;
        }
      }),
    [scope, searchedMaterials],
  );

  const { allCount, lowCount, zeroCount, availableCount } = useMemo(() => {
    return searchedMaterials.reduce(
      (acc, m) => {
        const current = m.currentStockQty ?? 0;
        const safe = m.safeStockQty ?? 0;
        acc.allCount++;
        if (current <= 0) acc.zeroCount++;
        else if (safe > 0 && current <= safe) acc.lowCount++;
        else acc.availableCount++;
        return acc;
      },
      { allCount: 0, lowCount: 0, zeroCount: 0, availableCount: 0 },
    );
  }, [searchedMaterials]);

  const handleExport = async () => {
    const rows = filtered.map((material) => ({
      자재코드: material.materialCode,
      자재명: material.materialName,
      재고수량: material.currentStockQty ?? 0,
      자재위치: sanitizeLocation(material.location) ?? '',
    }));
    await downloadExcel(rows, '재고_현황');
  };

  const startLocationEdit = (material: MaterialDto) => {
    setEditingLocationCode(material.materialCode);
    setLocationDraft(material.location ?? '');
  };

  const cancelLocationEdit = () => {
    setEditingLocationCode(null);
    setLocationDraft('');
  };

  const handleLocationSave = async (material: MaterialDto) => {
    setLocationSaving(true);
    setNotice(null);
    try {
      await api.put('/materials', {
        materialCode: material.materialCode,
        materialName: material.materialName,
        description: material.description,
        location: locationDraft.trim() || null,
        safeStockQty: material.safeStockQty ?? 0,
        currentStockQty: material.currentStockQty ?? 0,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.materials });
      setNotice({ tone: 'success', message: `${material.materialName} 위치를 수정했습니다.` });
      cancelLocationEdit();
    } catch (error) {
      setNotice({ tone: 'error', message: `자재 위치 수정에 실패했습니다. ${getErrorMessage(error)}` });
    } finally {
      setLocationSaving(false);
    }
  };

  const syncSearchParams = (nextQuery: string, nextScope: StockFocusScope) => {
    const nextParams = new URLSearchParams(searchParams);
    const normalizedQuery = nextQuery.trim();

    if (normalizedQuery) {
      nextParams.set('q', normalizedQuery);
    } else {
      nextParams.delete('q');
    }

    if (nextScope === 'ALL') {
      nextParams.delete('scope');
    } else {
      nextParams.set('scope', nextScope);
    }

    setSearchParams(nextParams, { replace: true });
  };

  const handleSearchChange = (nextValue: string) => {
    setSearchTerm(nextValue);
    setPage(0);
    syncSearchParams(nextValue, scope);
  };

  const handleScopeChange = (nextScope: StockFocusScope) => {
    setScope(nextScope);
    setPage(0);
    syncSearchParams(searchTerm, nextScope);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setScope('AVAILABLE');
    setPage(0);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="admin-page">
      <section className="admin-header">
        <div className="admin-header-row">
          <div className="min-w-0">
            <p className="admin-kicker">현재 재고</p>
            <h2 className="admin-page-title">현재 재고 조회</h2>
            <p className="admin-page-description">
              지금 재고가 남아 있는 자재를 먼저 보여주고, 필요하면 품절 자재까지 함께 확인합니다.
            </p>
          </div>

          <div className="admin-toolbar">
            <button
              type="button"
              onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.materials })}
              className="admin-btn chat-focus-ring"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              새로고침
            </button>
            <button type="button" onClick={handleExport} className="admin-btn admin-btn-primary chat-focus-ring">
              <Download size={16} />
              엑셀 다운로드
            </button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <AdminSearchField
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="자재명, 자재코드, 위치, 설명 검색"
            wrapperClassName="max-w-2xl"
          />
          <span className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-600">
            조회 결과 {filtered.length.toLocaleString()}건
          </span>
        </div>
      </section>

      {notice && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            notice.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {notice.message}
        </div>
      )}

      <section className="admin-table-panel">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3 md:px-6">
          {[
            { label: '재고 있는 자재', value: 'AVAILABLE' as const, count: availableCount },
            { label: '안전재고 이하', value: 'LOW' as const, count: lowCount },
            { label: '재고 없음', value: 'ZERO' as const, count: zeroCount },
            { label: '전체 자재', value: 'ALL' as const, count: allCount },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleScopeChange(option.value)}
              className={`chat-focus-ring inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-xs font-semibold transition ${
                scope === option.value
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {option.label}
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  scope === option.value ? 'bg-white/12 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {option.count}
              </span>
            </button>
          ))}

          {(searchTerm || scope !== 'ALL') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="chat-focus-ring ml-auto inline-flex min-h-10 items-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              필터 초기화
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50/85">
                <th className="w-[26%] whitespace-nowrap px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 md:px-6">
                  자재코드
                </th>
                <th className="w-[38%] whitespace-nowrap px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 md:px-6">
                  자재명
                </th>
                <th className="w-[12%] whitespace-nowrap px-4 py-3.5 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 md:px-6">
                  재고수량
                </th>
                <th className="w-[24%] whitespace-nowrap px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 md:px-6">
                  자재위치
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paged.map((material) => {
                const currentStock = material.currentStockQty ?? 0;
                const safeStock = material.safeStockQty ?? 0;
                const isLow = safeStock > 0 && currentStock <= safeStock;
                const statusLabel = currentStock <= 0 ? '재고 없음' : isLow ? '안전재고 이하' : '';

                return (
                  <tr key={material.materialCode} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900 md:px-6">
                      <div className="truncate">{material.materialCode}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700 md:px-6">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{material.materialName}</p>
                        {material.description && (
                          <p className="mt-1 truncate text-xs text-slate-400">{material.description}</p>
                        )}
                        {safeStock > 0 && (
                          <p className="mt-1 text-xs text-slate-400">안전재고 {safeStock.toLocaleString()}개</p>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right md:px-6">
                      <p
                        className={`text-base font-bold ${
                          currentStock <= 0 ? 'text-slate-400' : isLow ? 'text-amber-600' : 'text-slate-900'
                        }`}
                      >
                        {currentStock.toLocaleString()}
                      </p>
                      {statusLabel && <p className="mt-1 text-[11px] font-medium text-slate-400">{statusLabel}</p>}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 md:px-6">
                      {editingLocationCode === material.materialCode ? (
                        <div className="flex flex-col gap-2 sm:max-w-[280px]">
                          <input
                            type="text"
                            value={locationDraft}
                            onChange={(event) => setLocationDraft(event.target.value)}
                            className="admin-control min-h-10 text-sm"
                            placeholder="위치를 입력하세요"
                            maxLength={120}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void handleLocationSave(material)}
                              disabled={locationSaving}
                              className="chat-focus-ring inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-900 bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Check size={13} />
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={cancelLocationEdit}
                              disabled={locationSaving}
                              className="chat-focus-ring inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <X size={13} />
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                          <span className="truncate">{formatLocation(material.location)}</span>
                          <button
                            type="button"
                            onClick={() => startLocationEdit(material)}
                            className="chat-focus-ring inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                          >
                            <PencilLine size={13} />
                            위치 수정
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {paged.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center text-sm font-medium text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-base font-semibold text-slate-700">
                        {searchTerm.trim()
                          ? `"${searchTerm.trim()}"에 맞는 자재가 없습니다.`
                          : '현재 조건에 맞는 자재가 없습니다.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {searchTerm.trim() && (
                          <button
                            type="button"
                            onClick={() => handleSearchChange('')}
                            className="chat-focus-ring inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                          >
                            검색어 지우기
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
              총 {filtered.length}건 중 {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)}건
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

export default CurrentStock;
