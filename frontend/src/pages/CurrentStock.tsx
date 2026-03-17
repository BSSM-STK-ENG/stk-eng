import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Download, Search, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { MaterialDto } from '../types/api';
import { downloadExcel } from '../utils/excel';

const PAGE_SIZE = 25;

const CurrentStock = () => {
    const [materials, setMaterials] = useState<MaterialDto[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [page, setPage] = useState<number>(0);

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

    useEffect(() => { fetchStock(); }, []);

    const handleExport = () => {
        const rows = materials.map(m => ({
            '자재코드': m.materialCode,
            '자재명': m.materialName,
            '위치': m.location ?? '',
            '안전재고': m.safeStockQty ?? 0,
            '현재재고': m.currentStockQty ?? 0,
        }));
        downloadExcel(rows, '재고_현황');
    };

    const filtered = materials.filter(m =>
        m.materialName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.materialCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const totalQty = filtered.reduce((s, m) => s + (m.currentStockQty ?? 0), 0);
    const lowStockCount = filtered.filter(m => (m.safeStockQty ?? 0) > 0 && (m.currentStockQty ?? 0) <= (m.safeStockQty ?? 0)).length;

    return (
        <div className="flex flex-col gap-4 md:gap-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-800">현재 재고 조회</h2>
                    <p className="text-xs md:text-sm text-slate-400 mt-0.5 font-medium">실시간 자재 현황을 확인하고 엑셀로 다운로드합니다.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchStock} className="p-2 border border-slate-200 bg-white shadow-sm text-slate-500 rounded-lg hover:bg-slate-50 transition-colors">
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={handleExport} className="flex items-center px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 transition-colors">
                        <Download size={14} className="mr-1.5" /> 엑셀 다운로드
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">총 자재 수</p>
                    <p className="text-xl font-extrabold text-slate-800 mt-1">{filtered.length}<span className="text-xs font-bold text-slate-400 ml-1">종</span></p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">총 재고량</p>
                    <p className="text-xl font-extrabold text-emerald-600 mt-1">{totalQty.toLocaleString()}<span className="text-xs font-bold text-slate-400 ml-1">EA</span></p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">재고있음</p>
                    <p className="text-xl font-extrabold text-blue-600 mt-1">{filtered.filter(m => (m.currentStockQty ?? 0) > 0).length}<span className="text-xs font-bold text-slate-400 ml-1">종</span></p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">부족 <AlertTriangle size={10} className="ml-1 text-amber-400" /></p>
                    <p className="text-xl font-extrabold text-amber-500 mt-1">{lowStockCount}<span className="text-xs font-bold text-slate-400 ml-1">종</span></p>
                </div>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setPage(0); }}
                    placeholder="자재명, 코드, 위치 검색..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all outline-none text-sm text-slate-700 shadow-sm"
                />
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead>
                            <tr className="bg-slate-50/80">
                                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">자재코드</th>
                                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">자재명</th>
                                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">위치</th>
                                <th className="px-3 md:px-5 py-3 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">안전재고</th>
                                <th className="px-3 md:px-5 py-3 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">현재재고</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paged.map((m) => {
                                const isLow = (m.safeStockQty ?? 0) > 0 && (m.currentStockQty ?? 0) <= (m.safeStockQty ?? 0);
                                return (
                                    <tr key={m.materialCode} className={`transition-colors ${isLow ? 'bg-amber-50/40 hover:bg-amber-50/60' : 'hover:bg-slate-50/50'}`}>
                                        <td className="px-3 md:px-5 py-3 whitespace-nowrap text-xs md:text-sm font-bold text-slate-800">{m.materialCode}</td>
                                        <td className="px-3 md:px-5 py-3 text-xs md:text-sm text-slate-600 max-w-[250px] md:max-w-[400px] truncate">{m.materialName}</td>
                                        <td className="px-3 md:px-5 py-3 whitespace-nowrap text-xs text-slate-400 hidden md:table-cell">{m.location || '-'}</td>
                                        <td className="px-3 md:px-5 py-3 whitespace-nowrap text-xs text-right text-slate-400 hidden lg:table-cell">{m.safeStockQty ?? 0}</td>
                                        <td className="px-3 md:px-5 py-3 whitespace-nowrap text-right">
                                            <span className={`text-sm font-extrabold ${isLow ? 'text-amber-600' : (m.currentStockQty ?? 0) > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                                {m.currentStockQty ?? 0}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {paged.length === 0 && !loading && (
                                <tr><td colSpan={5} className="px-5 py-16 text-center text-sm text-slate-400 font-medium">데이터가 없습니다.</td></tr>
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
            </div>
        </div>
    );
};

export default CurrentStock;
