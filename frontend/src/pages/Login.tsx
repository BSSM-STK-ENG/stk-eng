import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { AuthResponse } from '../types/api';
import { getErrorMessage } from '../utils/api-error';
import { getDefaultRouteForRole, saveAuthSession } from '../utils/auth-session';

const Login = () => {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await api.post<AuthResponse>('/auth/login', { email, password });
            saveAuthSession(response.data);
            navigate(response.data.passwordChangeRequired ? '/setup-password' : getDefaultRouteForRole(response.data.role));
        } catch (err) {
            const message = getErrorMessage(err);
            setError(/^\d+$/.test(message) ? '로그인에 실패했습니다. 이메일 또는 비밀번호를 확인해주세요.' : message);
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
                        로그인
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">이메일 인증을 마친 계정으로 로그인하세요.</p>
                </div>

                {error && (
                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-2">이메일</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="text-slate-400" size={18} />
                            </div>
                            <input
                                id="login-email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-700"
                                placeholder="name@company.com"
                                autoComplete="username"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-2">비밀번호</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="text-slate-400" size={18} />
                            </div>
                            <input
                                id="login-password"
                                name="password"
                                type="password"
                                value={password}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-700"
                                placeholder="••••••••"
                                autoComplete="current-password"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                로그인 <ArrowRight size={18} className="ml-2" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    계정이 없다면{' '}
                    <Link to="/register" className="font-semibold text-slate-900 hover:underline">
                        회원가입
                    </Link>
                    을 진행하고, 가입 후 권한 변경은 슈퍼 어드민이 관리합니다.
                </div>
            </div>
        </div>
    );
};

export default Login;
