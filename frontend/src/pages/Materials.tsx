import { Package, PencilLine, RefreshCw, Trash2, X } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useMaterials, queryKeys } from '../api/queries';
import AdminSearchField from '../components/common/AdminSearchField';
import type { MaterialDto } from '../types/api';
import { getErrorMessage } from '../utils/api-error';

type Notice = {
  tone: 'success' | 'error';
  message: string;
};

export default function Materials() {
  const queryClient = useQueryClient();
  const { data: materials = [], isLoading: loading } = useMaterials();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [materialForm, setMaterialForm] = useState({
    materialCode: '',
    materialName: '',
    safeStockQty: '',
    description: '',
  });
  const [materialSubmitting, setMaterialSubmitting] = useState<boolean>(false);
  const [editingMaterialCode, setEditingMaterialCode] = useState<string | null>(null);
  const [deletingMaterialCode, setDeletingMaterialCode] = useState<string | null>(null);
  const [materialSearch, setMaterialSearch] = useState('');

  const resetMaterialForm = () => {
    setMaterialForm({
      materialCode: '',
      materialName: '',
      safeStockQty: '',
      description: '',
    });
    setEditingMaterialCode(null);
  };

  const handleMaterialSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setMaterialSubmitting(true);
    try {
      const rawSafeStock = materialForm.safeStockQty.trim();
      const parsedSafeStock = rawSafeStock ? parseInt(rawSafeStock, 10) : 0;
      if (isNaN(parsedSafeStock) || parsedSafeStock < 0) {
        setNotice({ tone: 'error', message: '안전재고는 0 이상의 정수를 입력해주세요.' });
        setMaterialSubmitting(false);
        return;
      }
      const payload = {
        materialCode: materialForm.materialCode.trim(),
        materialName: materialForm.materialName.trim(),
        location: editingMaterialCode
          ? (materials.find((item) => item.materialCode === editingMaterialCode)?.location ?? null)
          : null,
        safeStockQty: parsedSafeStock,
        description: materialForm.description.trim() || null,
        currentStockQty: editingMaterialCode
          ? (materials.find((item) => item.materialCode === editingMaterialCode)?.currentStockQty ?? 0)
          : 0,
      };

      if (editingMaterialCode) {
        await api.put('/materials', payload);
        setNotice({ tone: 'success', message: '자재 정보를 수정했습니다.' });
      } else {
        await api.post('/materials', payload);
        setNotice({ tone: 'success', message: '자재를 등록했습니다.' });
      }

      resetMaterialForm();
      await queryClient.invalidateQueries({ queryKey: queryKeys.materials });
    } catch (error) {
      setNotice({ tone: 'error', message: `자재 저장에 실패했습니다. ${getErrorMessage(error)}` });
    } finally {
      setMaterialSubmitting(false);
    }
  };

  const handleEditMaterial = (item: MaterialDto) => {
    setEditingMaterialCode(item.materialCode);
    setMaterialForm({
      materialCode: item.materialCode,
      materialName: item.materialName,
      safeStockQty: String(item.safeStockQty ?? 0),
      description: item.description ?? '',
    });
  };

  const handleDeleteMaterial = async (item: MaterialDto) => {
    if (!window.confirm(`자재 "${item.materialName}"을(를) 삭제하시겠습니까?`)) {
      return;
    }
    setNotice(null);
    setDeletingMaterialCode(item.materialCode);
    try {
      await api.delete('/materials', {
        params: {
          materialCode: item.materialCode,
        },
      });
      if (editingMaterialCode === item.materialCode) {
        resetMaterialForm();
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.materials });
      setNotice({ tone: 'success', message: '자재를 삭제했습니다.' });
    } catch (error) {
      setNotice({ tone: 'error', message: `자재 삭제에 실패했습니다. ${getErrorMessage(error)}` });
    } finally {
      setDeletingMaterialCode(null);
    }
  };

  const filteredMaterials = useMemo(
    () =>
      materials.filter((item) => {
        const query = materialSearch.trim().toLowerCase();
        if (!query) {
          return true;
        }

        return [item.materialCode, item.materialName, item.description]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query));
      }),
    [materialSearch, materials],
  );

  return (
    <div className="admin-page">
      <section className="admin-header">
        <div className="admin-header-row">
          <div>
            <p className="admin-kicker">자재 관리</p>
            <h2 className="admin-page-title">자재 관리</h2>
            <p className="admin-page-description">입고와 출고에서 선택할 자재 기본 정보만 관리합니다.</p>
          </div>
          <button type="button" onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.materials })} className="admin-btn">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>
      </section>

      {notice && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            notice.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {notice.message}
        </div>
      )}

      <section className="admin-section p-5">
        <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">등록된 자재</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{materials.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">안전재고 이하</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {
                materials.filter((item) => {
                  const safeStock = item.safeStockQty ?? 0;
                  const currentStock = item.currentStockQty ?? 0;
                  return safeStock > 0 && currentStock > 0 && currentStock <= safeStock;
                }).length
              }
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">적용 규칙</p>
            <p className="mt-2 text-sm font-medium text-slate-700">위치는 입고 또는 현재 재고 화면에서 수정합니다.</p>
          </div>
        </div>
      </section>

      <section className="admin-section p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
            <Package size={18} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">자재 정보 등록</h3>
            <p className="mt-1 text-sm text-slate-500">코드, 이름, 안전재고, 설명만 등록합니다.</p>
          </div>
        </div>

        <form onSubmit={handleMaterialSubmit} className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_1.4fr_0.9fr_auto]">
          <input
            type="text"
            value={materialForm.materialCode}
            onChange={(event) => setMaterialForm((current) => ({ ...current, materialCode: event.target.value }))}
            className="admin-control"
            placeholder="자재코드"
            maxLength={120}
            disabled={editingMaterialCode != null}
            required
          />
          <input
            type="text"
            value={materialForm.materialName}
            onChange={(event) => setMaterialForm((current) => ({ ...current, materialName: event.target.value }))}
            className="admin-control"
            placeholder="자재명"
            maxLength={200}
            required
          />
          <input
            type="number"
            min="0"
            value={materialForm.safeStockQty}
            onChange={(event) => setMaterialForm((current) => ({ ...current, safeStockQty: event.target.value }))}
            className="admin-control"
            placeholder="안전재고"
          />
          <textarea
            value={materialForm.description}
            onChange={(event) => setMaterialForm((current) => ({ ...current, description: event.target.value }))}
            className="admin-textarea lg:col-span-3"
            placeholder="설명 또는 비고"
          />
          <div className="flex flex-wrap items-end gap-2">
            <button
              type="submit"
              disabled={materialSubmitting}
              className="admin-btn admin-btn-primary min-w-[112px] whitespace-nowrap"
            >
              {materialSubmitting ? '저장 중...' : editingMaterialCode ? '수정' : '등록'}
            </button>
            {editingMaterialCode && (
              <button type="button" onClick={resetMaterialForm} className="admin-btn min-w-[96px] whitespace-nowrap">
                <X size={14} />
                취소
              </button>
            )}
          </div>
        </form>

        <div className="mt-5">
          <AdminSearchField
            value={materialSearch}
            onChange={setMaterialSearch}
            placeholder="자재코드, 자재명, 설명 검색"
          />
        </div>

        <div className="mt-5 space-y-3 lg:hidden">
          {filteredMaterials.length > 0 ? (
            filteredMaterials.map((item) => (
              <article
                key={item.materialCode}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.materialName}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.materialCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">현재재고</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {(item.currentStockQty ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
                  <div>
                    <p className="text-xs text-slate-400">안전재고</p>
                    <p className="mt-1">{(item.safeStockQty ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">위치</p>
                    <p className="mt-1">{item.location ?? '-'}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-slate-400">설명</p>
                  <p className="mt-1 text-sm text-slate-600">{item.description || '-'}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditMaterial(item)}
                    className="admin-btn inline-flex min-h-10 flex-1 justify-center whitespace-nowrap px-3 text-sm text-slate-600"
                  >
                    <PencilLine size={14} />
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMaterial(item)}
                    disabled={deletingMaterialCode === item.materialCode}
                    className="admin-btn inline-flex min-h-10 flex-1 justify-center whitespace-nowrap px-3 text-sm text-slate-500"
                  >
                    <Trash2 size={14} />
                    {deletingMaterialCode === item.materialCode ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
              등록된 자재가 없습니다.
            </div>
          )}
        </div>

        <div className="admin-table-panel mt-5 hidden lg:block">
          <table className="min-w-full border-collapse">
            <thead className="admin-table-head">
              <tr>
                <th className="px-4 py-3 text-left">자재</th>
                <th className="px-4 py-3 text-right">안전재고</th>
                <th className="px-4 py-3 text-right">현재재고</th>
                <th className="px-4 py-3 text-left">설명</th>
                <th className="w-[168px] px-4 py-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.length > 0 ? (
                filteredMaterials.map((item) => (
                  <tr key={item.materialCode} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.materialName}</p>
                        <p className="mt-1 text-xs text-slate-400">{item.materialCode}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                      {(item.safeStockQty ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                      {(item.currentStockQty ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[420px]">
                        <p className="truncate text-sm text-slate-600">{item.description || '-'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditMaterial(item)}
                          className="admin-btn inline-flex min-h-9 min-w-[72px] justify-center whitespace-nowrap px-3 text-xs text-slate-600"
                        >
                          <PencilLine size={14} />
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMaterial(item)}
                          disabled={deletingMaterialCode === item.materialCode}
                          className="admin-btn inline-flex min-h-9 min-w-[108px] justify-center whitespace-nowrap px-3 text-xs text-slate-500"
                        >
                          <Trash2 size={14} />
                          {deletingMaterialCode === item.materialCode ? '삭제 중...' : '삭제'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                    등록된 자재가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
