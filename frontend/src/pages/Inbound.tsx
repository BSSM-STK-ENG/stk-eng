import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  PencilLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { queryKeys, useBusinessUnits, useMaterials, usePagedLedger } from '../api/queries';
import AdminSearchField from '../components/common/AdminSearchField';
import MaterialLookupField from '../components/inventory/MaterialLookupField';
import { buildMaterialLookupLabel } from '../components/inventory/material-lookup-utils';
import type { TransactionResponse } from '../types/api';
import { getErrorMessage } from '../utils/api-error';
import { formatAppDateTime } from '../utils/date-format';
import { downloadCsv, downloadExcel } from '../utils/excel';
import { formatBusinessUnit, sanitizeBusinessUnit } from '../utils/inventory-display';
import { registerRecentMaterialCode } from '../utils/material-preferences';

const PAGE_SIZE = 20;

type Notice = {
  tone: 'success' | 'error';
  message: string;
};

const Inbound = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const consumedPrefillKeyRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState<string>(() => searchParams.get('q') ?? '');
  const [dayFilter, setDayFilter] = useState<string>(() => searchParams.get('day') ?? '');
  const [businessUnitFilter, setBusinessUnitFilter] = useState<string>(() => searchParams.get('unit') ?? 'ALL');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<TransactionResponse | null>(null);

  const { data: materialsData = [], isLoading: materialsLoading } = useMaterials();
  const { data: businessUnitsData = [] } = useBusinessUnits();
  const { data: ledgerData, isLoading: ledgerLoading } = usePagedLedger({
    type: 'IN',
    page,
    size: PAGE_SIZE,
    q: searchTerm.trim() || undefined,
    from: dayFilter || undefined,
    unit: businessUnitFilter !== 'ALL' ? businessUnitFilter : undefined,
  });

  const materials = materialsData;
  const businessUnits = businessUnitsData;
  const pagedTransactions = ledgerData?.content ?? [];
  const totalPages = ledgerData?.totalPages ?? 0;
  const totalElements = ledgerData?.totalElements ?? 0;
  const loading = materialsLoading || ledgerLoading;

  const [materialCode, setMaterialCode] = useState<string>('');
  const [materialQuery, setMaterialQuery] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [businessUnit, setBusinessUnit] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [locationDraft, setLocationDraft] = useState<string>('');

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [uploadDragActive, setUploadDragActive] = useState<boolean>(false);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['ledger'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.materials });
    queryClient.invalidateQueries({ queryKey: queryKeys.businessUnits });
  };

  useEffect(() => {
    setSearchTerm(searchParams.get('q') ?? '');
    setDayFilter(searchParams.get('day') ?? '');
    setBusinessUnitFilter(searchParams.get('unit') ?? 'ALL');
  }, [searchParams]);

  useEffect(() => {
    const requestedAction = searchParams.get('action');
    const requestedMaterialCode = searchParams.get('material');
    const prefillKey = `${requestedAction ?? 'none'}:${requestedMaterialCode ?? ''}`;
    if (consumedPrefillKeyRef.current === prefillKey) {
      return;
    }

    if (requestedAction !== 'new' || !requestedMaterialCode || materials.length === 0) {
      return;
    }

    const matchedMaterial = materials.find((material) => material.materialCode === requestedMaterialCode);
    consumedPrefillKeyRef.current = prefillKey;

    if (!matchedMaterial) {
      setNotice({ tone: 'error', message: '바로 입고할 자재를 찾지 못했습니다. 목록에서 다시 선택해주세요.' });
      return;
    }

    setMaterialCode(matchedMaterial.materialCode);
    setMaterialQuery(buildMaterialLookupLabel(matchedMaterial));
    setLocationDraft(matchedMaterial.location ?? '');
    setBusinessUnit('');
    setQuantity('');
    setNote('');
    setEditingTransaction(null);
    setShowModal(true);
  }, [materials, searchParams]);

  const businessUnitOptions = useMemo(
    () =>
      Array.from(
        new Set(businessUnits.map((item) => item.name).filter((value): value is string => Boolean(value))),
      ).sort((left, right) => left.localeCompare(right, 'ko-KR')),
    [businessUnits],
  );

  const resolvedMaterial = useMemo(
    () =>
      materials.find((material) => material.materialCode === materialCode) ??
      materials.find((material) => material.materialCode.toLowerCase() === materialQuery.trim().toLowerCase()) ??
      null,
    [materialCode, materialQuery, materials],
  );
  const parsedQuantity = Number.parseInt(quantity, 10);
  const safeQuantity = Number.isFinite(parsedQuantity) ? parsedQuantity : 0;
  const editableBaseStock =
    (resolvedMaterial?.currentStockQty ?? 0) -
    (editingTransaction && editingTransaction.materialCode === resolvedMaterial?.materialCode
      ? editingTransaction.quantity
      : 0);
  const projectedQuantity = editableBaseStock + safeQuantity;

  useEffect(() => {
    setLocationDraft(resolvedMaterial?.location ?? '');
  }, [resolvedMaterial?.materialCode, resolvedMaterial?.location]);

  const resetForm = () => {
    setMaterialCode('');
    setMaterialQuery('');
    setQuantity('');
    setBusinessUnit('');
    setNote('');
    setLocationDraft('');
    setEditingTransaction(null);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const openNew = () => {
    resetForm();
    setNotice(null);
    setShowModal(true);
  };

  const openRepeatInbound = (transaction: TransactionResponse) => {
    const matchedMaterial = materials.find((m) => m.materialCode === transaction.materialCode);
    setMaterialCode(transaction.materialCode);
    setMaterialQuery(matchedMaterial ? buildMaterialLookupLabel(matchedMaterial) : transaction.materialCode);
    setLocationDraft(matchedMaterial?.location ?? '');
    setBusinessUnit(sanitizeBusinessUnit(transaction.businessUnit) ?? '');
    setQuantity('');
    setNote('');
    setEditingTransaction(null);
    setNotice(null);
    setShowModal(true);
  };

  const openEditInbound = (transaction: TransactionResponse) => {
    const matchedMaterial = materials.find((m) => m.materialCode === transaction.materialCode);
    setEditingTransaction(transaction);
    setMaterialCode(transaction.materialCode);
    setMaterialQuery(matchedMaterial ? buildMaterialLookupLabel(matchedMaterial) : transaction.materialCode);
    setLocationDraft(matchedMaterial?.location ?? '');
    setBusinessUnit(sanitizeBusinessUnit(transaction.businessUnit) ?? '');
    setQuantity(String(transaction.quantity));
    setNote(transaction.note ?? '');
    setNotice(null);
    setShowModal(true);
  };

  const syncSearchParams = (nextQuery: string, nextDay: string, nextBusinessUnit: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextQuery.trim()) {
      nextParams.set('q', nextQuery.trim());
    } else {
      nextParams.delete('q');
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

  const handleSearchChange = (nextValue: string) => {
    setSearchTerm(nextValue);
    setPage(0);
    syncSearchParams(nextValue, dayFilter, businessUnitFilter);
  };

  const handleDayFilterChange = (nextValue: string) => {
    setDayFilter(nextValue);
    setPage(0);
    syncSearchParams(searchTerm, nextValue, businessUnitFilter);
  };

  const handleBusinessUnitFilterChange = (nextValue: string) => {
    setBusinessUnitFilter(nextValue);
    setPage(0);
    syncSearchParams(searchTerm, dayFilter, nextValue);
  };

  const handleExport = async () => {
    const rows = pagedTransactions.map((transaction) => {
      const matchedMaterial = materials.find((m) => m.materialCode === transaction.materialCode);
      return {
        입고일시: formatAppDateTime(transaction.transactionDate),
        자재코드: transaction.materialCode,
        자재명: matchedMaterial?.materialName ?? transaction.materialCode,
        자재설명: matchedMaterial?.description ?? '',
        수량: transaction.quantity,
        사업장: sanitizeBusinessUnit(transaction.businessUnit) ?? '',
        비고: transaction.note ?? '',
        등록자: transaction.createdByEmail ?? '',
      };
    });
    await downloadExcel(rows, '입고_내역');
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDayFilter('');
    setBusinessUnitFilter('ALL');
    setPage(0);
    syncSearchParams('', '', 'ALL');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (!resolvedMaterial) {
      setNotice({ tone: 'error', message: '입고할 자재를 검색해서 선택해주세요.' });
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
      setNotice({ tone: 'error', message: '입고 수량은 1 이상이어야 합니다.' });
      return;
    }

    const normalizedBusinessUnit = businessUnit.trim();
    if (!normalizedBusinessUnit) {
      setNotice({ tone: 'error', message: '사업장을 선택해주세요.' });
      return;
    }

    setSubmitLoading(true);
    try {
      const selectedMaterial = resolvedMaterial;
      const normalizedLocation = locationDraft.trim() || null;
      const payload = {
        materialCode: selectedMaterial.materialCode,
        quantity: parsedQuantity,
        businessUnit: normalizedBusinessUnit,
        note: note.trim() || undefined,
      };
      if (editingTransaction) {
        await api.put(`/inventory/${editingTransaction.id}`, payload);
      } else {
        await api.post('/inventory/inbound', payload);
      }
      registerRecentMaterialCode(selectedMaterial.materialCode);

      if ((selectedMaterial.location ?? null) !== normalizedLocation) {
        try {
          await api.put('/materials', {
            materialCode: selectedMaterial.materialCode,
            materialName: selectedMaterial.materialName,
            description: selectedMaterial.description,
            location: normalizedLocation,
            safeStockQty: selectedMaterial.safeStockQty ?? 0,
            currentStockQty: selectedMaterial.currentStockQty ?? 0,
          });
        } catch {
          refreshAll();
          closeModal();
          setNotice({
            tone: 'success',
            message: '입고가 등록되었지만 자재 위치 변경에 실패했습니다. 위치를 수동으로 확인해주세요.',
          });
          return;
        }
      }

      refreshAll();
      closeModal();
      setNotice({
        tone: 'success',
        message: editingTransaction
          ? `${selectedMaterial.materialName} 입고 내역을 수정했습니다.`
          : `${selectedMaterial.materialName} 입고를 등록했습니다. 예상 재고 ${projectedQuantity.toLocaleString()} EA`,
      });
    } catch (error) {
      setNotice({ tone: 'error', message: `입고 등록에 실패했습니다. ${getErrorMessage(error)}` });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleRevert = async (id: number) => {
    if (!window.confirm('이 입고 내역을 되돌리시겠습니까? 되돌리면 해당 수량이 재고에서 다시 빠집니다.')) {
      return;
    }
    setNotice(null);
    try {
      await api.post(`/inventory/${id}/revert`);
      refreshAll();
      setNotice({ tone: 'success', message: '입고 내역을 취소했습니다.' });
    } catch (error) {
      setNotice({ tone: 'error', message: `취소하기에 실패했습니다. ${getErrorMessage(error)}` });
    }
  };

  const handleFileUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!uploadFile) {
      return;
    }

    setNotice(null);
    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      await api.post('/inventory/upload/inbound', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowUploadModal(false);
      setUploadFile(null);
      refreshAll();
      setNotice({ tone: 'success', message: '입고 파일 업로드를 완료했습니다.' });
    } catch (error) {
      setNotice({ tone: 'error', message: `업로드에 실패했습니다. ${getErrorMessage(error)}` });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleInboundTemplateDownload = async () => {
    await downloadCsv(
      [
        {
          자재코드: 'MAT-001',
          자재명: '예시 자재명',
          수량: 24,
          사업장: 'QA-T1',
          비고: '예시 입고 메모',
        },
      ],
      '입고_업로드_양식',
    );
  };

  return (
    <div className="admin-page">
      <section className="admin-header">
        <div className="admin-header-row">
          <div>
            <p className="admin-kicker">입고</p>
            <h2 className="admin-page-title">입고 관리</h2>
            <p className="admin-page-description">등록된 사업장을 선택해 입고 내역을 조회하고 등록합니다.</p>
          </div>
          <div className="admin-toolbar">
            <button type="button" onClick={refreshAll} className="admin-btn" title="새로고침">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button type="button" onClick={handleExport} className="admin-btn">
              <Download size={16} />
              엑셀 다운로드
            </button>
            <button type="button" onClick={() => setShowUploadModal(true)} className="admin-btn">
              <Upload size={16} />
              일괄 업로드
            </button>
            <button type="button" onClick={openNew} className="admin-btn admin-btn-primary">
              <Plus size={16} />
              신규 입고
            </button>
          </div>
        </div>
      </section>

      {notice && (
        <div
          className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-medium ${
            notice.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {notice.tone === 'success' ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      <AdminSearchField
        value={searchTerm}
        onChange={handleSearchChange}
        placeholder="자재명, 코드, 설명, 사업장, 비고 검색"
        wrapperClassName="max-w-md"
      />

      <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
        <select
          value={businessUnitFilter}
          onChange={(event) => handleBusinessUnitFilterChange(event.target.value)}
          className="chat-focus-ring h-10 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="ALL">전체 사업장</option>
          {businessUnitOptions.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
        <label className="chat-focus-ring flex h-10 items-center rounded-lg border border-slate-200 bg-white px-3.5 transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20">
          <input
            type="date"
            value={dayFilter}
            onChange={(event) => handleDayFilterChange(event.target.value)}
            className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
          />
        </label>
        <button
          type="button"
          onClick={handleResetFilters}
          className="chat-focus-ring inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          <RotateCcw size={13} className="mr-1.5" />
          필터 초기화
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {pagedTransactions.map((transaction) => {
            const matchedMaterial = materials.find((m) => m.materialCode === transaction.materialCode);
            return (
              <article
                key={transaction.id}
                className="grid items-center gap-4 px-4 py-4 md:grid-cols-[minmax(0,1.45fr)_112px_132px_264px] md:px-5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {matchedMaterial?.materialName ?? transaction.materialCode}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{transaction.materialCode}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>{formatAppDateTime(transaction.transactionDate)}</span>
                    <span>{formatBusinessUnit(transaction.businessUnit)}</span>
                    <span>{transaction.note || '비고 없음'}</span>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-3 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">수량</p>
                  <p className="mt-1 text-lg font-semibold text-blue-600">+{transaction.quantity} EA</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-3 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">등록자</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{transaction.createdByEmail ?? '-'}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => openEditInbound(transaction)}
                    className="admin-btn inline-flex h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap px-2.5 text-xs font-semibold text-slate-600"
                  >
                    <PencilLine size={14} />
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => openRepeatInbound(transaction)}
                    className="admin-btn inline-flex h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap px-2.5 text-xs font-semibold text-slate-600"
                  >
                    <Plus size={14} />
                    다시 등록
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRevert(transaction.id)}
                    className="admin-btn inline-flex h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap px-2.5 text-xs font-semibold text-slate-600"
                  >
                    <RotateCcw size={14} />
                    취소하기
                  </button>
                </div>
              </article>
            );
          })}
          {pagedTransactions.length === 0 && !loading && (
            <div className="px-5 py-16 text-center text-sm font-medium text-slate-400">
              <div className="flex flex-col items-center gap-3">
                <p>현재 조건에 맞는 입고 내역이 없습니다.</p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="chat-focus-ring inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  <RotateCcw size={13} className="mr-1.5" />
                  필터 초기화
                </button>
              </div>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3">
            <span className="text-xs font-medium text-slate-400">
              총 {totalElements}건 중 {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalElements)}건
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page === 0}
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-[680px] max-h-[90dvh] overflow-y-auto rounded-[20px] bg-white p-5 shadow-2xl ring-1 ring-black/5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingTransaction ? '입고 내역 수정' : '신규 입고 등록'}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">자재, 수량, 사업장, 위치를 확인한 뒤 저장합니다.</p>
                </div>
                <button
                  type="button"
                  aria-label="닫기"
                  onClick={closeModal}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">자재</label>
                  <MaterialLookupField
                    materials={materials}
                    accent="blue"
                    inputValue={materialQuery}
                    selectedCode={materialCode}
                    onInputValueChange={setMaterialQuery}
                    onSelectionChange={(material) => {
                      setMaterialCode(material?.materialCode ?? '');
                      setLocationDraft(material?.location ?? '');
                    }}
                  />
                </div>

                {resolvedMaterial && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{resolvedMaterial.materialName}</p>
                        <p className="mt-1 text-sm text-slate-500">{resolvedMaterial.materialCode}</p>
                        {resolvedMaterial.description && (
                          <p className="mt-2 text-sm text-slate-400">{resolvedMaterial.description}</p>
                        )}
                      </div>
                      <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                        선택됨
                      </span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                      <span className="font-medium text-slate-600">
                        현재 재고{' '}
                        <strong className="ml-1 text-slate-900">{editableBaseStock.toLocaleString()} EA</strong>
                      </span>
                      <span className="font-medium text-slate-600">
                        안전 재고{' '}
                        <strong className="ml-1 text-slate-900">
                          {(resolvedMaterial.safeStockQty ?? 0).toLocaleString()} EA
                        </strong>
                      </span>
                      <span className="font-medium text-slate-600">
                        입고 후 예상{' '}
                        <strong className="ml-1 text-slate-900">{projectedQuantity.toLocaleString()} EA</strong>
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">보관 위치</label>
                    <input
                      type="text"
                      value={locationDraft}
                      onChange={(event) => setLocationDraft(event.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                      placeholder="예: QA-T1 선반 A"
                      maxLength={120}
                    />
                    <p className="mt-2 text-xs text-slate-400">필요하면 여기서 자재 위치를 함께 수정합니다.</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">수량</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                      placeholder="예: 24"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">사업장</label>
                    <select
                      required
                      value={businessUnit}
                      onChange={(event) => setBusinessUnit(event.target.value)}
                      className="admin-select h-10 rounded-lg"
                    >
                      <option value="">사업장을 선택하세요</option>
                      {businessUnits.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    {businessUnits.length === 0 && (
                      <p className="mt-2 text-sm text-amber-600">
                        등록된 사업장이 없습니다. 먼저 기준 정보에서 사업장을 등록해주세요.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">비고</label>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                    placeholder="필요한 메모가 있으면 남겨주세요."
                  />
                </div>

                <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50"
                  >
                    <X size={14} className="mr-1.5" />
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading || businessUnits.length === 0}
                    className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} className="mr-1.5" />
                    {submitLoading ? '처리 중...' : editingTransaction ? '수정 저장' : '입고 등록'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {showUploadModal &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl ring-1 ring-black/5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center text-lg font-extrabold text-slate-800">
                  <FileSpreadsheet size={20} className="mr-2 text-emerald-500" />
                  입고 일괄 업로드
                </h3>
                <button
                  type="button"
                  aria-label="닫기"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="mb-4 text-xs leading-relaxed text-slate-400">
                엑셀(.xlsx) 또는 CSV(.csv) 파일을 업로드하세요. 헤더에는 <b>자재코드</b>, <b>자재명</b>, <b>수량</b>,{' '}
                <b>사업장</b> 컬럼이 포함되어야 하며 사업장은 등록된 값만 사용할 수 있습니다.
              </p>
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleInboundTemplateDownload}
                  className="chat-focus-ring inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  <Download size={14} />
                  샘플 양식 다운로드
                </button>
                <span className="inline-flex min-h-10 items-center rounded-full bg-slate-100 px-3 text-[11px] font-semibold text-slate-500">
                  업로드 전에 양식 헤더를 그대로 유지하세요.
                </span>
              </div>
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div
                  className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                    uploadDragActive
                      ? 'border-emerald-400 bg-emerald-50/70'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setUploadDragActive(true);
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setUploadDragActive(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    if (event.currentTarget === event.target) {
                      setUploadDragActive(false);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setUploadDragActive(false);
                    const droppedFile = event.dataTransfer.files?.[0] ?? null;
                    if (droppedFile) {
                      setUploadFile(droppedFile);
                    }
                  }}
                >
                  <Upload size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="mb-2 text-xs font-semibold text-slate-500">파일을 끌어다 놓거나 직접 선택하세요.</p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    required
                    onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                    className="w-full cursor-pointer text-xs text-slate-500 file:mr-3 file:rounded-full file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-emerald-600 hover:file:bg-emerald-100"
                  />
                  {uploadFile && <p className="mt-2 text-xs font-bold text-emerald-600">{uploadFile.name}</p>}
                </div>
                <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50"
                  >
                    <X size={14} className="mr-1.5" />
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={uploadLoading || !uploadFile}
                    className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Upload size={14} className="mr-1.5" />
                    {uploadLoading ? '업로드 중...' : '업로드'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default Inbound;
