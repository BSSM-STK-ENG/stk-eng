import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BadgeCheck, CheckCheck, Copy, KeyRound, Loader2, RefreshCw, Shield, UserPlus, X } from 'lucide-react';
import api from '../api/axios';
import { AdminCreateUserRequest, AdminCreatedUserResponse, AdminUserSummary } from '../types/api';
import { getErrorMessage } from '../utils/api-error';
import { INITIAL_ISSUED_PASSWORD } from '../utils/auth-session';

const ROLE_OPTIONS: Array<AdminCreateUserRequest['role']> = ['USER', 'ADMIN'];

function formatDateTime(value: string | null) {
  if (!value) {
    return '방금 생성';
  }
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

const AdminAccounts = () => {
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<AdminCreatedUserResponse | null>(null);
  const [copiedField, setCopiedField] = useState<'email' | 'credentials' | null>(null);
  const [form, setForm] = useState<AdminCreateUserRequest>({
    email: '',
    role: 'USER',
  });

  const copyText = async (text: string, field: 'email' | 'credentials') => {
    const fallbackCopy = () => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy();
      }
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1800);
    } catch {
      setError('클립보드 복사에 실패했습니다. 브라우저 권한을 확인해주세요.');
    }
  };

  const stats = useMemo(() => ({
    total: users.length,
    pending: users.filter((user) => user.passwordChangeRequired).length,
    admins: users.filter((user) => user.role !== 'USER').length,
  }), [users]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<AdminUserSummary[]>('/admin/users');
      setUsers(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleChange = <K extends keyof AdminCreateUserRequest>(key: K, value: AdminCreateUserRequest[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess(null);

    setSubmitting(true);
    try {
      const response = await api.post<AdminCreatedUserResponse>('/admin/users', form);
      setSuccess(response.data);
      setForm({
        email: '',
        role: form.role,
      });
      setCopiedField(null);
      await loadUsers();
      window.setTimeout(() => emailInputRef.current?.focus(), 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 px-1 pb-4">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/50 to-indigo-50/70 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              Super Admin
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">계정 발급 센터</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              공개 회원가입 대신 여기서 계정을 발급합니다. 발급받은 사용자는 첫 로그인 직후 원하는 비밀번호로 변경해야만 시스템을 사용할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
          >
            <RefreshCw size={16} />
            목록 새로고침
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white bg-white/85 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">전체 계정</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-white bg-white/85 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">초기 설정 대기</p>
            <p className="mt-2 text-2xl font-extrabold text-amber-600">{stats.pending}</p>
          </div>
          <div className="rounded-2xl border border-white bg-white/85 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">관리 권한 계정</p>
            <p className="mt-2 text-2xl font-extrabold text-blue-700">{stats.admins}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">새 계정 발급</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                이메일과 권한만 정하면 바로 발급됩니다.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-bold">
                    <BadgeCheck size={16} />
                    계정 발급 완료
                  </div>
                  <p className="mt-2">이메일: <span className="font-semibold">{success.email}</span></p>
                  <p className="mt-1">초기 비밀번호: <span className="font-semibold">{success.temporaryPassword}</span></p>
                  <p className="mt-2 text-xs text-emerald-700">
                    발급받은 사용자는 {INITIAL_ISSUED_PASSWORD}로 로그인한 뒤 첫 화면에서 비밀번호를 직접 변경해야 합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccess(null)}
                  className="rounded-xl p-2 text-emerald-500 transition hover:bg-emerald-100"
                  aria-label="발급 완료 카드 닫기"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyText(success.email, 'email')}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                >
                  {copiedField === 'email' ? <CheckCheck size={14} /> : <Copy size={14} />}
                  {copiedField === 'email' ? '이메일 복사 완료' : '이메일 복사'}
                </button>
                <button
                  type="button"
                  onClick={() => void copyText(`이메일: ${success.email}\n초기 비밀번호: ${success.temporaryPassword}`, 'credentials')}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                >
                  {copiedField === 'credentials' ? <CheckCheck size={14} /> : <Copy size={14} />}
                  {copiedField === 'credentials' ? '자격 정보 복사 완료' : '로그인 정보 복사'}
                </button>
                <button
                  type="button"
                  onClick={() => emailInputRef.current?.focus()}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                >
                  다음 계정 계속 발급
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">이메일</label>
              <input
                ref={emailInputRef}
                type="email"
                value={form.email}
                onChange={(event) => handleChange('email', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
                placeholder="name@company.com"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">권한</label>
              <div className="grid grid-cols-2 gap-3">
                {ROLE_OPTIONS.map((role) => {
                  const active = form.role === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleChange('role', role)}
                      className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                        active
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-700'
                      }`}
                    >
                      {role === 'ADMIN' ? '관리자' : '일반 사용자'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                  <KeyRound size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">초기 비밀번호는 고정입니다.</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    발급되는 모든 계정은 <span className="font-semibold text-slate-700">{INITIAL_ISSUED_PASSWORD}</span> 로 시작합니다.
                    첫 로그인 후에는 바로 새 비밀번호를 설정해야 합니다.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <Shield size={18} />}
              계정 발급
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">발급된 계정</h3>
              <p className="mt-1 text-sm text-slate-500">현재 시스템에서 사용할 수 있는 계정 목록입니다.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center text-slate-400">
              <Loader2 className="animate-spin" size={22} />
            </div>
          ) : users.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 text-center">
              <p className="text-sm font-semibold text-slate-600">아직 발급된 계정이 없습니다.</p>
              <p className="mt-2 text-xs text-slate-400">왼쪽 카드에서 첫 계정을 만들어주세요.</p>
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200">
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  <div className="grid grid-cols-[minmax(0,1.3fr)_140px_140px_140px] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    <span>이메일</span>
                    <span>권한</span>
                    <span>상태</span>
                    <span>생성일</span>
                  </div>
                    <div className="divide-y divide-slate-100">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className={`grid grid-cols-[minmax(0,1.3fr)_140px_140px_140px] gap-3 px-5 py-4 text-sm text-slate-600 transition ${
                            success?.email === user.email ? 'bg-emerald-50/70' : ''
                          }`}
                        >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{user.email}</p>
                        </div>
                        <div>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                            user.role === 'USER' ? 'bg-slate-100 text-slate-600' : user.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'
                          }`}>
                            {user.role === 'USER' ? '사용자' : user.role === 'ADMIN' ? '관리자' : '슈퍼 어드민'}
                          </span>
                        </div>
                        <div>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                            user.passwordChangeRequired ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {user.passwordChangeRequired ? '초기 설정 대기' : '활성'}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-slate-500">
                          {formatDateTime(user.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminAccounts;
