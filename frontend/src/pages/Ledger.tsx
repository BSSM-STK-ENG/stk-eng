import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Download, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { InventoryTransaction } from '../types/api';
import { downloadExcel } from '../utils/excel';

const PAGE_SIZE = 25;

const Ledger = () => {
    const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [page, setPage] = useState<number>(0);

    const fetchLedger = async () => {
        setLoading(true);
        try {
            const res = await api.get<InventoryTransaction[]>('/inventory/ledger');
            setTransactions(res.data.sort((a, b) => b.id - a.id));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLedger(); }, []);

    const handleExport = () => {
        const rows = transactions.map(t => ({
            '일자': new Date(t.transactionDate).toLocaleDateString(),
            '유형': t.transactionType === 'IN' ? '입고' : '출고',
            '자재코드': t.material.materialCode,
            '자재명': t.material.materialName,
            '수량': t.transactionType === 'IN' ? t.quantity : -t.quantity,
            '사업장': t.businessUnit ?? '',
            '담당자': t.manager ?? '',
            '비고': t.note ?? '',
            '등록자': t.createdBy?.email ?? '',
        }));
        downloadExcel(rows, '수불_현황');
    };

    const filtered = transactions
        .filter(t => typeFilter === 'ALL' || t.transactionType === typeFilter)
        .filter(t =>
            t.material.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.material.materialCode.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const inCount = transactions.filter(t => t.transactionType === 'IN').length;
    const outCount = transactions.filter(t => t.transactionType === 'OUT').length;

    return (
        <div className="flex flex-col gap-4 md:gap-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-800">재고 수불부</h2>
                    <p className="text-xs md:text-sm text-slate-400 mt-0.5 font-medium">전체 입출고 내역을 종합적으로 조회합니다.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchLedger} className="p-2 border border-slate-200 bg-white shadow-sm text-slate-500 rounded-lg hover:bg-slate-50 transition-colors">
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={handleExport} className="flex items-center px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 transition-colors">
                        <Download size={14} className="mr-1.5" /> 엑셀 다운로드
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative max-w-md flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input
                        type="text" value={searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setPage(0); }}
                        placeholder="자재명 또는 코드 검색..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all outline-none text-sm text-slate-700 shadow-sm"
                    />
                </div>
                <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-0.5 shadow-sm">
                    {[{label:'전체', val:'ALL', count: transactions.length}, {label:'입고', val:'IN', count: inCount}, {label:'출고', val:'OUT', count: outCount}].map(f => (
                        <button key={f.val} onClick={() => { setTypeFilter(f.val); setPage(0); }}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${typeFilter === f.val ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            {f.label} <span className="ml-0.5 opacity-60">{f.count}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead>
                            <tr className="bg-slate-50/80">
                                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">일자</th>
                                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">유형</th>
                                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">자재코드</th>
                                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">자재명</th>
                                <th className="px-3 md:px-5 py-3 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">수량</th>
                                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">등록자</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paged.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-3 md:px-5 py-3 whitespace-nowrap text-xs md:text-sm text-slate-500 font-medium">{new Date(t.transactionDate).toLocaleDateString()}</td>
                                    <td className="px-3 md:px-5 py-3 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider ${t.transactionType === 'IN' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {t.transactionType === 'IN' ? '입고' : '출고'}
                                        </span>
                                    </td>
                                    <td className="px-3 md:px-5 py-3 whitespace-nowrap text-xs md:text-sm font-bold text-slate-800">{t.material.materialCode}</td>
                                    <td className="px-3 md:px-5 py-3 text-xs md:text-sm text-slate-600 hidden md:table-cell max-w-[300px] truncate">{t.material.materialName}</td>
                                    <td className="px-3 md:px-5 py-3 whitespace-nowrap text-right">
                                        <span className={`text-sm font-extrabold ${t.transactionType === 'IN' ? 'text-blue-600' : 'text-rose-500'}`}>
                                            {t.transactionType === 'IN' ? '+' : '-'}{t.quantity}
                                        </span>
                                    </td>
                                    <td className="px-3 md:px-5 py-3 whitespace-nowrap text-xs text-slate-400 hidden lg:table-cell">{t.createdBy?.email || 'System'}</td>
                                </tr>
                            ))}
                            {paged.length === 0 && !loading && (
                                <tr><td colSpan={6} className="px-5 py-16 text-center text-sm text-slate-400 font-medium">데이터가 없습니다.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                        <span className="text-xs text-slate-400 font-medium">총 {filtered.length}건</span>
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

export default Ledger;
