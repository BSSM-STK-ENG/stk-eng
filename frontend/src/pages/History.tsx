import { ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../api/axios';
import AdminSearchField from '../components/common/AdminSearchField';
import type { InventoryTransaction } from '../types/api';
import { formatAppDateTime } from '../utils/date-format';
import { downloadExcel } from '../utils/excel';
import { formatTransactionTypeLabel, isInboundType } from '../utils/inventory-display';

const PAGE_SIZE = 25;

const History = () => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchHistory = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await api.get('/inventory/history');
      setTransactions((res.data as InventoryTransaction[]).sort((a, b) => b.id - a.id));
    } catch {
      setErrorMsg('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHistory();
  }, []);

  const handleExport = async () => {
    const rows = transactions.map((t) => ({
      변경일시: formatAppDateTime(t.createdAt),
      ID: t.id,
      유형: formatTransactionTypeLabel(t.transactionType),
      자재코드: t.material.materialCode,
      자재명: t.material.materialName,
      자재설명: t.material.description ?? '',
      변경수량: isInboundType(t.transactionType) ? t.quantity : -t.quantity,
      변경자: t.createdBy?.email ?? 'System',
    }));
    await downloadExcel(rows, '변경_이력');
  };

  const filtered = transactions.filter(
    (t) =>
      t.material.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.material.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.material.description ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toString().includes(searchTerm),
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="admin-page">
      <section className="admin-header">
        <div className="admin-header-row">
          <div>
            <p className="admin-kicker">변경 이력</p>
            <h2 className="admin-page-title">변경 이력</h2>
            <p className="admin-page-description">재고 변경 기록을 조회합니다.</p>
          </div>
          <div className="admin-toolbar">
            <button type="button" onClick={fetchHistory} className="admin-btn">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button type="button" onClick={handleExport} className="admin-btn admin-btn-primary">
              <Download size={16} /> 엑셀 다운로드
            </button>
          </div>
        </div>
      </section>

      <AdminSearchField
        value={searchTerm}
        onChange={(value) => {
          setSearchTerm(value);
          setPage(0);
        }}
        placeholder="자재명, 코드, 설명, ID 검색"
        wrapperClassName="max-w-md"
      />

      {errorMsg && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {errorMsg}
        </div>
      )}

      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  변경일시
                </th>
                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                  ID
                </th>
                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  유형
                </th>
                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  자재코드
                </th>
                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                  자재명
                </th>
                <th className="px-3 md:px-5 py-3 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  변경수량
                </th>
                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                  변경자
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paged.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 md:px-5 py-3 whitespace-nowrap text-xs md:text-sm text-slate-500 font-medium">
                    {formatAppDateTime(t.createdAt)}
                  </td>
                  <td className="px-3 md:px-5 py-3 whitespace-nowrap text-xs text-slate-300 font-mono hidden md:table-cell">
                    #{t.id}
                  </td>
                  <td className="px-3 md:px-5 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider ${isInboundType(t.transactionType) ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}
                    >
                      {formatTransactionTypeLabel(t.transactionType)}
                    </span>
                  </td>
                  <td className="px-3 md:px-5 py-3 whitespace-nowrap text-xs md:text-sm font-bold text-slate-800">
                    {t.material.materialCode}
                  </td>
                  <td className="px-3 md:px-5 py-3 text-xs md:text-sm text-slate-600 hidden md:table-cell max-w-[250px] truncate">
                    {t.material.materialName}
                  </td>
                  <td className="px-3 md:px-5 py-3 whitespace-nowrap text-right">
                    <span
                      className={`text-sm font-extrabold ${isInboundType(t.transactionType) ? 'text-blue-600' : 'text-amber-600'}`}
                    >
                      {isInboundType(t.transactionType) ? `+${t.quantity}` : `-${t.quantity}`}
                    </span>
                  </td>
                  <td className="px-3 md:px-5 py-3 whitespace-nowrap text-xs text-slate-400 hidden lg:table-cell">
                    {t.createdBy?.email || 'System'}
                  </td>
                </tr>
              ))}
              {paged.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm text-slate-400 font-medium">
                    데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-400 font-medium">총 {filtered.length}건</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
