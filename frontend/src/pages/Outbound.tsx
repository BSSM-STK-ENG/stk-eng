import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import api from '../api/axios';
import MaterialLookupField, { buildMaterialLookupLabel } from '../components/inventory/MaterialLookupField';
import MaterialWorklistPanel from '../components/inventory/MaterialWorklistPanel';
import type { InventoryTransaction, MaterialDto } from '../types/api';
import { getErrorMessage } from '../utils/api-error';
import { downloadCsv, downloadExcel } from '../utils/excel';
import { formatBusinessUnit, formatLocation, sanitizeBusinessUnit, sanitizeInventoryText } from '../utils/inventory-display';
import { registerRecentMaterialCode } from '../utils/material-preferences';
import { getMaterialWorklistCodes, subscribeMaterialWorklist } from '../utils/material-worklist';

const PAGE_SIZE = 20;

type Notice = {
  tone: 'success' | 'error';
  message: string;
};

const Outbound = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const consumedPrefillKeyRef = useRef<string | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>(() => searchParams.get('q') ?? '');
  const [dayFilter, setDayFilter] = useState<string>(() => searchParams.get('day') ?? '');
  const [businessUnitFilter, setBusinessUnitFilter] = useState<string>(() => searchParams.get('unit') ?? 'ALL');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const quantityInputRef = useRef<HTMLInputElement | null>(null);
  const [worklistCodes, setWorklistCodes] = useState<string[]>(() => getMaterialWorklistCodes());

  const [materialCode, setMaterialCode] = useState<string>('');
  const [materialQuery, setMaterialQuery] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [businessUnit, setBusinessUnit] = useState<string>('');
  const [manager, setManager] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [keepContextAfterSave, setKeepContextAfterSave] = useState<boolean>(false);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [uploadDragActive, setUploadDragActive] = useState<boolean>(false);

  const fetchPageData = async () => {
    setLoading(true);
    try {
      const [ledgerResponse, materialsResponse] = await Promise.all([
        api.get<InventoryTransaction[]>('/inventory/ledger'),
        api.get<MaterialDto[]>('/materials'),
      ]);
      setTransactions(
        ledgerResponse.data
          .filter((transaction) => transaction.transactionType === 'OUT')
          .sort((left, right) => right.id - left.id),
      );
      setMaterials(materialsResponse.data);
    } catch (error) {
      setNotice({ tone: 'error', message: `데이터를 불러오지 못했습니다. ${getErrorMessage(error)}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPageData();
  }, []);

  useEffect(() => subscribeMaterialWorklist(setWorklistCodes), []);

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
      setNotice({ tone: 'error', message: '바로 출고할 자재를 찾지 못했습니다. 목록에서 다시 선택해주세요.' });
      return;
    }

    setMaterialCode(matchedMaterial.materialCode);
    setMaterialQuery(buildMaterialLookupLabel(matchedMaterial));
    setBusinessUnit('');
    setManager('');
    setQuantity('');
    setNote('');
    setShowModal(true);
  }, [materials, searchParams]);

  const filtered = transactions
    .filter((transaction) => !dayFilter || transaction.transactionDate.startsWith(dayFilter))
    .filter((transaction) => businessUnitFilter === 'ALL' || sanitizeBusinessUnit(transaction.businessUnit) === businessUnitFilter)
    .filter((transaction) =>
      [
        transaction.material.materialName,
        transaction.material.materialCode,
        sanitizeBusinessUnit(transaction.businessUnit),
        sanitizeInventoryText(transaction.manager),
        transaction.note,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(searchTerm.toLowerCase())),
    );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const businessUnitSuggestions = useMemo(
    () =>
      Array.from(new Set(
        transactions
          .map((transaction) => sanitizeBusinessUnit(transaction.businessUnit))
          .filter((value): value is string => Boolean(value)),
      ))
        .sort((left, right) => left.localeCompare(right, 'ko-KR'))
        .slice(0, 6),
    [transactions],
  );
  const businessUnitOptions = useMemo(
    () =>
      Array.from(new Set(
        transactions
          .map((transaction) => sanitizeBusinessUnit(transaction.businessUnit))
          .filter((value): value is string => Boolean(value)),
      )).sort((left, right) => left.localeCompare(right, 'ko-KR')),
    [transactions],
  );
  const managerSuggestions = useMemo(
    () =>
      Array.from(new Set(
        transactions
          .map((transaction) => sanitizeInventoryText(transaction.manager))
          .filter((value): value is string => Boolean(value)),
      ))
        .sort((left, right) => left.localeCompare(right, 'ko-KR'))
        .slice(0, 6),
    [transactions],
  );

  const resolvedMaterial = useMemo(
    () =>
      materials.find((material) => material.materialCode === materialCode)
      ?? materials.find((material) => material.materialCode.toLowerCase() === materialQuery.trim().toLowerCase())
      ?? null,
    [materialCode, materialQuery, materials],
  );
  const parsedQuantity = Number.parseInt(quantity, 10);
  const safeQuantity = Number.isFinite(parsedQuantity) ? parsedQuantity : 0;
  const currentStock = resolvedMaterial?.currentStockQty ?? 0;
  const remainingAfterDispatch = currentStock - safeQuantity;
  const insufficientStock = resolvedMaterial != null && safeQuantity > 0 && safeQuantity > currentStock;

  const resetForm = () => {
    setMaterialCode('');
    setMaterialQuery('');
    setQuantity('');
    setBusinessUnit('');
    setManager('');
    setNote('');
    setKeepContextAfterSave(false);
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

  const openRepeatOutbound = (transaction: InventoryTransaction) => {
    setMaterialCode(transaction.material.materialCode);
    setMaterialQuery(buildMaterialLookupLabel(transaction.material));
    setBusinessUnit(sanitizeBusinessUnit(transaction.businessUnit) ?? '');
    setManager(sanitizeInventoryText(transaction.manager) ?? '');
    setQuantity('');
    setNote('');
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

  const pickWorklistMaterial = (material: MaterialDto) => {
    setMaterialCode(material.materialCode);
    setMaterialQuery(buildMaterialLookupLabel(material));
    setQuantity('');
    setNote('');
    setNotice(null);
    setShowModal(true);
    window.setTimeout(() => quantityInputRef.current?.focus(), 0);
  };

  const handleExport = () => {
    const rows = filtered.map((transaction) => ({
      출고날짜: new Date(transaction.transactionDate).toLocaleDateString(),
      자재코드: transaction.material.materialCode,
      자재명: transaction.material.materialName,
      수량: transaction.quantity,
      사업장: sanitizeBusinessUnit(transaction.businessUnit) ?? '',
      담당자: sanitizeInventoryText(transaction.manager) ?? '',
      비고: transaction.note ?? '',
      등록자: transaction.createdBy?.email ?? '',
    }));
    downloadExcel(rows, '출고_내역');
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
      setNotice({ tone: 'error', message: '출고할 자재를 검색해서 선택해주세요.' });
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
      setNotice({ tone: 'error', message: '출고 수량은 1 이상이어야 합니다.' });
      return;
    }

    if (insufficientStock) {
      setNotice({ tone: 'error', message: '현재 재고보다 많은 수량을 출고할 수 없습니다.' });
      return;
    }

    const normalizedBusinessUnit = businessUnit.trim();
    if (normalizedBusinessUnit && !sanitizeBusinessUnit(normalizedBusinessUnit)) {
      setNotice({ tone: 'error', message: '사업장 값이 올바르지 않습니다. 짧은 코드나 사업장명만 입력해주세요.' });
      return;
    }

    const normalizedManager = sanitizeInventoryText(manager);
    setSubmitLoading(true);
    try {
      const selectedMaterial = resolvedMaterial;
      const normalizedSavedBusinessUnit = sanitizeBusinessUnit(normalizedBusinessUnit) ?? '';
      await api.post('/inventory/outbound', {
        materialCode: selectedMaterial.materialCode,
        quantity: parsedQuantity,
        businessUnit: normalizedSavedBusinessUnit || undefined,
        manager: normalizedManager ?? undefined,
        note: note.trim() || undefined,
      });
      registerRecentMaterialCode(selectedMaterial.materialCode);
      await fetchPageData();
      if (keepContextAfterSave) {
        setMaterialCode(selectedMaterial.materialCode);
        setMaterialQuery(buildMaterialLookupLabel(selectedMaterial));
        setBusinessUnit(normalizedSavedBusinessUnit);
        setManager(normalizedManager ?? '');
        setQuantity('');
        setNote('');
        window.setTimeout(() => quantityInputRef.current?.focus(), 0);
      } else {
        closeModal();
      }
      setNotice({
        tone: 'success',
        message: `${selectedMaterial.materialName} 출고를 등록했습니다. 예상 잔여 재고 ${Math.max(remainingAfterDispatch, 0).toLocaleString()} EA${keepContextAfterSave ? ' · 같은 자재로 계속 입력할 수 있습니다.' : ''}`,
      });
    } catch (error) {
      setNotice({ tone: 'error', message: `출고 등록에 실패했습니다. ${getErrorMessage(error)}` });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('이 출고 내역을 삭제하시겠습니까?')) {
      return;
    }
    setNotice(null);
    try {
      await api.delete(`/inventory/${id}`);
      await fetchPageData();
      setNotice({ tone: 'success', message: '출고 내역을 삭제했습니다.' });
    } catch (error) {
      setNotice({ tone: 'error', message: `삭제에 실패했습니다. ${getErrorMessage(error)}` });
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
      await api.post('/inventory/upload/outbound', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowUploadModal(false);
      setUploadFile(null);
      await fetchPageData();
      setNotice({ tone: 'success', message: '출고 파일 업로드를 완료했습니다.' });
    } catch (error) {
      setNotice({ tone: 'error', message: `업로드에 실패했습니다. ${getErrorMessage(error)}` });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleOutboundTemplateDownload = () => {
    downloadCsv(
      [
        {
          자재코드: 'MAT-001',
          자재명: '예시 자재명',
          수량: 12,
          사업장: 'QA-T1',
          담당자: 'Port QA',
          비고: '예시 출고 메모',
        },
      ],
      '출고_업로드_양식',
    );
  };

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-800 md:text-2xl">출고 관리</h2>
          <p className="mt-0.5 text-xs font-medium text-slate-400 md:text-sm">재고와 잔여 수량을 미리 확인하고, 실수 없이 출고를 등록합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void fetchPageData()}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
            title="새로고침"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Download size={14} className="mr-1.5" />
            다운로드
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-emerald-500/20 transition-colors hover:bg-emerald-600"
          >
            <Upload size={14} className="mr-1.5" />
            일괄 업로드
          </button>
          <button
            onClick={openNew}
            className="inline-flex items-center rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-rose-500/20 transition-colors hover:bg-rose-600"
          >
            <Plus size={14} className="mr-1.5" />
            신규 출고
          </button>
        </div>
      </div>

      {notice && (
        <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
          notice.tone === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-rose-200 bg-rose-50 text-rose-700'
        }`}>
          {notice.tone === 'success' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertTriangle size={18} className="mt-0.5 shrink-0" />}
          <span>{notice.message}</span>
        </div>
      )}

      <MaterialWorklistPanel
        materials={materials}
        badgeLabel="빠른 출고 준비"
        itemLabel="출고 자재"
        title="출고할 자재를 미리 골라두는 곳"
        description="현재 재고 화면에서 담아둔 자재가 여기에 모입니다. 여기에서 자재를 고르면 바로 출고 폼으로 이어집니다."
        accent="rose"
        activeMaterialCode={showModal ? materialCode : null}
        onPickMaterial={pickWorklistMaterial}
        selectionHint="자재 칩을 누르면 아래 출고 폼의 자재가 바로 바뀝니다."
        compact
        actions={[
          { label: '신규 출고 열기', onClick: openNew, tone: 'primary' },
          { label: '작업 바구니 원장 보기', onClick: () => navigate('/stock/ledger?scope=worklist') },
          { label: '입고 페이지로 이동', onClick: () => navigate('/inbound') },
        ]}
        emptyTitle="아직 미리 담아둔 출고 자재가 없습니다."
        emptyDescription="이 목록은 현재 재고 화면에서 + 버튼으로 담아둔 자재를 모아두는 곳입니다. 자주 출고하는 자재를 먼저 담아두면 검색 없이 바로 출고할 수 있습니다."
        emptySteps={[
          { title: '현재 재고에서 + 버튼 누르기', description: '출고할 자재를 찾은 뒤 자재코드 왼쪽의 + 버튼을 눌러 목록에 담습니다.' },
          { title: '이 화면에서 자재 선택하기', description: '담아둔 자재가 여기 칩으로 나타납니다. 필요한 자재를 바로 누르면 됩니다.' },
          { title: '수량만 입력하고 출고 등록', description: '자재가 이미 선택된 상태라서 수량과 담당자만 입력하면 빠르게 등록할 수 있습니다.' },
        ]}
        emptyActions={[
          { label: '현재 재고로 이동', onClick: () => navigate('/stock/current'), tone: 'primary' },
          { label: '그냥 신규 출고 열기', onClick: openNew },
        ]}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="자재명, 코드, 사업장, 담당자 검색..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 shadow-sm outline-none transition-all focus:border-rose-400 focus:ring-2 focus:ring-rose-500/30"
        />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <select
          value={businessUnitFilter}
          onChange={(event) => handleBusinessUnitFilterChange(event.target.value)}
          className="chat-focus-ring min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
        >
          <option value="ALL">전체 사업장</option>
          {businessUnitOptions.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
        <label className="chat-focus-ring flex min-h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 transition focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-500/20">
          <input
            type="date"
            value={dayFilter}
            onChange={(event) => handleDayFilterChange(event.target.value)}
            className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              const todayKey = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`;
              handleDayFilterChange(todayKey);
            }}
            className="chat-focus-ring min-h-10 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            오늘
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            className="chat-focus-ring min-h-10 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            필터 초기화
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 md:px-5">출고 날짜</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 md:px-5">자재코드</th>
                <th className="hidden px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 md:table-cell md:px-5">자재명</th>
                <th className="hidden px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 lg:table-cell lg:px-5">사업장</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400 md:px-5">수량</th>
                <th className="hidden px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 xl:table-cell xl:px-5">담당자</th>
                <th className="hidden px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 xl:table-cell xl:px-5">비고</th>
                <th className="w-28 px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 md:px-5">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paged.map((transaction) => (
                <tr key={transaction.id} className="group transition-colors hover:bg-rose-50/30">
                  <td className="whitespace-nowrap px-3 py-3 text-xs font-medium text-slate-500 md:px-5 md:text-sm">
                    {new Date(transaction.transactionDate).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs font-bold text-slate-800 md:px-5 md:text-sm">
                    <div>
                      <p>{transaction.material.materialCode}</p>
                      <p className="mt-1 text-[11px] font-medium text-slate-500 md:hidden">{transaction.material.materialName}</p>
                      <p className="mt-1 text-[11px] font-medium text-slate-400 lg:hidden">
                        {[formatBusinessUnit(transaction.businessUnit), sanitizeInventoryText(transaction.manager)].filter(Boolean).join(' · ') || '-'}
                      </p>
                    </div>
                  </td>
                  <td className="hidden max-w-[300px] truncate px-3 py-3 text-xs text-slate-600 md:table-cell md:px-5 md:text-sm">{transaction.material.materialName}</td>
                  <td className="hidden whitespace-nowrap px-3 py-3 text-xs text-slate-500 lg:table-cell lg:px-5">{formatBusinessUnit(transaction.businessUnit)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-extrabold text-rose-500 md:px-5 md:text-sm">-{transaction.quantity}</td>
                  <td className="hidden whitespace-nowrap px-3 py-3 text-xs text-slate-500 xl:table-cell xl:px-5">{sanitizeInventoryText(transaction.manager) ?? '-'}</td>
                  <td className="hidden whitespace-nowrap px-3 py-3 text-xs text-slate-400 xl:table-cell xl:px-5">{transaction.note || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-center md:px-5">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openRepeatOutbound(transaction)}
                        className="rounded p-1 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        title="같은 자재 다시 출고"
                      >
                        <Plus size={14} />
                      </button>
                      <button onClick={() => void handleDelete(transaction.id)} className="rounded p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500" title="삭제">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-sm font-medium text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <p>현재 조건에 맞는 출고 내역이 없습니다.</p>
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="chat-focus-ring inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                      >
                        필터 초기화
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3">
            <span className="text-xs font-medium text-slate-400">
              총 {filtered.length}건 중 {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)}건
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page >= totalPages - 1} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={closeModal}>
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl ring-1 ring-black/5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800">신규 출고 등록</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">출고 전에 현재 재고와 예상 잔여 수량을 확인해서 부족 재고를 미리 막습니다.</p>
              </div>
              <button onClick={closeModal} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {worklistCodes.length > 0 && (
                <MaterialWorklistPanel
                  materials={materials}
                  badgeLabel="빠른 출고 선택"
                  itemLabel="출고 자재"
                  title="미리 담아둔 자재에서 바로 선택"
                  description="위에서 자재를 다시 찾지 않고, 여기 칩만 눌러 출고할 자재를 바로 바꿀 수 있습니다."
                  accent="rose"
                  activeMaterialCode={materialCode}
                  onPickMaterial={pickWorklistMaterial}
                  selectionHint="칩을 누르면 아래 자재 선택이 즉시 바뀝니다."
                  compact
                />
              )}

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">자재 검색</label>
                <MaterialLookupField
                  materials={materials}
                  accent="rose"
                  inputValue={materialQuery}
                  selectedCode={materialCode}
                  onInputValueChange={setMaterialQuery}
                  onSelectionChange={(material) => setMaterialCode(material?.materialCode ?? '')}
                />
              </div>

              {resolvedMaterial && (
                <div className={`rounded-[22px] border px-4 py-4 ${
                  insufficientStock ? 'border-rose-200 bg-rose-50/70' : 'border-rose-100 bg-rose-50/40'
                }`}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900">{resolvedMaterial.materialName}</p>
                      <p className="mt-1 text-xs text-slate-500">{resolvedMaterial.materialCode} · 위치 {formatLocation(resolvedMaterial.location)}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${
                      insufficientStock ? 'bg-white text-rose-700' : 'bg-white text-rose-600'
                    }`}>
                      {insufficientStock ? '재고 부족' : '출고 가능'}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">현재 재고</p>
                      <p className="mt-1.5 text-lg font-black text-slate-900">{currentStock.toLocaleString()} EA</p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">출고 요청</p>
                      <p className="mt-1.5 text-lg font-black text-rose-600">{safeQuantity.toLocaleString()} EA</p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">출고 후 예상</p>
                      <p className={`mt-1.5 text-lg font-black ${insufficientStock ? 'text-rose-600' : 'text-slate-900'}`}>
                        {remainingAfterDispatch.toLocaleString()} EA
                      </p>
                    </div>
                  </div>
                  {insufficientStock && (
                    <p className="mt-3 text-xs font-semibold text-rose-700">현재 재고보다 많은 수량을 입력했습니다. 수량을 줄이거나 입고를 먼저 반영하세요.</p>
                  )}
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">수량</label>
                  <input
                    ref={quantityInputRef}
                    type="number"
                    required
                    min="1"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-medium outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-500/30"
                    placeholder="예: 12"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">사업장</label>
                  <input
                    type="text"
                    value={businessUnit}
                    onChange={(event) => setBusinessUnit(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-medium outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-500/30"
                    placeholder="예: QA-T1"
                  />
                  {businessUnitSuggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {businessUnitSuggestions.map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => setBusinessUnit(unit)}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">출고 담당자</label>
                  <input
                    type="text"
                    value={manager}
                    onChange={(event) => setManager(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-medium outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-500/30"
                    placeholder="예: Port QA"
                  />
                  {managerSuggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {managerSuggestions.map((entry) => (
                        <button
                          key={entry}
                          type="button"
                          onClick={() => setManager(entry)}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        >
                          {entry}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">비고</label>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm font-medium outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-500/30"
                    placeholder="필요한 메모가 있으면 남겨주세요."
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={keepContextAfterSave}
                  onChange={(event) => setKeepContextAfterSave(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                저장 후 같은 자재·사업장으로 계속 입력
              </label>

              <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button type="button" onClick={closeModal} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50">취소</button>
                <button type="submit" disabled={submitLoading || insufficientStock} className="rounded-xl bg-rose-500 px-5 py-2 text-sm font-bold text-white shadow-sm shadow-rose-500/20 transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50">
                  {submitLoading ? '처리 중...' : '출고 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}

      {showUploadModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setShowUploadModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center text-lg font-extrabold text-slate-800">
                <FileSpreadsheet size={20} className="mr-2 text-emerald-500" />
                출고 일괄 업로드
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-slate-400">엑셀(.xlsx) 또는 CSV(.csv) 형식의 파일을 업로드하세요. 재고 부족 항목이 있으면 서버에서 거부됩니다.</p>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleOutboundTemplateDownload}
                className="chat-focus-ring inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                <Download size={14} />
                샘플 양식 다운로드
              </button>
              <span className="inline-flex min-h-10 items-center rounded-full bg-slate-100 px-3 text-[11px] font-semibold text-slate-500">
                담당자, 사업장 헤더를 포함한 예시 양식입니다.
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
                <button type="button" onClick={() => setShowUploadModal(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50">취소</button>
                <button type="submit" disabled={uploadLoading || !uploadFile} className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-white shadow-sm shadow-emerald-500/20 transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40">
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

export default Outbound;
