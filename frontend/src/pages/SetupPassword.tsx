import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Lock, UserRound } from 'lucide-react';
import api from '../api/axios';
import { completePasswordSetup, getDefaultRouteForRole, getStoredEmail, getStoredName, getStoredRole, INITIAL_ISSUED_PASSWORD } from '../utils/auth-session';
import { getErrorMessage } from '../utils/api-error';

const SetupPassword = () => {
  const navigate = useNavigate();
  const [name, setName] = useState(getStoredName());
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (name.trim().length === 0) {
      setError('이름을 입력해주세요.');
      return;
    }
    if (newPassword.trim().length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', { name, newPassword });
      localStorage.setItem('name', name.trim());
      completePasswordSetup();
      navigate(getDefaultRouteForRole(getStoredRole()));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">STK-ENG</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            초기 비밀번호 변경
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            첫 로그인입니다. 초기 비밀번호 {INITIAL_ISSUED_PASSWORD} 대신 앞으로 사용할 비밀번호를 설정하세요.
          </p>
          <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs leading-5 text-slate-500">
            로그인 계정: <span className="font-semibold text-slate-700">{getStoredEmail()}</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="setup-name" className="mb-2 block text-sm font-medium text-slate-700">이름</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <UserRound className="text-slate-400" size={18} />
              </div>
              <input
                id="setup-name"
                name="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="앞으로 사용할 이름"
                autoComplete="name"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="setup-new-password" className="mb-2 block text-sm font-medium text-slate-700">새 비밀번호</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Lock className="text-slate-400" size={18} />
              </div>
              <input
                id="setup-new-password"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="새 비밀번호 8자 이상"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="setup-confirm-password" className="mb-2 block text-sm font-medium text-slate-700">새 비밀번호 확인</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Lock className="text-slate-400" size={18} />
              </div>
              <input
                id="setup-confirm-password"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="새 비밀번호 다시 입력"
                autoComplete="new-password"
                required
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
                비밀번호 저장 <ArrowRight size={18} className="ml-2" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupPassword;
