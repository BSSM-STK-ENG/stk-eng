"use client";

import { BadgeCheck, CheckCheck, Copy } from 'lucide-react';
import { useState } from 'react';

export interface FlashMessage {
  kind: 'success' | 'error';
  title: string;
  description?: string;
  credentials?: {
    email: string;
    temporaryPassword: string;
  };
}

interface FlashBannerProps {
  flash: FlashMessage;
  onClipboardError?: (description: string) => void;
}

export function FlashBanner({ flash, onClipboardError }: FlashBannerProps) {
  const [copiedField, setCopiedField] = useState<'email' | 'credentials' | null>(null);

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
      onClipboardError?.('브라우저 권한을 확인해주세요.');
    }
  };

  return (
    <section
      className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
        flash.kind === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-rose-200 bg-rose-50 text-rose-700'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">{flash.title}</p>
          {flash.description && <p className="mt-1 text-sm">{flash.description}</p>}
        </div>
        {flash.kind === 'success' && <BadgeCheck size={18} className="shrink-0" />}
      </div>

      {flash.credentials && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-white/70 bg-white px-3 py-3 text-slate-700">
          <span className="text-sm font-medium">{flash.credentials.email}</span>
          <span className="text-sm font-medium">/ {flash.credentials.temporaryPassword}</span>
          <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
            <button
              type="button"
              onClick={() => void copyText(flash.credentials!.email, 'email')}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex-none"
            >
              {copiedField === 'email' ? <CheckCheck size={14} /> : <Copy size={14} />}
              {copiedField === 'email' ? '이메일 복사 완료' : '이메일 복사'}
            </button>
            <button
              type="button"
              onClick={() =>
                void copyText(
                  `이메일: ${flash.credentials!.email}\n초기 비밀번호: ${flash.credentials!.temporaryPassword}`,
                  'credentials',
                )
              }
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex-none"
            >
              {copiedField === 'credentials' ? <CheckCheck size={14} /> : <Copy size={14} />}
              {copiedField === 'credentials' ? '로그인 정보 복사 완료' : '로그인 정보 복사'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
