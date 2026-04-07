import { ChevronLeft, ChevronRight } from 'lucide-react';
import type React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ page, totalPages, totalCount, pageSize, onPageChange }) => {
  if (totalPages <= 1) return null;

  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalCount);

  // Show up to 5 page numbers
  const getPageNumbers = () => {
    const pages: number[] = [];
    let startPage = Math.max(0, page - 2);
    const endPage = Math.min(totalPages - 1, startPage + 4);
    startPage = Math.max(0, endPage - 4);
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
      <span className="text-xs text-slate-400 font-medium">
        총 <span className="font-bold text-slate-600">{totalCount}</span>건 중 {start}–{end}건
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        {getPageNumbers().map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`min-w-[30px] h-[30px] rounded-lg text-xs font-bold transition-colors ${
              p === page
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            {p + 1}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
