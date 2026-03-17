import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Download, Search, RefreshCw, History as HistoryIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 25;

const History = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await api.get('/inventory/history');
            setTransactions(res.data.sort((a,b) => b.id - a.id));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchHistory(); }, []);

    const handleExport = () => {
        window.open('http://localhost:8080/api/export/history', '_blank');
    };

    const filtered = transactions.filter(t => 
        t.material.materialName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.material.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toString().includes(searchTerm)
    );

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return (
        <div className="flex flex-col gap-4 md:gap-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-800 flex items-center">
                        <HistoryIcon className="mr-2 text-indigo-500" size={22} /> 변경 이력
                    </h2>
                    <p className="text-xs md:text-sm text-slate-400 mt-0.5 font-medium">시스템에서 발생한 모든 재고 변경 로그를 조회합니다.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchHistory} className="p-2 border border-slate-200 bg-white shadow-sm text-slate-500 rounded-lg hover:bg-slate-50 transition-colors">
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={handleExport} className="flex items-center px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 transition-colors">
                        <Download size={14} className="mr-1.5" /> 엑셀 다운로드
                    </button>
                </div>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input
                    type="text" value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                    placeholder="자재명, 코드, ID 검색..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all outline-none text-sm text-slate-700 shadow-sm"
                />
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead>
                            <tr className="bg-slate-50/80">
                                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">변경일시</th>
                                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">ID</th>
                                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">유형</th>
                                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">자재코드</th>
                                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">자재명</th>
                                <th className="px-3 md:px-5 py-3 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">변경수량</th>
                                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">변경자</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paged.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-3 md:px-5 py-3 whitespace-nowrap text-xs md:text-sm text-slate-500 font-medium">
                                        {new Date(t.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-3 md:px-5 py-3 whitespace-nowrap text-xs text-slate-300 font-mono hidden md:table-cell">#{t.id}</td>
                                    <td className="px-3 md:px-5 py-3 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider ${t.transactionType === 'IN' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {t.transactionType === 'IN' ? '입고' : '출고'}
                                        </span>
                                    </td>
                                    <td className="px-3 md:px-5 py-3 whitespace-nowrap text-xs md:text-sm font-bold text-slate-800">{t.material.materialCode}</td>
                                    <td className="px-3 md:px-5 py-3 text-xs md:text-sm text-slate-600 hidden md:table-cell max-w-[250px] truncate">{t.material.materialName}</td>
                                    <td className="px-3 md:px-5 py-3 whitespace-nowrap text-right">
                                        <span className={`text-sm font-extrabold ${t.transactionType === 'IN' ? 'text-blue-600' : 'text-rose-500'}`}>
                                            {t.transactionType === 'IN' ? `+${t.quantity}` : `-${t.quantity}`}
                                        </span>
                                    </td>
                                    <td className="px-3 md:px-5 py-3 whitespace-nowrap text-xs text-slate-400 hidden lg:table-cell">
                                        {t.createdBy?.email || 'System'}
                                    </td>
                                </tr>
                            ))}
                            {paged.length === 0 && !loading && (
                                <tr><td colSpan="7" className="px-5 py-16 text-center text-sm text-slate-400 font-medium">데이터가 없습니다.</td></tr>
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

export default History;
