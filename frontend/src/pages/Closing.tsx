import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Lock, Unlock, RefreshCw, Calendar, ShieldCheck, ShieldAlert } from 'lucide-react';
import { MonthlyClosing } from '../types/api';

const Closing = () => {
    const [closings, setClosings] = useState<MonthlyClosing[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [monthInput, setMonthInput] = useState<string>('');

    const fetchClosings = async () => {
        setLoading(true);
        try {
            const res = await api.get('/closing');
            setClosings((res.data as MonthlyClosing[]).sort((a, b) => b.closingMonth.localeCompare(a.closingMonth)));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClosings();
        setMonthInput(new Date().toISOString().substring(0, 7));
    }, []);

    const toggleClose = async (month: string, isClosed: boolean) => {
        try {
            if (isClosed) {
                await api.post(`/closing/${month}/unclose`);
            } else {
                await api.post(`/closing/${month}/close`);
            }
            fetchClosings();
        } catch {
            alert('처리 중 오류가 발생했습니다. 이전 월의 마감 상태를 확인해주세요.');
        }
    };

    const closedCount = closings.filter(c => c.status === 'CLOSED').length;

    return (
        <div className="flex flex-col gap-4 md:gap-5 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-800 flex items-center">
                        <Calendar size={22} className="mr-2 text-purple-500" />월마감 관리
                    </h2>
                    <p className="text-xs md:text-sm text-slate-400 mt-0.5 font-medium">월별 재고 내역을 확정하고 마감 처리합니다.</p>
                </div>
                <button onClick={fetchClosings} className="p-2 border border-slate-200 bg-white shadow-sm text-slate-500 rounded-lg hover:bg-slate-50 transition-colors">
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Create/Close Month */}
            <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200/80 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">마감 대상 월</p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                    <div className="flex-1">
                        <input
                            type="month"
                            value={monthInput}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonthInput(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 outline-none text-sm font-medium text-slate-700"
                        />
                    </div>
                    <button
                        onClick={() => toggleClose(monthInput, false)}
                        className="flex items-center justify-center px-5 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-sm"
                    >
                        <Lock size={15} className="mr-2" /> 마감 생성/처리
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-sm flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><ShieldCheck size={18} className="text-emerald-500" /></div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">마감 완료</p>
                        <p className="text-lg font-extrabold text-emerald-600">{closedCount}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-sm flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center"><ShieldAlert size={18} className="text-amber-500" /></div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">미마감</p>
                        <p className="text-lg font-extrabold text-amber-600">{closings.length - closedCount}</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead>
                            <tr className="bg-slate-50/80">
                                <th className="px-4 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">대상 월</th>
                                <th className="px-4 md:px-5 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">상태</th>
                                <th className="px-4 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">처리 일시</th>
                                <th className="px-4 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">처리자</th>
                                <th className="px-4 md:px-5 py-3 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">액션</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {closings.map((c) => (
                                <tr key={c.closingMonth} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 md:px-5 py-3 whitespace-nowrap text-sm font-extrabold text-slate-800">{c.closingMonth}</td>
                                    <td className="px-4 md:px-5 py-3 whitespace-nowrap text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider ${c.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {c.status === 'CLOSED' ? '마감완료' : '미마감'}
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-5 py-3 whitespace-nowrap text-xs text-slate-400 hidden md:table-cell">
                                        {c.closedAt ? new Date(c.closedAt).toLocaleString() : '-'}
                                    </td>
                                    <td className="px-4 md:px-5 py-3 whitespace-nowrap text-xs text-slate-400 hidden md:table-cell">
                                        {c.closedBy?.email || '-'}
                                    </td>
                                    <td className="px-4 md:px-5 py-3 whitespace-nowrap text-right">
                                        <button
                                            onClick={() => toggleClose(c.closingMonth, c.status === 'CLOSED')}
                                            className={`inline-flex items-center px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors shadow-sm ${
                                                c.status === 'CLOSED'
                                                ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                                                : 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'
                                            }`}
                                        >
                                            {c.status === 'CLOSED' ? <><Unlock size={12} className="mr-1"/>취소</> : <><Lock size={12} className="mr-1"/>마감</>}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {closings.length === 0 && !loading && (
                                <tr><td colSpan={5} className="px-5 py-16 text-center text-sm text-slate-400 font-medium">등록된 마감 데이터가 없습니다.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Closing;
