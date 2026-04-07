'use client';

import { Loader2, Settings2 } from 'lucide-react';
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

interface UserListTableProps {
  users: AdminUserSummary[];
  loading: boolean;
  currentUserEmail: string | null;
  permissionOptions: AdminPermissionOptionsResponse | null;
  onManage: (userId: string) => void;
}

export function UserListTable({ users, loading, currentUserEmail, permissionOptions, onManage }: UserListTableProps) {
  const resolvePresetLabel = (presetKey: string | null) =>
    permissionOptions?.presets.find((item) => item.key === presetKey)?.label ?? presetKey ?? '권한 미설정';

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">사용자 목록</h3>
          <p className="mt-1 text-sm text-slate-500">총 {users.length}개 계정</p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-56 items-center justify-center text-slate-400">
          <Loader2 className="animate-spin" size={22} />
        </div>
      ) : users.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-slate-700">아직 등록된 사용자가 없습니다.</p>
          <p className="mt-1 text-sm text-slate-500">위에서 첫 계정을 발급하세요.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {users.map((user) => {
            const locked = user.role === 'SUPER_ADMIN' || user.email === currentUserEmail;
            const status = getUserStatus(user);

            return (
              <article key={user.id} className="px-4 py-4 md:px-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{user.name?.trim() || '이름 없음'}</p>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {user.roleLabel ?? ROLE_LABELS[user.role]}
                      </span>
                      {user.email === currentUserEmail && (
                        <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                          현재 로그인
                        </span>
                      )}
                    </div>
                    <p className="mt-2 break-all text-sm text-slate-500">{user.email}</p>
                    <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-3">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="font-semibold text-slate-700">권한 프리셋</p>
                        <p className="mt-1">{resolvePresetLabel(user.permissionPreset)}</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="font-semibold text-slate-700">허용 페이지</p>
                        <p className="mt-1">{user.pagePermissions.length}개 페이지</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="font-semibold text-slate-700">생성일</p>
                        <p className="mt-1">{formatDateTime(user.createdAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 xl:self-start">
                    <button
                      type="button"
                      onClick={() => onManage(user.id)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Settings2 size={14} />
                      관리
                    </button>
                    {locked && (
                      <span className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-400">
                        관리 고정
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
