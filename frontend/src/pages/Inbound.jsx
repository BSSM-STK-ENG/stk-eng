import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';
import { Download, Plus, Search, RefreshCw, Upload, Edit3, Trash2, X, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 20;

const Inbound = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [page, setPage] = useState(0);
    
    const [materialCode, setMaterialCode] = useState('');
    const [quantity, setQuantity] = useState('');
    const [businessUnit, setBusinessUnit] = useState('');
    const [note, setNote] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    
    const [uploadFile, setUploadFile] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/inventory/ledger');
            setTransactions(res.data.filter(t => t.transactionType === 'IN').sort((a,b) => b.id - a.id));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTransactions(); }, []);

    const handleExport = () => {
        window.open('http://localhost:8080/api/export/inbound', '_blank');
    };

    const openEdit = (t) => {
        setEditTarget(t);
        setMaterialCode(t.material.materialCode);
        setQuantity(String(t.quantity));
        setBusinessUnit(t.businessUnit || '');
        setNote(t.note || '');
        setShowModal(true);
    };

    const openNew = () => {
        setEditTarget(null);
        setMaterialCode(''); setQuantity(''); setBusinessUnit(''); setNote('');
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            await api.post('/inventory/inbound', {
                materialCode,
                quantity: parseInt(quantity, 10),
                businessUnit,
                note
            });
            setShowModal(false);
            resetForm();
            fetchTransactions();
        } catch (err) {
            alert('입고 등록 실패. 자재코드와 수량을 확인해주세요.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('이 입고 내역을 삭제하시겠습니까?')) return;
        try {
            await api.delete(`/inventory/${id}`);
            fetchTransactions();
        } catch (err) {
            alert('삭제 실패. 권한을 확인해주세요.');
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile) return;
        setUploadLoading(true);
        const formData = new FormData();
        formData.append('file', uploadFile);
        try {
            await api.post('/inventory/upload/inbound', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setShowUploadModal(false);
            setUploadFile(null);
            fetchTransactions();
            alert('업로드가 완료되었습니다!');
        } catch (err) {
            alert('업로드 실패. 파일 양식을 확인해주세요.');
        } finally {
            setUploadLoading(false);
        }
    };

    const resetForm = () => {
        setMaterialCode(''); setQuantity(''); setBusinessUnit(''); setNote('');
        setEditTarget(null);
    };

    const filtered = transactions.filter(t => 
        t.material.materialName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.material.materialCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return (
        <div className="flex flex-col gap-4 md:gap-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-800">입고 관리</h2>
                    <p className="text-xs md:text-sm text-slate-400 mt-0.5 font-medium">자재를 입고하고 내역을 조회합니다.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={fetchTransactions} className="p-2 border border-slate-200 bg-white shadow-sm text-slate-500 rounded-lg hover:bg-slate-50 transition-colors" title="새로고침">
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={handleExport} className="flex items-center px-3 py-1.5 bg-white text-slate-600 text-xs font-bold rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors">
                        <Download size={14} className="mr-1.5" /> 다운로드
                    </button>
                    <button onClick={() => setShowUploadModal(true)} className="flex items-center px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm shadow-emerald-500/20 hover:bg-emerald-600 transition-colors">
                        <Upload size={14} className="mr-1.5" /> 일괄 업로드
                    </button>
                    <button onClick={openNew} className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm shadow-blue-600/20 hover:bg-blue-700 transition-colors">
                        <Plus size={14} className="mr-1.5" /> 신규 입고
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                    placeholder="자재명 또는 자재코드 검색..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all outline-none text-sm text-slate-700 shadow-sm"
                />
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead>
                            <tr className="bg-slate-50/80">
                                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">입고 날짜</th>
                                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">자재코드</th>
                                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">자재명</th>
                                <th className="px-3 md:px-5 py-3 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">수량</th>
                                <th className="px-3 md:px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden lg:table-cell">비고</th>
                                <th className="px-3 md:px-5 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider w-20">액션</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paged.map((t) => (
                                <tr key={t.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-3 md:px-5 py-3 whitespace-nowrap text-xs md:text-sm text-slate-500 font-medium">{new Date(t.transactionDate).toLocaleDateString()}</td>
                                    <td className="px-3 md:px-5 py-3 whitespace-nowrap text-xs md:text-sm font-bold text-slate-800">{t.material.materialCode}</td>
                                    <td className="px-3 md:px-5 py-3 text-xs md:text-sm text-slate-600 hidden md:table-cell max-w-[300px] truncate">{t.material.materialName}</td>
                                    <td className="px-3 md:px-5 py-3 whitespace-nowrap text-xs md:text-sm text-right font-extrabold text-blue-600">+{t.quantity}</td>
                                    <td className="px-3 md:px-5 py-3 whitespace-nowrap text-xs text-slate-400 hidden lg:table-cell">{t.note || '-'}</td>
                                    <td className="px-3 md:px-5 py-3 whitespace-nowrap text-center">
                                        <button onClick={() => handleDelete(t.id)} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors" title="삭제">
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {paged.length === 0 && !loading && (
                                <tr><td colSpan="6" className="px-5 py-16 text-center text-sm text-slate-400 font-medium">데이터가 없습니다.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                        <span className="text-xs text-slate-400 font-medium">총 {filtered.length}건 중 {page * PAGE_SIZE + 1}-{Math.min((page+1) * PAGE_SIZE, filtered.length)}건</span>
                        <div className="flex gap-1">
                            <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                <ChevronLeft size={14} />
                            </button>
                            <button onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* New/Edit Modal */}
            {showModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => {setShowModal(false); resetForm();}}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 ring-1 ring-black/5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-extrabold text-slate-800">신규 입고 등록</h3>
                            <button onClick={() => {setShowModal(false); resetForm();}} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">자재코드</label>
                                <input type="text" required value={materialCode} onChange={e=>setMaterialCode(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none text-sm font-medium" placeholder="예: BG09001300013" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">수량</label>
                                <input type="number" required min="1" value={quantity} onChange={e=>setQuantity(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none text-sm font-medium" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">사업장</label>
                                <input type="text" value={businessUnit} onChange={e=>setBusinessUnit(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none text-sm font-medium" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">비고</label>
                                <input type="text" value={note} onChange={e=>setNote(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none text-sm font-medium" />
                            </div>
                            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => {setShowModal(false); resetForm();}} className="px-4 py-2 text-sm text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">취소</button>
                                <button type="submit" disabled={submitLoading} className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-50">
                                    {submitLoading ? '처리 중...' : '등록'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Upload Modal */}
            {showUploadModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowUploadModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 ring-1 ring-black/5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-extrabold text-slate-800 flex items-center"><FileSpreadsheet size={20} className="mr-2 text-emerald-500" />입고 일괄 업로드</h3>
                            <button onClick={() => setShowUploadModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
                        </div>
                        <p className="text-xs text-slate-400 mb-4 leading-relaxed">엑셀(.xlsx) 또는 CSV(.csv) 형식의 파일을 업로드하세요.<br/>헤더에 <b>자재코드</b>, <b>자재명</b>, <b>수량</b> 컬럼이 포함되어야 합니다.</p>
                        <form onSubmit={handleFileUpload} className="space-y-4">
                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-300 transition-colors">
                                <Upload size={28} className="mx-auto mb-2 text-slate-300" />
                                <input type="file" accept=".xlsx,.xls,.csv" required onChange={e => setUploadFile(e.target.files[0])} className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-600 hover:file:bg-emerald-100 cursor-pointer" />
                                {uploadFile && <p className="mt-2 text-xs font-bold text-emerald-600">{uploadFile.name}</p>}
                            </div>
                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-sm text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">취소</button>
                                <button type="submit" disabled={uploadLoading || !uploadFile} className="px-5 py-2 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed">
                                    {uploadLoading ? '업로드 중...' : '업로드'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Inbound;
