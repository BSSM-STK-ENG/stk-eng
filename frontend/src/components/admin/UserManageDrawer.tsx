"use client";

import { Loader2, RotateCcw, Settings2, Trash2, X } from 'lucide-react';
import type { AdminPermissionOptionsResponse, AdminUserSummary } from '../../types/api';
import { formatAppDateTime } from '../../utils/date-format';

const ROLE_LABELS: Record<AdminUserSummary['role'], string> = {
  USER: '일반 사용자',
  ADMIN: '관리자',
  SUPER_ADMIN: '슈퍼 어드민',
};

function formatDateTime(value: string | null) {
  if (!value) {
    return '방금 생성';
  }
  return formatAppDateTime(value);
}

function getUserStatus(user: AdminUserSummary) {
  if (!user.emailVerified) {
    return {
      label: '이메일 인증 대기',
      className: 'bg-slate-100 text-slate-700',
    };
  }

  if (user.passwordChangeRequired) {
    return {
      label: '초기 비밀번호 변경 필요',
      className: 'bg-slate-100 text-slate-700',
    };
  }

  return {
    label: '활성',
    className: 'bg-slate-900 text-white',
  };
}

interface UserManageDrawerProps {
  managingUser: AdminUserSummary;
  currentUserEmail: string | null;
  processingUserId: string | null;
  nameDrafts: Record<string, string>;
  permissionOptions: AdminPermissionOptionsResponse | null;
  onClose: () => void;
  onNameDraftChange: (userId: string, value: string) => void;
  onNameSave: (user: AdminUserSummary) => void;
  onRoleChange: (user: AdminUserSummary, roleProfileKey: string) => void;
  onOpenPermissionModal: (user: AdminUserSummary) => void;
  onResetPassword: (user: AdminUserSummary) => void;
  onDeleteUser: (user: AdminUserSummary) => void;
  getRoleProfiles: () => AdminPermissionOptionsResponse['roleProfiles'];
  resolvePresetLabel: (presetKey: string | null) => string;
}

export function UserManageDrawer({
  managingUser,
  currentUserEmail,
  processingUserId,
  nameDrafts,
  permissionOptions,
  onClose,
  onNameDraftChange,
  onNameSave,
  onRoleChange,
  onOpenPermissionModal,
  onResetPassword,
  onDeleteUser,
  getRoleProfiles,
}: UserManageDrawerProps) {
  const status = getUserStatus(managingUser);
  const isLocked = managingUser.role === 'SUPER_ADMIN' || managingUser.email === currentUserEmail;
  const isProcessing = processingUserId === managingUser.id;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/30 p-4 md:flex md:items-center md:justify-center">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:h-auto md:max-h-[92vh]">
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-4 md:px-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">사용자 관리</h3>
            <p className="mt-1 break-all text-sm text-slate-500">{managingUser.email}</p>
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
          <section className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="mb-2 block text-xs font-semibold text-slate-600">이름</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={nameDrafts[managingUser.id] ?? ''}
                  onChange={(event) => onNameDraftChange(managingUser.id, event.target.value)}
                  disabled={isProcessing}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                  placeholder="이름 입력"
                />
                <button
                  type="button"
                  onClick={() => onNameSave(managingUser)}
                  disabled={isProcessing}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  저장
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-600">상태</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                  {status.label}
                </span>
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {managingUser.roleLabel ?? ROLE_LABELS[managingUser.role]}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500">생성일 {formatDateTime(managingUser.createdAt)}</p>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="mb-2 block text-xs font-semibold text-slate-600">권한 역할</label>
              {managingUser.role === 'SUPER_ADMIN' ? (
                <div className="inline-flex min-h-10 items-center rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white">
                  {managingUser.roleLabel ?? ROLE_LABELS[managingUser.role]}
                </div>
              ) : (
                <select
                  value={managingUser.roleProfileKey ?? managingUser.role}
                  onChange={(event) => onRoleChange(managingUser, event.target.value)}
                  disabled={isProcessing}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  {getRoleProfiles().map((profile) => (
                    <option key={profile.key} value={profile.key}>
                      {profile.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-600">페이지 권한</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {permissionOptions?.presets.find((item) => item.key === managingUser.permissionPreset)?.label ??
                  managingUser.permissionPreset ??
                  '권한 미설정'}
              </p>
              <p className="mt-1 text-xs text-slate-500">{managingUser.pagePermissions.length}개 페이지 허용</p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => onOpenPermissionModal(managingUser)}
                  disabled={isProcessing}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Settings2 size={14} />
                  페이지 권한 설정
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            {isLocked ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                이 계정은 현재 로그인 계정이거나 슈퍼 어드민이어서 비밀번호 초기화와 삭제가 제한됩니다.
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onResetPassword(managingUser)}
                  disabled={isProcessing}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin" size={15} />
                  ) : (
                    <RotateCcw size={15} />
                  )}
                  초기 비밀번호 재설정
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteUser(managingUser)}
                  disabled={isProcessing}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={15} />
                  사용자 삭제
                </button>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
