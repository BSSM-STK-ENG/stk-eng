import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Loader2, MailCheck } from 'lucide-react';
import api from '../api/axios';
import type { EmailVerificationResponse } from '../types/api';
import { getErrorMessage } from '../utils/api-error';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<EmailVerificationResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('인증 토큰이 없습니다.');
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        const response = await api.get<EmailVerificationResponse>('/auth/verify-email', {
          params: { token },
        });
        setResult(response.data);
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setLoading(false);
      }
    };

    void verify();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">STK-ENG</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">이메일 인증</h1>
        </div>

        {loading ? (
          <div className="flex min-h-40 items-center justify-center text-slate-500">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : (
          <div className="space-y-5">
            <div
              className={`rounded-xl border p-4 text-sm ${
                error
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              }`}
            >
              <div className="flex items-start gap-3">
                {!error ? <MailCheck size={18} className="mt-0.5 shrink-0" /> : null}
                <div>
                  <p className="font-semibold">{error || result?.message}</p>
                  {!error && result?.email ? <p className="mt-1 break-all">{result.email}</p> : null}
                </div>
              </div>
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
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
