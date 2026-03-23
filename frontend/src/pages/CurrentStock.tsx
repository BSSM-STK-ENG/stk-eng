import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import {
    AlertTriangle,
    Check,
    ChevronLeft,
    ChevronRight,
    Download,
    PackageCheck,
    Plus,
    RefreshCw,
    Search,
    ShieldAlert,
    Sparkles,
    Star,
    Waves,
} from 'lucide-react';
import { MaterialDto } from '../types/api';
import { downloadExcel } from '../utils/excel';
import { formatLocation, sanitizeLocation } from '../utils/inventory-display';
import { getFavoriteMaterialCodes, subscribeMaterialPreferences, toggleFavoriteMaterialCode } from '../utils/material-preferences';
import { getMaterialWorklistCodes, subscribeMaterialWorklist, toggleMaterialWorklistCode } from '../utils/material-worklist';
import StockTrendPanel from '../components/stock/StockTrendPanel';
import MaterialWorklistPanel from '../components/inventory/MaterialWorklistPanel';

const PAGE_SIZE = 25;
type StockFocusScope = 'ALL' | 'LOW' | 'ZERO' | 'AVAILABLE' | 'FAVORITES' | 'WORKLIST';

function resolveScope(raw: string | null): StockFocusScope {
    if (raw === 'LOW' || raw === 'ZERO' || raw === 'AVAILABLE' || raw === 'FAVORITES' || raw === 'WORKLIST') {
        return raw;
    }
    return 'ALL';
}

