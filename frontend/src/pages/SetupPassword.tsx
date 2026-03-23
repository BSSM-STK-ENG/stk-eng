import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, Loader2, Lock } from 'lucide-react';
import api from '../api/axios';
import { completePasswordSetup, getDefaultRouteForRole, getStoredEmail, getStoredRole, INITIAL_ISSUED_PASSWORD } from '../utils/auth-session';
import { getErrorMessage } from '../utils/api-error';

const SetupPassword = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

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
      await api.post('/auth/change-password', { newPassword });
      completePasswordSetup();
      navigate(getDefaultRouteForRole(getStoredRole()));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-50/50 p-4">
      <div className="w-full max-w-md rounded-3xl border border-white bg-white/85 p-8 shadow-xl backdrop-blur-xl sm:p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <KeyRound size={22} />
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            초기 비밀번호 변경
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            첫 로그인입니다. 초기 비밀번호 {INITIAL_ISSUED_PASSWORD} 대신 앞으로 사용할 비밀번호를 설정하세요.
          </p>
          <p className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-left text-xs leading-5 text-slate-500">
            로그인 계정: <span className="font-semibold text-slate-700">{getStoredEmail()}</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="setup-new-password" className="mb-2 block text-sm font-semibold text-slate-700">새 비밀번호</label>
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                placeholder="새 비밀번호 8자 이상"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="setup-confirm-password" className="mb-2 block text-sm font-semibold text-slate-700">새 비밀번호 확인</label>
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                placeholder="새 비밀번호 다시 입력"
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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
