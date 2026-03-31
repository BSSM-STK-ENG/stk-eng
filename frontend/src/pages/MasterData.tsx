import React, { useEffect, useState } from 'react';
import { Building2, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import type { MasterDataItem } from '../types/api';
import { getErrorMessage } from '../utils/api-error';

type Notice = {
  tone: 'success' | 'error';
  message: string;
};

type SectionCardProps = {
  title: string;
  description: string;
  placeholder: string;
  items: MasterDataItem[];
  icon: React.ReactNode;
  value: string;
  loading: boolean;
  editingId: number | null;
  editValue: string;
  savingId: number | null;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onEditStart: (item: MasterDataItem) => void;
  onEditChange: (value: string) => void;
  onEditCancel: () => void;
  onSave: (item: MasterDataItem) => void;
};

function SectionCard({
  title,
  description,
  placeholder,
  items,
  icon,
  value,
  loading,
  editingId,
  editValue,
  savingId,
  onChange,
  onSubmit,
  onEditStart,
  onEditChange,
  onEditCancel,
  onSave,
}: SectionCardProps) {
  return (
    <section className="admin-section p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
          {icon}
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="admin-control flex-1"
          placeholder={placeholder}
          maxLength={120}
        />
        <button type="submit" disabled={loading} className="admin-btn admin-btn-primary min-w-[112px]">
          {loading ? '저장 중...' : '등록'}
        </button>
      </form>

      <div className="admin-table-panel mt-5">
        <table className="min-w-full border-collapse">
          <thead className="admin-table-head">
            <tr>
              <th className="px-4 py-3 text-left">이름</th>
              <th className="w-[200px] px-4 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(event) => onEditChange(event.target.value)}
                        className="admin-control w-full"
                        maxLength={120}
                      />
                    ) : (
                      <p className="text-sm font-medium text-slate-700">{item.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {editingId === item.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onEditCancel()}
                            className="admin-btn inline-flex min-h-10 min-w-[80px] justify-center whitespace-nowrap px-3 text-sm text-slate-500"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => onSave(item)}
                            disabled={savingId === item.id}
                            className="admin-btn admin-btn-primary inline-flex min-h-10 min-w-[88px] justify-center whitespace-nowrap px-3 text-sm"
                          >
                            {savingId === item.id ? '저장 중...' : '저장'}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onEditStart(item)}
                          className="admin-btn inline-flex min-h-10 min-w-[88px] justify-center whitespace-nowrap px-3 text-sm text-slate-600"
                        >
                          수정
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="px-4 py-10 text-center text-sm text-slate-400">
                  아직 등록된 사업장이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function MasterData() {
  const [businessUnits, setBusinessUnits] = useState<MasterDataItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [businessUnitName, setBusinessUnitName] = useState<string>('');
  const [businessUnitSubmitting, setBusinessUnitSubmitting] = useState<boolean>(false);
  const [editingBusinessUnitId, setEditingBusinessUnitId] = useState<number | null>(null);
  const [editingBusinessUnitName, setEditingBusinessUnitName] = useState<string>('');
  const [savingBusinessUnitId, setSavingBusinessUnitId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const businessUnitResponse = await api.get<MasterDataItem[]>('/master-data/business-units');
      setBusinessUnits(businessUnitResponse.data);
    } catch (error) {
      setNotice({ tone: 'error', message: `사업장 정보를 불러오지 못했습니다. ${getErrorMessage(error)}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleBusinessUnitSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setBusinessUnitSubmitting(true);
    try {
      await api.post<MasterDataItem>('/master-data/business-units', { name: businessUnitName });
      setBusinessUnitName('');
      await loadData();
      setNotice({ tone: 'success', message: '사업장을 등록했습니다.' });
    } catch (error) {
      setNotice({ tone: 'error', message: `사업장 등록에 실패했습니다. ${getErrorMessage(error)}` });
    } finally {
      setBusinessUnitSubmitting(false);
    }
  };

  const handleStartEditBusinessUnit = (item: MasterDataItem) => {
    setEditingBusinessUnitId(item.id);
    setEditingBusinessUnitName(item.name);
  };

  const handleSaveBusinessUnit = async (item: MasterDataItem) => {
    const nextName = editingBusinessUnitName.trim();
    if (!nextName || nextName === item.name) {
      setEditingBusinessUnitId(null);
      return;
    }

    setNotice(null);
    setSavingBusinessUnitId(item.id);
    try {
      await api.put<MasterDataItem>(`/master-data/business-units/${item.id}`, { name: nextName });
      await loadData();
      setEditingBusinessUnitId(null);
      setEditingBusinessUnitName('');
      setNotice({ tone: 'success', message: '사업장 이름을 수정했습니다.' });
    } catch (error) {
      setNotice({ tone: 'error', message: `사업장 수정에 실패했습니다. ${getErrorMessage(error)}` });
    } finally {
      setSavingBusinessUnitId(null);
    }
  };

  return (
    <div className="admin-page">
      <section className="admin-header">
        <div className="admin-header-row">
          <div>
            <p className="admin-kicker">기준 정보</p>
            <h2 className="admin-page-title">사업장 관리</h2>
            <p className="admin-page-description">입고와 출고에서 선택할 사업장을 등록하고 이름을 수정합니다.</p>
          </div>
          <button type="button" onClick={() => void loadData()} className="admin-btn">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>
      </section>

      {notice && (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
          notice.tone === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-rose-200 bg-rose-50 text-rose-700'
        }`}>
          {notice.message}
        </div>
      )}

      <section className="admin-section px-5 py-4">
        <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">등록된 사업장</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{businessUnits.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">적용 규칙</p>
            <p className="mt-2 text-sm font-medium text-slate-700">삭제 대신 이름 수정으로 관리합니다.</p>
          </div>
        </div>
      </section>

      <SectionCard
        title="사업장 목록"
        description="입고와 출고에서 선택할 사업장을 관리합니다."
        placeholder="예: QA-T1"
        items={businessUnits}
        icon={<Building2 size={18} />}
        value={businessUnitName}
        loading={businessUnitSubmitting}
        editingId={editingBusinessUnitId}
        editValue={editingBusinessUnitName}
        savingId={savingBusinessUnitId}
        onChange={setBusinessUnitName}
        onSubmit={handleBusinessUnitSubmit}
        onEditStart={handleStartEditBusinessUnit}
        onEditChange={setEditingBusinessUnitName}
        onEditCancel={() => {
          setEditingBusinessUnitId(null);
          setEditingBusinessUnitName('');
        }}
        onSave={handleSaveBusinessUnit}
      />
    </div>
  );
}