const CurrentStock = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [materials, setMaterials] = useState<MaterialDto[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>(() => searchParams.get('q') ?? '');
    const [scope, setScope] = useState<StockFocusScope>(() => resolveScope(searchParams.get('scope')));
    const [page, setPage] = useState<number>(0);
    const [favoriteCodes, setFavoriteCodes] = useState<string[]>(() => getFavoriteMaterialCodes());
    const [worklistCodes, setWorklistCodes] = useState<string[]>(() => getMaterialWorklistCodes());
    const favoriteCodeSet = useMemo(() => new Set(favoriteCodes), [favoriteCodes]);
    const worklistCodeSet = useMemo(() => new Set(worklistCodes), [worklistCodes]);

    const fetchStock = async () => {
        setLoading(true);
        try {
            const res = await api.get<MaterialDto[]>('/materials');
            setMaterials(res.data);
        } catch (err) {
            console.error('Failed to fetch stock', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void fetchStock(); }, []);
    useEffect(() => subscribeMaterialPreferences((preferences) => setFavoriteCodes(preferences.favorites)), []);
    useEffect(() => subscribeMaterialWorklist(setWorklistCodes), []);

    const handleExport = () => {
        const rows = filtered.map(m => ({
            '자재코드': m.materialCode,
            '자재명': m.materialName,
            '위치': sanitizeLocation(m.location) ?? '',
            '안전재고': m.safeStockQty ?? 0,
            '현재재고': m.currentStockQty ?? 0,
        }));
        downloadExcel(rows, '재고_현황');
    };

    const searchedMaterials = [...materials]
        .filter(m =>
            m.materialName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.materialCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sanitizeLocation(m.location)?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((left, right) => {
            const leftWorklistRank = worklistCodeSet.has(left.materialCode) ? 0 : 1;
            const rightWorklistRank = worklistCodeSet.has(right.materialCode) ? 0 : 1;
            if (leftWorklistRank !== rightWorklistRank) {
                return leftWorklistRank - rightWorklistRank;
            }

            const leftFavoriteRank = favoriteCodeSet.has(left.materialCode) ? 0 : 1;
            const rightFavoriteRank = favoriteCodeSet.has(right.materialCode) ? 0 : 1;
            if (leftFavoriteRank !== rightFavoriteRank) {
                return leftFavoriteRank - rightFavoriteRank;
            }

            return left.materialName.localeCompare(right.materialName, 'ko-KR')
                || left.materialCode.localeCompare(right.materialCode, 'ko-KR');
        });

    const filtered = searchedMaterials.filter((material) => {
        const currentStock = material.currentStockQty ?? 0;
        const safeStock = material.safeStockQty ?? 0;
        switch (scope) {
            case 'LOW':
                return safeStock > 0 && currentStock <= safeStock;
            case 'ZERO':
                return currentStock <= 0;
            case 'AVAILABLE':
                return currentStock > 0;
            case 'FAVORITES':
                return favoriteCodeSet.has(material.materialCode);
            case 'WORKLIST':
                return worklistCodeSet.has(material.materialCode);
            case 'ALL':
            default:
                return true;
        }
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const totalQty = filtered.reduce((s, m) => s + (m.currentStockQty ?? 0), 0);
    const lowStockCount = filtered.filter(m => (m.safeStockQty ?? 0) > 0 && (m.currentStockQty ?? 0) <= (m.safeStockQty ?? 0)).length;
    const inStockCount = filtered.filter(m => (m.currentStockQty ?? 0) > 0).length;
    const coverageRate = filtered.length > 0 ? Math.round((inStockCount / filtered.length) * 100) : 0;
    const allCount = searchedMaterials.length;
    const lowCount = searchedMaterials.filter((m) => (m.safeStockQty ?? 0) > 0 && (m.currentStockQty ?? 0) <= (m.safeStockQty ?? 0)).length;
    const zeroCount = searchedMaterials.filter((m) => (m.currentStockQty ?? 0) <= 0).length;
    const availableCount = searchedMaterials.filter((m) => (m.currentStockQty ?? 0) > 0).length;
    const favoriteCount = searchedMaterials.filter((m) => favoriteCodeSet.has(m.materialCode)).length;
    const worklistCount = searchedMaterials.filter((m) => worklistCodeSet.has(m.materialCode)).length;

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
        setScope('ALL');
        setPage(0);
        setSearchParams(new URLSearchParams(), { replace: true });
    };

    const openQuickAction = (path: string) => {
        navigate(path);
    };

    const openWorklistInbound = () => {
        if (worklistCodes.length === 1) {
            navigate(`/inbound?action=new&material=${encodeURIComponent(worklistCodes[0]!)}`);
            return;
        }

        navigate('/inbound');
    };

    const openWorklistOutbound = () => {
        if (worklistCodes.length === 1) {
            navigate(`/outbound?action=new&material=${encodeURIComponent(worklistCodes[0]!)}`);
            return;
        }

        navigate('/outbound');
    };

    return (
        <div className="flex flex-col gap-5 md:gap-6">
            <section className="overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(140deg,rgba(255,255,255,0.94)_0%,rgba(244,249,255,0.98)_50%,rgba(238,244,255,0.98)_100%)] px-5 py-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:px-6">
                <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
                    <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                            <Sparkles size={14} />
                            현재 재고 한눈에 보기
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                            <span className="rounded-full border border-white/80 bg-white/84 px-3 py-1.5">
                                총 자재 {filtered.length.toLocaleString()}개
                            </span>
                            <span className="rounded-full border border-amber-100 bg-amber-50/90 px-3 py-1.5 text-amber-700">
                                안전재고 경고 {lowStockCount.toLocaleString()}개
                            </span>
                            <span className="rounded-full border border-emerald-100 bg-emerald-50/90 px-3 py-1.5 text-emerald-700">
                                재고 보유율 {coverageRate}%
                            </span>
                        </div>
                        <h2 className="mt-4 max-w-[14ch] text-[clamp(2rem,3.8vw,3.5rem)] font-black leading-[0.96] tracking-[-0.05em] text-slate-900 [text-wrap:balance]">
                            지금 어떤 자재가 있고 무엇을 먼저 처리해야 하는지 바로 보는 화면
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-[15px]">
                            재고가 부족한 자재, 오늘 처리할 자재, 최근 재고 변화까지 한 번에 보고 바로 입고·출고·원장으로 이어집니다.
                        </p>
                    </div>

                    <div className="rounded-[24px] border border-white/80 bg-white/84 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)] xl:sticky xl:top-6">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">바로 할 수 있는 일</p>
                            <p className="mt-2 text-sm font-semibold text-slate-700">재고를 확인한 직후 가장 많이 누르는 버튼만 남겼습니다.</p>
                        </div>
                        <div className="mt-4 grid gap-2.5">
                            <button
                                onClick={() => void fetchStock()}
                                className="chat-focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900"
                            >
                                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                                데이터 새로고침
                            </button>
                            <button
                                onClick={handleExport}
                                className="chat-focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(15,23,42,0.16)] transition-colors hover:bg-slate-800"
                            >
                                <Download size={16} />
                                엑셀 다운로드
                            </button>
                        </div>
                        <div className="mt-4 rounded-[20px] bg-slate-900 px-4 py-3 text-sm text-white">
                            <p className="font-semibold">먼저 보면 좋은 것</p>
                            <p className="mt-1 text-xs leading-5 text-white/72">
                                안전재고 이하와 오늘 처리 목록만 먼저 보면 급한 자재를 가장 빠르게 찾을 수 있습니다.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[24px] border border-white/80 bg-white/82 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">총 자재 수</p>
                            <PackageCheck size={16} className="text-blue-500" />
                        </div>
                        <p className="mt-4 text-[30px] font-black tracking-tight text-slate-900">{filtered.length}</p>
                        <p className="mt-2 text-sm text-slate-500">지금 조회 조건에 맞는 자재 품목 수</p>
                    </div>
                    <div className="rounded-[24px] border border-white/80 bg-white/82 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">총 재고량</p>
                            <Waves size={16} className="text-cyan-500" />
                        </div>
                        <p className="mt-4 text-[30px] font-black tracking-tight text-cyan-700">{totalQty.toLocaleString()}</p>
                        <p className="mt-2 text-sm text-slate-500">전체 자재 합산 재고 수량</p>
                    </div>
                    <div className="rounded-[24px] border border-white/80 bg-white/82 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">재고 보유율</p>
                            <Sparkles size={16} className="text-emerald-500" />
                        </div>
                        <p className="mt-4 text-[30px] font-black tracking-tight text-emerald-600">{coverageRate}%</p>
                        <p className="mt-2 text-sm text-slate-500">재고가 1개 이상 존재하는 품목 비율</p>
                    </div>
                    <div className="rounded-[24px] border border-white/80 bg-white/82 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">안전재고 경고</p>
                            <ShieldAlert size={16} className="text-amber-500" />
                        </div>
                        <p className="mt-4 text-[30px] font-black tracking-tight text-amber-600">{lowStockCount}</p>
                        <p className="mt-2 text-sm text-slate-500">즉시 확인이 필요한 부족 자재 수</p>
                    </div>
                </div>
            </section>

            <MaterialWorklistPanel
                materials={materials}
                badgeLabel="오늘 처리 목록"
                itemLabel="작업 자재"
                title="오늘 바로 움직일 자재를 잠깐 모아두는 곳"
                description="표에서 담기 버튼을 누르면 여기에 모입니다. 여기에 담긴 자재는 입고, 출고, 원장에서 다시 검색하지 않고 바로 이어집니다."
                accent="blue"
                selectionHint="여기 담긴 자재는 입고, 출고, 원장에서 바로 이어서 쓸 수 있습니다."
                compact
                actions={[
                    { label: '이 자재로 입고하기', onClick: openWorklistInbound, tone: 'primary', disabled: worklistCodes.length === 0 },
                    { label: '이 자재로 출고하기', onClick: openWorklistOutbound, disabled: worklistCodes.length === 0 },
                    { label: '이 자재 거래 보기', onClick: () => navigate('/stock/ledger?scope=worklist'), disabled: worklistCodes.length === 0 },
                ]}
                emptyTitle="아직 오늘 처리 목록에 담긴 자재가 없습니다."
                emptyDescription="현재 재고 표에서 자재코드 왼쪽의 + 버튼을 누르면 여기에 추가됩니다. 자주 처리할 자재를 먼저 담아두면 다음 화면에서 다시 찾지 않아도 됩니다."
                emptySteps={[
                    { title: '1. 표에서 + 버튼 누르기', description: '오늘 먼저 처리할 자재를 찾으면 자재코드 왼쪽의 + 버튼을 누릅니다.' },
                    { title: '2. 이 목록에서 모아보기', description: '입고, 출고, 원장에서 이어서 볼 자재만 따로 모아서 확인할 수 있습니다.' },
                    { title: '3. 다음 화면으로 바로 이동', description: '이 자재로 입고하기, 출고하기, 거래 보기 버튼으로 바로 이어집니다.' },
                ]}
            />

            <StockTrendPanel
                materials={materials}
                loadingMaterials={loading}
                onRefresh={fetchStock}
            />

            <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/88 shadow-[0_22px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 md:flex-row md:items-end md:justify-between md:px-6">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-slate-600">
                            <Search size={13} />
                            자재 목록
                        </div>
                        <h3 className="mt-3 text-xl font-black tracking-tight text-slate-900 md:text-2xl">자재별 재고를 바로 읽는 표</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-500">왼쪽에서 자재를 고르고, 가운데에서 재고 상태를 확인한 뒤, 오른쪽 버튼으로 바로 다음 작업으로 넘어갑니다.</p>
                    </div>

                    <div className="relative max-w-md flex-1 md:max-w-lg">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
                            placeholder="자재명, 자재코드, 위치로 찾기"
                            className="chat-focus-ring w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-200 focus:bg-white"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3 md:px-6">
                    {[
                        { label: '전체', value: 'ALL' as const, count: allCount },
                        { label: '안전재고 이하', value: 'LOW' as const, count: lowCount },
                        { label: '재고 없음', value: 'ZERO' as const, count: zeroCount },
                        { label: '재고 보유', value: 'AVAILABLE' as const, count: availableCount },
                        { label: '즐겨찾기', value: 'FAVORITES' as const, count: favoriteCount },
                        { label: '작업 바구니', value: 'WORKLIST' as const, count: worklistCount },
                    ].map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => handleScopeChange(option.value)}
                            className={`chat-focus-ring inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-xs font-semibold transition ${
                                scope === option.value
                                    ? 'bg-slate-900 text-white'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                            }`}
                        >
                            {option.label}
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                scope === option.value ? 'bg-white/12 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                                {option.count}
                            </span>
                        </button>
                    ))}
                    {(searchTerm || scope !== 'ALL') && (
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="chat-focus-ring ml-auto inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                        >
                            필터 초기화
                        </button>
                    )}
                </div>

                <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 md:px-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <p className="text-xs font-bold tracking-[0.08em] text-slate-500">지금 보고 있는 조건</p>
                            <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                                {searchTerm.trim() ? `"${searchTerm.trim()}"를 찾고 있고 ` : ''}
                                {scope === 'ALL' ? '전체 자재를' : `${
                                    scope === 'LOW'
                                        ? '안전재고 이하 자재만'
                                        : scope === 'ZERO'
                                            ? '재고가 없는 자재만'
                                            : scope === 'AVAILABLE'
                                                ? '재고가 있는 자재만'
                                                : scope === 'FAVORITES'
                                                    ? '즐겨찾기한 자재만'
                                                    : '오늘 처리 목록 자재만'
                                } `}
                                보고 있습니다.
                            </p>
                        </div>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                            현재 결과 {filtered.length.toLocaleString()}개
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-[860px] w-full divide-y divide-slate-100">
                        <thead>
                            <tr className="bg-slate-50/85">
                                <th className="w-[132px] px-4 py-3.5 text-left text-[11px] font-bold tracking-[0.08em] text-slate-500 md:px-6">선택</th>
                                <th className="min-w-[320px] px-4 py-3.5 text-left text-[11px] font-bold tracking-[0.08em] text-slate-500 md:px-6">자재 코드 · 이름</th>
                                <th className="w-[260px] px-4 py-3.5 text-left text-[11px] font-bold tracking-[0.08em] text-slate-500 md:px-6">현재 재고 · 기준</th>
                                <th className="w-[228px] px-4 py-3.5 text-left text-[11px] font-bold tracking-[0.08em] text-slate-500 md:px-6">다음 작업</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paged.map((m) => {
                                const isLow = (m.safeStockQty ?? 0) > 0 && (m.currentStockQty ?? 0) <= (m.safeStockQty ?? 0);
                                const currentStock = m.currentStockQty ?? 0;
                                const safeStock = m.safeStockQty ?? 0;
                                const stockStateLabel = currentStock <= 0 ? '재고 없음' : isLow ? '부족 위험' : '재고 정상';
                                const stockStateTone = currentStock <= 0
                                    ? 'border-slate-200 bg-slate-100 text-slate-600'
                                    : isLow
                                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                                        : 'border-emerald-200 bg-emerald-50 text-emerald-700';
                                return (
                                    <tr key={m.materialCode} className={`transition-colors ${isLow ? 'bg-amber-50/45 hover:bg-amber-50/70' : 'hover:bg-slate-50/60'}`}>
                                        <td className="px-4 py-4 align-top md:px-6">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setFavoriteCodes(toggleFavoriteMaterialCode(m.materialCode))}
                                                    className={`chat-focus-ring flex h-9 w-9 items-center justify-center rounded-full border transition ${
                                                        favoriteCodeSet.has(m.materialCode)
                                                            ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
                                                            : 'border-slate-200 bg-white text-slate-300 hover:border-slate-300 hover:text-slate-500'
                                                    }`}
                                                    aria-label={favoriteCodeSet.has(m.materialCode) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                                                    title={favoriteCodeSet.has(m.materialCode) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                                                >
                                                    <Star size={14} className={favoriteCodeSet.has(m.materialCode) ? 'fill-current' : ''} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setWorklistCodes(toggleMaterialWorklistCode(m.materialCode))}
                                                    className={`chat-focus-ring inline-flex min-h-9 items-center justify-center gap-1 rounded-full border px-3 transition ${
                                                        worklistCodeSet.has(m.materialCode)
                                                            ? 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                            : 'border-slate-200 bg-white text-slate-300 hover:border-slate-300 hover:text-slate-500'
                                                    }`}
                                                    aria-label={worklistCodeSet.has(m.materialCode) ? '작업 바구니에서 제거' : '작업 바구니에 추가'}
                                                    title={worklistCodeSet.has(m.materialCode) ? '작업 바구니에서 제거' : '작업 바구니에 추가'}
                                                >
                                                    {worklistCodeSet.has(m.materialCode) ? <Check size={14} /> : <Plus size={14} />}
                                                    <span className="text-[11px] font-bold">
                                                        {worklistCodeSet.has(m.materialCode) ? '담김' : '담기'}
                                                    </span>
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 align-top md:px-6">
                                            <div className="max-w-[520px]">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-base font-black tracking-tight text-slate-900">{m.materialCode}</p>
                                                    {isLow && <AlertTriangle size={14} className="shrink-0 text-amber-500" />}
                                                    {favoriteCodeSet.has(m.materialCode) && (
                                                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                                            즐겨찾기
                                                        </span>
                                                    )}
                                                    {worklistCodeSet.has(m.materialCode) && (
                                                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                                            오늘 처리 목록
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                                                    {m.materialName}
                                                </p>
                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium">
                                                        보관 위치 {formatLocation(m.location)}
                                                    </span>
                                                    {safeStock > 0 && (
                                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium">
                                                            기준 안전재고 {safeStock}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 align-top md:px-6">
                                            <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-bold tracking-[0.08em] text-slate-400">상태</p>
                                                        <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${stockStateTone}`}>
                                                            {stockStateLabel}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[11px] font-semibold text-slate-400">현재 재고</p>
                                                        <p className={`mt-1 text-2xl font-black tracking-tight ${isLow ? 'text-amber-600' : currentStock > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                            {currentStock}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                                                        기준 안전재고 {safeStock}
                                                    </span>
                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                                                        보관 위치 {formatLocation(m.location)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 align-top md:px-6">
                                            <div className="grid max-w-[220px] grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openQuickAction(`/inbound?action=new&material=${encodeURIComponent(m.materialCode)}`)}
                                                    className="chat-focus-ring inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-2xl border border-blue-100 bg-blue-50 px-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                                                >
                                                    입고 등록
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openQuickAction(`/outbound?action=new&material=${encodeURIComponent(m.materialCode)}`)}
                                                    className="chat-focus-ring inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-2xl border border-rose-100 bg-rose-50 px-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
                                                >
                                                    출고 등록
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openQuickAction(`/stock/ledger?material=${encodeURIComponent(m.materialCode)}`)}
                                                    className="chat-focus-ring col-span-2 inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                                                >
                                                    이 자재 거래 보기
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {paged.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="px-5 py-16 text-center text-sm text-slate-400 font-medium">
                                        <div className="flex flex-col items-center gap-3">
                                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                                                찾는 자재가 아직 보이지 않습니다
                                            </span>
                                            <p className="text-base font-semibold text-slate-700">
                                                {searchTerm.trim() ? `"${searchTerm.trim()}"에 맞는 자재가 없습니다.` : '현재 조건에 맞는 자재가 없습니다.'}
                                            </p>
                                            <p className="max-w-md text-sm leading-6 text-slate-500">
                                                검색어를 지우거나 조건을 바꾸면 전체 자재를 다시 볼 수 있습니다.
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
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                        <span className="text-xs text-slate-400 font-medium">총 {filtered.length}건 중 {page * PAGE_SIZE + 1}-{Math.min((page+1) * PAGE_SIZE, filtered.length)}건</span>
                        <div className="flex gap-1">
                            <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"><ChevronLeft size={14} /></button>
                            <button onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"><ChevronRight size={14} /></button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
};

export default CurrentStock;
