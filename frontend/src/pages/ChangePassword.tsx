import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, Loader2, Lock } from 'lucide-react';
import api from '../api/axios';
import { getErrorMessage } from '../utils/api-error';
import { getDefaultRouteForRole, getStoredEmail, getStoredRole } from '../utils/auth-session';

const ChangePassword = () => {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!currentPassword.trim()) {
      setError('현재 비밀번호를 입력해주세요.');
      return;
    }
    if (newPassword.trim().length < 8) {
      setError('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      navigate(getDefaultRouteForRole(getStoredRole()));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-1 pb-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">계정 설정</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">비밀번호 변경</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              현재 비밀번호를 확인한 뒤 새 비밀번호로 교체합니다. 변경 후에는 새 비밀번호로 로그인하세요.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            로그인 계정
            <p className="mt-1 font-semibold text-slate-700">{getStoredEmail()}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <KeyRound size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">새 비밀번호 설정</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              8자 이상으로 설정하고, 현재 비밀번호와 다른 값을 사용하세요.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="change-current-password" className="mb-2 block text-sm font-medium text-slate-700">현재 비밀번호</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Lock className="text-slate-400" size={18} />
              </div>
              <input
                id="change-current-password"
                name="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="현재 비밀번호 입력"
                autoComplete="current-password"
              />
            </div>
          </div>

          <div>
            <label htmlFor="change-new-password" className="mb-2 block text-sm font-medium text-slate-700">새 비밀번호</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Lock className="text-slate-400" size={18} />
              </div>
              <input
                id="change-new-password"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="새 비밀번호 8자 이상"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div>
            <label htmlFor="change-confirm-password" className="mb-2 block text-sm font-medium text-slate-700">새 비밀번호 확인</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Lock className="text-slate-400" size={18} />
              </div>
              <input
                id="change-confirm-password"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="새 비밀번호 다시 입력"
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                비밀번호 변경 <ArrowRight size={18} className="ml-2" />
              </>
            )}
          </button>
        </form>
      </section>
    </div>
  );
};

export default ChangePassword;
