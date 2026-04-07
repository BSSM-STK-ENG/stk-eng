'use client';

import { Loader2, Plus, Settings2, Shield, UserPlus } from 'lucide-react';
import type React from 'react';
import type { AdminCreateUserRequest, AdminPermissionOptionsResponse, Role } from '../../types/api';

interface UserCreateFormProps {
  form: AdminCreateUserRequest;
  submitting: boolean;
  showAdvancedSetup: boolean;
  permissionOptions: AdminPermissionOptionsResponse | null;
  onFormChange: (form: AdminCreateUserRequest) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onToggleAdvancedSetup: () => void;
  onOpenRoleProfileModal: () => void;
  getRoleProfiles: () => AdminPermissionOptionsResponse['roleProfiles'];
  getDefaultPresetKeyForRole: (role: AdminCreateUserRequest['role']) => string;
  getRoleProfile: (
    key: string | null | undefined,
  ) => AdminPermissionOptionsResponse['roleProfiles'][number] | undefined;
  emailInputRef: React.RefObject<HTMLInputElement | null>;
}

export function UserCreateForm({
  form,
  submitting,
  showAdvancedSetup,
  permissionOptions,
  onFormChange,
  onSubmit,
  onToggleAdvancedSetup,
  onOpenRoleProfileModal,
  getRoleProfiles,
  getDefaultPresetKeyForRole,
  getRoleProfile,
  emailInputRef,
}: UserCreateFormProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[180px_minmax(0,1fr)_200px_140px]">
        <div className="min-w-0">
          <label className="mb-2 block text-sm font-medium text-slate-700">이름</label>
          <input
            type="text"
            value={form.name ?? ''}
            onChange={(event) => onFormChange({ ...form, name: event.target.value })}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            placeholder="선택 입력"
            autoComplete="name"
          />
        </div>

        <div className="min-w-0">
          <label className="mb-2 block text-sm font-medium text-slate-700">이메일</label>
          <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-200">
            <UserPlus size={16} className="shrink-0 text-slate-400" />
            <input
              ref={emailInputRef}
              type="email"
              value={form.email}
              onChange={(event) => onFormChange({ ...form, email: event.target.value })}
              className="w-full bg-transparent text-sm text-slate-700 outline-none"
              placeholder="name@company.com"
              required
            />
          </div>
        </div>

        <div className="min-w-0">
          <label className="mb-2 block text-sm font-medium text-slate-700">권한 역할</label>
          <select
            value={form.roleProfileKey ?? 'USER'}
            onChange={(event) => {
              const roleProfileKey = event.target.value;
              const selectedRoleProfile = getRoleProfile(roleProfileKey);
              const nextRole = (selectedRoleProfile?.baseRole ?? 'USER') as Exclude<Role, 'SUPER_ADMIN'>;
              onFormChange({
                ...form,
                role: nextRole,
                roleProfileKey,
                permissionPreset: form.permissionPreset ?? getDefaultPresetKeyForRole(nextRole),
              });
            }}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            {getRoleProfiles().map((profile) => (
              <option key={profile.key} value={profile.key}>
                {profile.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="animate-spin" size={17} /> : <Shield size={17} />}
            계정 발급
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-2.5 py-1">첫 로그인 시 비밀번호 변경 필요</span>
          <span className="rounded-full bg-white px-2.5 py-1">첫 로그인 후 비밀번호 변경</span>
        </div>
        <button
          type="button"
          onClick={onToggleAdvancedSetup}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Settings2 size={14} />
          {showAdvancedSetup ? '고급 권한 숨기기' : '고급 권한 열기'}
        </button>
      </div>

      {showAdvancedSetup && (
        <div className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_200px_180px]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">발급 기본 프리셋</label>
            <select
              value={form.permissionPreset ?? 'VIEWER'}
              onChange={(event) => onFormChange({ ...form, permissionPreset: event.target.value })}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              {(permissionOptions?.presets ?? []).map((preset) => (
                <option key={preset.key} value={preset.key}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={onOpenRoleProfileModal}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Plus size={14} />
              권한 역할 관리
            </button>
          </div>
          <div className="flex items-end text-xs text-slate-500">
            페이지 조합은 사용자별 `페이지 권한` 버튼에서 저장합니다.
          </div>
        </div>
      )}
    </section>
  );
}
