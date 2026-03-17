import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { downloadExcel } from '../utils/excel';
import {
  Lock, Unlock, RefreshCw, Calendar, ShieldCheck, ShieldAlert,
  Download, AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import { MonthlyClosing } from '../types/api';

const Closing: React.FC = () => {
  const [closings, setClosings] = useState<MonthlyClosing[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [monthInput, setMonthInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [showAll, setShowAll] = useState<boolean>(false);

  const fetchClosings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/closing');
      setClosings(
        (res.data as MonthlyClosing[]).sort((a, b) =>
          b.closingMonth.localeCompare(a.closingMonth)
        )
      );
    } catch {
      setErrorMsg('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClosings();
    setMonthInput(new Date().toISOString().substring(0, 7));
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 4000);
  };

  const handleClose = async () => {
    if (!monthInput) return;
    setActionLoading(monthInput);
    setErrorMsg('');
    try {
      await api.post(`/closing/${monthInput}/close`);
      showSuccess(`${monthInput} 마감이 완료되었습니다.`);
      fetchClosings();
    } catch {
      showError('마감 처리 실패. 이전 월의 마감 상태를 확인해주세요.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnclose = async (month: string) => {
    setActionLoading(month);
    setErrorMsg('');
    try {
      await api.post(`/closing/${month}/unclose`);
      showSuccess(`${month} 마감이 취소되었습니다.`);
      fetchClosings();
    } catch {
      showError('마감 취소 실패. 이후 월이 마감된 경우 취소할 수 없습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = () => {
    const rows = closings.map(c => ({
      '대상월': c.closingMonth,
      '상태': c.status === 'CLOSED' ? '마감완료' : '미마감',
      '처리일시': c.closedAt ? new Date(c.closedAt).toLocaleString() : '',
      '처리자': c.closedBy?.email ?? '',
    }));
    downloadExcel(rows, '월마감_현황');
  };

  const closedCount = closings.filter(c => c.status === 'CLOSED').length;
  const unclosedCount = closings.length - closedCount;
  const latestClosed = closings.find(c => c.status === 'CLOSED');
  const oldestUnclosed = [...closings].reverse().find(c => c.status === 'UNCLOSED');

  // Show only recent 6 months by default
  const displayClosings = showAll ? closings : closings.slice(0, 6);

  return (
    <div className="flex flex-col gap-4 md:gap-5 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
            <Calendar size={22} className="text-purple-500" />
            월마감 관리
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">월별 재고를 확정하고 마감 처리합니다.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchClosings} className="p-2 border border-slate-200 bg-white shadow-sm text-slate-500 rounded-lg hover:bg-slate-50 transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleExport} className="flex items-center px-3 py-1.5 bg-white text-slate-600 text-xs font-bold rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors">
            <Download size={14} className="mr-1.5" /> 다운로드
          </button>
        </div>
      </div>

      {/* Toast messages */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-medium text-emerald-700">
          <CheckCircle2 size={16} className="shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-600">
          <AlertCircle size={16} className="shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">마감완료</p>
            <p className="text-xl font-extrabold text-emerald-600">{closedCount}<span className="text-xs font-bold text-slate-400 ml-0.5">건</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <ShieldAlert size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">미마감</p>
            <p className="text-xl font-extrabold text-amber-600">{unclosedCount}<span className="text-xs font-bold text-slate-400 ml-0.5">건</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-sm col-span-2 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Clock size={18} className="text-blue-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase">최근 마감월</p>
            <p className="text-sm font-extrabold text-slate-700 truncate">
              {latestClosed ? latestClosed.closingMonth : '없음'}
            </p>
          </div>
          {oldestUnclosed && (
            <>
              <div className="w-px h-8 bg-slate-100 mx-1 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-amber-400 uppercase">처리 필요</p>
                <p className="text-sm font-extrabold text-amber-600 truncate">{oldestUnclosed.closingMonth}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 마감 처리 패널 */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">신규 마감 처리</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            마감은 <span className="font-bold text-slate-600">순서대로</span> 처리해야 합니다. 이전 월이 미마감이면 해당 월부터 먼저 처리하세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="month"
                value={monthInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonthInput(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 outline-none text-sm font-medium text-slate-700"
              />
            </div>
            <button
              onClick={handleClose}
              disabled={!monthInput || actionLoading === monthInput}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 transition-colors shadow-sm shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === monthInput
                ? <RefreshCw size={15} className="animate-spin" />
                : <Lock size={15} />
              }
              마감 처리
            </button>
          </div>
        </div>
      </div>

      {/* 마감 목록 */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">마감 내역</p>
          <span className="text-xs text-slate-400">총 {closings.length}건</span>
        </div>

        {closings.length === 0 && !loading ? (
          <div className="py-16 text-center text-sm text-slate-400">등록된 마감 데이터가 없습니다.</div>
        ) : (
          <>
            <div className="divide-y divide-slate-50">
              {displayClosings.map((c) => {
                const isClosed = c.status === 'CLOSED';
                const isProcessing = actionLoading === c.closingMonth;
                return (
                  <div key={c.closingMonth} className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${isClosed ? 'hover:bg-slate-50/50' : 'bg-amber-50/30 hover:bg-amber-50/50'}`}>
                    {/* Status icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isClosed ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                      {isClosed
                        ? <Lock size={14} className="text-emerald-600" />
                        : <Unlock size={14} className="text-amber-600" />
                      }
                    </div>

                    {/* Month + status */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-slate-800">{c.closingMonth}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider ${isClosed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isClosed ? '마감완료' : '미마감'}
                        </span>
                      </div>
                      {isClosed && c.closedAt && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(c.closedAt).toLocaleString()} · {c.closedBy?.email ?? ''}
                        </p>
                      )}
                      {!isClosed && (
                        <p className="text-[11px] text-amber-500 mt-0.5 font-medium">마감 처리가 필요합니다</p>
                      )}
                    </div>

                    {/* Action button */}
                    {isClosed ? (
                      <button
                        onClick={() => handleUnclose(c.closingMonth)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200 transition-colors disabled:opacity-50"
                      >
                        {isProcessing ? <RefreshCw size={11} className="animate-spin" /> : <Unlock size={11} />}
                        취소
                      </button>
                    ) : (
                      <button
                        onClick={() => { setMonthInput(c.closingMonth); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-sm"
                      >
                        <Lock size={11} />
                        마감
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {closings.length > 6 && (
              <button
                onClick={() => setShowAll(v => !v)}
                className="w-full py-3 text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1 border-t border-slate-100"
              >
                {showAll ? <><ChevronUp size={14} /> 접기</> : <><ChevronDown size={14} /> 전체 보기 ({closings.length}건)</>}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Closing;
