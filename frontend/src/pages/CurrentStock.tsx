import { useQueryClient } from '@tanstack/react-query';
import { Camera, Check, ChevronLeft, ChevronRight, Download, Grid, List, PencilLine, RefreshCw, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { queryKeys, useMaterials } from '../api/queries';
import AdminSearchField from '../components/common/AdminSearchField';
import type { ImageSearchResult, MaterialDto } from '../types/api';
import { getErrorMessage } from '../utils/api-error';
import { downloadServerExcel } from '../utils/excel';
import { formatLocation, sanitizeLocation } from '../utils/inventory-display';
import { isLowStockMaterial } from '../utils/stock-alerts';

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
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [imageSearchMode, setImageSearchMode] = useState(false);
  const [imageSearchResults, setImageSearchResults] = useState<ImageSearchResult[]>([]);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
        switch (scope) {
          case 'LOW':
            return isLowStockMaterial(material);
          case 'ZERO':
            return currentStock <= 0;
          case 'AVAILABLE':
            return currentStock > 0;
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
        acc.allCount++;
        if (current <= 0) acc.zeroCount++;
        if (isLowStockMaterial(m)) acc.lowCount++;
        if (current > 0 && !isLowStockMaterial(m)) acc.availableCount++;
        return acc;
      },
      { allCount: 0, lowCount: 0, zeroCount: 0, availableCount: 0 },
    );
  }, [searchedMaterials]);

  const handleExport = async () => {
    await downloadServerExcel('current');
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

  const handleImageSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageSearchLoading(true);
    setNotice(null);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const imageData = reader.result as string;
        const response = await api.post('/materials/search/image', { imageData });
        setImageSearchResults(response.data as ImageSearchResult[]);
        setImageSearchMode(true);
        setViewMode('grid');
      } catch (error) {
        setNotice({ tone: 'error', message: `이미지 검색에 실패했습니다. ${getErrorMessage(error)}` });
      } finally {
        setImageSearchLoading(false);
        if (imageInputRef.current) imageInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const exitImageSearch = () => {
    setImageSearchMode(false);
    setImageSearchResults([]);
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
            <button
              type="button"
              onClick={() => setViewMode((v) => (v === 'table' ? 'grid' : 'table'))}
              className="admin-btn chat-focus-ring"
              title={viewMode === 'table' ? '썸네일 보기' : '목록 보기'}
            >
              {viewMode === 'table' ? <Grid size={16} /> : <List size={16} />}
              {viewMode === 'table' ? '썸네일' : '목록'}
            </button>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={imageSearchLoading}
              className="admin-btn admin-btn-primary chat-focus-ring"
              title="이미지로 유사 재고 검색"
            >
              <Camera size={16} className={imageSearchLoading ? 'animate-pulse' : ''} />
              {imageSearchLoading ? '분석 중...' : '사진 검색'}
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSearch} />
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

      <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white md:p-6">
            <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-indigo-500/20 blur-2xl" />
            <div className="relative max-w-2xl">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-100">
                <Camera size={13} />
                이미지 재고 검색
              </p>
              <h3 className="mt-3 text-xl font-bold tracking-[-0.02em] text-white">
                자재명을 몰라도 사진으로 찾으세요.
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                보관 중인 부품 사진을 올리면 DB 썸네일과 비교해 유사한 자재를 바로 썸네일 보기로 보여줍니다.
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-3 border-t border-slate-200 bg-slate-50/70 p-5 md:min-w-[300px] md:border-l md:border-t-0 md:p-6">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={imageSearchLoading}
              className="chat-focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Camera size={18} className={imageSearchLoading ? 'animate-pulse' : ''} />
              {imageSearchLoading ? '이미지 분석 중...' : '사진 올려서 찾기'}
            </button>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
              <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">유사도순 정렬</span>
              <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">썸네일 결과</span>
              <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">현재 재고 함께 표시</span>
            </div>
            {imageSearchMode && (
              <button
                type="button"
                onClick={exitImageSearch}
                className="chat-focus-ring inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                <X size={14} />
                이미지 검색 결과 닫기
              </button>
            )}
          </div>
        </div>
      </section>

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

        {viewMode === 'grid' && (
          <>
            {imageSearchMode && (
              <div className="flex items-center justify-between border-b border-violet-100 bg-violet-50 px-5 py-3">
                <span className="text-sm font-semibold text-violet-700">
                  이미지 유사도 검색 — {imageSearchResults.length}건 (유사도순)
                </span>
                <button
                  type="button"
                  onClick={exitImageSearch}
                  className="chat-focus-ring inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-600 transition hover:border-violet-300"
                >
                  <X size={13} />
                  검색 종료
                </button>
              </div>
            )}
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {(imageSearchMode ? imageSearchResults.map((r) => r.material) : paged).map((material, idx) => {
                const result = imageSearchMode ? imageSearchResults[idx] : null;
                const currentStock = material.currentStockQty ?? 0;
                const isLow = isLowStockMaterial(material);
                return (
                  <div
                    key={material.materialCode}
                    className={`relative rounded-xl border p-3 flex flex-col items-center gap-2 transition-all hover:shadow-md ${isLow ? 'border-amber-300 bg-amber-50/60' : currentStock <= 0 ? 'border-slate-200 bg-slate-50/60 opacity-60' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    {result && (
                      <span
                        className={`absolute top-2 right-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                          result.similarity >= 80
                            ? 'bg-emerald-500 text-white'
                            : result.similarity >= 55
                              ? 'bg-amber-400 text-white'
                              : 'bg-slate-400 text-white'
                        }`}
                      >
                        {result.similarity}%
                      </span>
                    )}
                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                      {material.imageUrl ? (
                        <img
                          src={material.imageUrl}
                          alt={material.materialName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-300">
                          <svg
                            aria-label="이미지 없음"
                            role="img"
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                          </svg>
                          <span className="text-[9px] font-medium">이미지 없음</span>
                        </div>
                      )}
                    </div>
                    <div className="w-full text-center">
                      <p className="text-xs font-bold text-slate-800 truncate">{material.materialName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{material.materialCode}</p>
                      <p
                        className={`text-sm font-bold mt-1 ${currentStock <= 0 ? 'text-slate-400' : isLow ? 'text-amber-600' : 'text-slate-900'}`}
                      >
                        {currentStock.toLocaleString()}개
                      </p>
                      {isLow && <p className="text-[9px] font-bold text-amber-500 mt-0.5">안전재고이하</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {viewMode === 'table' && (
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
                  const isLow = isLowStockMaterial(material);
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
        )}

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
