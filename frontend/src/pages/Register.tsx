import { ArrowRight, Loader2, Lock, Mail, UserRound } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import type { RegisterResponse } from '../types/api';
import { getErrorMessage } from '../utils/api-error';

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<RegisterResponse | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<RegisterResponse>('/auth/register', { name, email, password });
      setSuccess(response.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">STK-ENG</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">회원가입</h1>
          <p className="mt-2 text-sm text-slate-500">이메일 인증 후 기본 권한으로 바로 로그인할 수 있습니다.</p>
        </div>

        {success ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-semibold">{success.message}</p>
              <p className="mt-1 break-all">{success.email}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              로그인으로 이동
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                {error}
              </div>
            ) : null}

            <div>
              <label htmlFor="register-name" className="mb-2 block text-sm font-medium text-slate-700">
                이름
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <UserRound size={18} className="text-slate-400" />
                </div>
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="이름 입력"
                  autoComplete="name"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-email" className="mb-2 block text-sm font-medium text-slate-700">
                이메일
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Mail size={18} className="text-slate-400" />
                </div>
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  autoComplete="username"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-password" className="mb-2 block text-sm font-medium text-slate-700">
                비밀번호
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock size={18} className="text-slate-400" />
                </div>
                <input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="8자 이상 입력"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-confirm-password" className="mb-2 block text-sm font-medium text-slate-700">
                비밀번호 확인
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock size={18} className="text-slate-400" />
                </div>
                <input
                  id="register-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="비밀번호를 다시 입력"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : '인증 메일 받기'}
            </button>

            <div className="text-sm text-slate-500">
              이미 계정이 있다면{' '}
              <Link to="/login" className="font-semibold text-slate-900 hover:underline">
                로그인
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Register;
