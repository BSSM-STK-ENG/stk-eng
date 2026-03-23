import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Mail, Lock, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { AuthResponse } from '../types/api';
import { getErrorMessage } from '../utils/api-error';
import { getDefaultRouteForRole, INITIAL_ISSUED_PASSWORD, saveAuthSession } from '../utils/auth-session';

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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-50/50 p-4">
            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white p-8 sm:p-10 transition-all">
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                        STK Inventory
                    </h1>
                    <p className="text-slate-500 font-medium">슈퍼 어드민이 발급한 계정으로 로그인하세요.</p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium flex items-center">
                        <span className="mr-2">⚠️</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700 mb-2">이메일</label>
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
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-slate-700 font-medium"
                                placeholder="name@company.com"
                                autoComplete="username"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700 mb-2">비밀번호</label>
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
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-slate-700 font-medium"
                                placeholder="••••••••"
                                autoComplete="current-password"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:-translate-y-0.5"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                로그인 <ArrowRight size={18} className="ml-2" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/75 p-4 text-left text-sm text-slate-600">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                            <ShieldCheck size={18} />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-700">계정은 슈퍼 어드민이 발급합니다.</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                발급 계정의 초기 비밀번호는 <span className="font-semibold text-slate-700">{INITIAL_ISSUED_PASSWORD}</span> 입니다. 첫 로그인 후에는 원하는 비밀번호로 바로 변경해야 합니다.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
