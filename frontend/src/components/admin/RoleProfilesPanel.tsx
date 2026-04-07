"use client";

import { Loader2, Plus, Trash2, X } from 'lucide-react';
import type { AdminCreateRoleProfileRequest, AdminPermissionOptionsResponse, Role } from '../../types/api';

const ROLE_OPTIONS: Array<AdminCreateRoleProfileRequest['baseRole']> = ['USER', 'ADMIN'];

const ROLE_LABELS: Record<string, string> = {
  USER: '일반 사용자',
  ADMIN: '관리자',
  SUPER_ADMIN: '슈퍼 어드민',
};

interface RoleProfilesPanelProps {
  permissionOptions: AdminPermissionOptionsResponse | null;
  roleProfileForm: AdminCreateRoleProfileRequest;
  roleProfileSubmitting: boolean;
  roleProfileProcessingKey: string | null;
  onClose: () => void;
  onRoleProfileFormChange: (form: AdminCreateRoleProfileRequest) => void;
  onCreateRoleProfile: () => void;
  onDeleteRoleProfile: (roleProfileKey: string) => void;
}

export function RoleProfilesPanel({
  permissionOptions,
  roleProfileForm,
  roleProfileSubmitting,
  roleProfileProcessingKey,
  onClose,
  onRoleProfileFormChange,
  onCreateRoleProfile,
  onDeleteRoleProfile,
}: RoleProfilesPanelProps) {
  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/30 p-4 md:flex md:items-center md:justify-center">
      <div className="mx-auto flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:h-auto md:max-h-[90vh]">
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-4 md:px-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">권한 역할 관리</h3>
            <p className="mt-1 text-sm text-slate-500">
              원하는 이름의 역할을 만들고 기준 권한을 연결할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 md:px-5">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">역할 이름</label>
                <input
                  type="text"
                  value={roleProfileForm.label}
                  onChange={(event) => onRoleProfileFormChange({ ...roleProfileForm, label: event.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="예: 현장 출고 담당"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">기준 권한</label>
                <select
                  value={roleProfileForm.baseRole}
                  onChange={(event) =>
                    onRoleProfileFormChange({
                      ...roleProfileForm,
                      baseRole: event.target.value as Exclude<Role, 'SUPER_ADMIN'>,
                    })
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="mb-2 block text-xs font-semibold text-slate-600">설명</label>
              <input
                type="text"
                value={roleProfileForm.description ?? ''}
                onChange={(event) =>
                  onRoleProfileFormChange({ ...roleProfileForm, description: event.target.value })
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="어떤 사용자에게 쓰는 역할인지"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onCreateRoleProfile}
                disabled={roleProfileSubmitting}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {roleProfileSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                역할 저장
              </button>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">역할 목록</p>
                <p className="mt-1 text-xs text-slate-500">
                  기본 역할은 삭제할 수 없고, 사용자 정의 역할만 삭제할 수 있습니다.
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {(permissionOptions?.roleProfiles ?? []).map((profile) => (
                <div key={profile.key} className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{profile.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{profile.description || '설명 없음'}</p>
                    </div>
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {ROLE_LABELS[profile.baseRole]}
                    </span>
                  </div>
                  <div className="mt-3 flex justify-end">
                    {profile.systemProfile ? (
                      <span className="text-xs font-medium text-slate-400">기본 역할</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onDeleteRoleProfile(profile.key)}
                        disabled={roleProfileProcessingKey === profile.key}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {roleProfileProcessingKey === profile.key ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
