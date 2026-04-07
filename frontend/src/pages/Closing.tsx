import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Download, Lock, RefreshCw, Unlock } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import type { MonthlyClosing } from '../types/api';
import { formatAppDateTime } from '../utils/date-format';
import { downloadExcel } from '../utils/excel';

const Closing: React.FC = () => {
  const [closings, setClosings] = useState<MonthlyClosing[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [monthInput, setMonthInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [showAll, setShowAll] = useState<boolean>(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchClosings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/closing');
      setClosings((res.data as MonthlyClosing[]).sort((a, b) => b.closingMonth.localeCompare(a.closingMonth)));
    } catch {
      setErrorMsg('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchClosings();
    setMonthInput(new Date().toISOString().substring(0, 7));
  }, []);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    successTimerRef.current = setTimeout(() => setSuccessMsg(''), 3000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    errorTimerRef.current = setTimeout(() => setErrorMsg(''), 4000);
  };

  const handleClose = async (targetMonth?: string) => {
    const month = targetMonth ?? monthInput;
    if (!month) return;
    setActionLoading(month);
    setErrorMsg('');
    try {
      await api.post(`/closing/${month}/close`);
      showSuccess(`${month} 마감이 완료되었습니다.`);
      if (targetMonth) {
        setMonthInput(month);
      }
      await fetchClosings();
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
      await fetchClosings();
    } catch {
      showError('마감 취소 실패. 이후 월이 마감된 경우 취소할 수 없습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = async () => {
    const rows = closings.map((c) => ({
      대상월: c.closingMonth,
      상태: c.status === 'CLOSED' ? '마감완료' : '미마감',
      처리일시: c.closedAt ? formatAppDateTime(c.closedAt) : '',
      처리자: c.closedBy?.email ?? '',
    }));
    await downloadExcel(rows, '월마감_현황');
  };

  // Show only recent 6 months by default
  const displayClosings = showAll ? closings : closings.slice(0, 6);

  return (
    <div className="admin-page">
      <section className="admin-header">
        <div className="admin-header-row">
          <div>
            <p className="admin-kicker">월마감</p>
            <h2 className="admin-page-title">월마감 관리</h2>
            <p className="admin-page-description">월별 마감 상태를 확인하고 처리합니다.</p>
          </div>
          <div className="admin-toolbar">
            <button type="button" onClick={fetchClosings} className="admin-btn">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              새로고침
            </button>
            <button type="button" onClick={handleExport} className="admin-btn">
              <Download size={16} /> 다운로드
            </button>
          </div>
        </div>
      </section>

      {/* Toast messages */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm font-medium text-emerald-700">
          <CheckCircle2 size={16} className="shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-200 rounded-2xl text-sm font-medium text-rose-700">
          <AlertCircle size={16} className="shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* 마감 처리 패널 */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">신규 마감 처리</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            마감은 <span className="font-bold text-slate-600">순서대로</span> 처리해야 합니다. 이전 월이 미마감이면 해당
            월부터 먼저 처리하세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="month"
                value={monthInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonthInput(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none text-sm font-medium text-slate-700"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleClose()}
              disabled={!monthInput || actionLoading === monthInput}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm shadow-slate-900/15 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === monthInput ? <RefreshCw size={15} className="animate-spin" /> : <Lock size={15} />}
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
                  <div
                    key={c.closingMonth}
                    className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${isClosed ? 'hover:bg-slate-50/50' : 'bg-slate-50/80 hover:bg-slate-100/80'}`}
                  >
                    {/* Status icon */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isClosed ? 'bg-slate-900' : 'bg-slate-200'}`}
                    >
                      {isClosed ? (
                        <Lock size={14} className="text-white" />
                      ) : (
                        <Unlock size={14} className="text-slate-700" />
                      )}
                    </div>

                    {/* Month + status */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-slate-800">{c.closingMonth}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider ${isClosed ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                        >
                          {isClosed ? '마감완료' : '미마감'}
                        </span>
                      </div>
                      {isClosed && c.closedAt && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatAppDateTime(c.closedAt)} · {c.closedBy?.email ?? ''}
                        </p>
                      )}
                      {!isClosed && (
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">마감 처리가 필요합니다</p>
                      )}
                    </div>

                    {/* Action button */}
                    {isClosed ? (
                      <button
                        type="button"
                        onClick={() => handleUnclose(c.closingMonth)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200 transition-colors disabled:opacity-50"
                      >
                        {isProcessing ? <RefreshCw size={11} className="animate-spin" /> : <Unlock size={11} />}
                        취소
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleClose(c.closingMonth)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
                      >
                        {isProcessing ? <RefreshCw size={11} className="animate-spin" /> : <Lock size={11} />}
                        마감
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {closings.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="w-full py-3 text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1 border-t border-slate-100"
              >
                {showAll ? (
                  <>
                    <ChevronUp size={14} /> 접기
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} /> 전체 보기 ({closings.length}건)
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Closing;
