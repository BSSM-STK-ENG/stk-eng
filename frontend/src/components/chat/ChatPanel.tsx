import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bot,
  ChevronRight,
  Database,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  Send,
  Settings,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { DEFAULT_PROVIDER_CATALOG } from './chatDefaults';
import { useChatWorkspace } from './useChatWorkspace';
import type {
  AiPreferences,
  ChatMessage,
  CredentialConnectionTestResponse,
  ProviderCredential,
  ProviderDescriptor,
  ProviderType,
  ToolTrace,
} from '../../types/chat';

interface ChatPanelProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  width: number;
  onPreferencesChange?: (next: AiPreferences) => void;
}

interface SettingsState {
  provider: ProviderType;
  model: string;
  apiKey: string;
  chatPanelEnabled: boolean;
}

const QUICK_PROMPTS = [
  '어제 들어온 물자가 얼마나 있지?',
  '현재 재고가 안전재고보다 낮은 자재를 알려줘.',
  '사업장별 입고 합계를 정리해줘.',
  '이번 달 월마감 상태를 요약해줘.',
];

const PROVIDER_ICONS: Record<string, string> = {
  openai: 'O',
  anthropic: 'C',
  google: 'G',
};

function formatTimestamp(value?: string) {
  if (!value) {
    return '';
  }
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '아직 없음';
  }
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getProviderLabel(provider: ProviderType, providers: ProviderDescriptor[]) {
  return providers.find((item) => item.provider === provider)?.label ?? provider;
}

function getProviderModels(provider: ProviderType, providers: ProviderDescriptor[]) {
  return providers.find((item) => item.provider === provider)?.models ?? [];
}

function getProviderFallback(provider: ProviderType) {
  return (
    DEFAULT_PROVIDER_CATALOG.find((item) => item.provider === provider) ?? {
      provider,
      label: String(provider),
      description: '기본 모델 카탈로그',
      models: [],
    }
  );
}

function toolLabel(tool: ToolTrace) {
  if (tool.kind === 'sql') {
    return 'SQL';
  }
  if (tool.kind === 'inventory') {
    return '재고 근거';
  }
  return tool.title;
}

function getCredentialPresentation(credential?: ProviderCredential) {
  if (!credential?.hasKey) {
    return {
      label: '키 필요',
      tone: 'bg-amber-50 text-amber-700',
      detail: 'API 키를 저장하고 연결 확인이 필요합니다.',
    };
  }

  if (credential.validationStatus === 'success') {
    return {
      label: '연결 확인됨',
      tone: 'bg-emerald-50 text-emerald-700',
      detail: credential.validationMessage ?? '최근 연결 확인이 성공했습니다.',
    };
  }

  if (credential.validationStatus === 'failed') {
    return {
      label: '재연결 필요',
      tone: 'bg-rose-50 text-rose-700',
      detail: credential.validationMessage ?? '저장된 키의 연결 확인이 실패했습니다.',
    };
  }

  return {
    label: '키 저장됨',
    tone: 'bg-blue-50 text-blue-700',
    detail: '키는 저장되어 있지만 최근 연결 확인 기록이 없습니다.',
  };
}

function ProviderBadge({
  provider,
  label,
  active,
}: {
  provider: ProviderType;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex h-9 w-9 items-center justify-center rounded-2xl text-xs font-black ${
        active ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
      }`}
      aria-hidden="true"
    >
      {PROVIDER_ICONS[provider] ?? provider.slice(0, 1).toUpperCase() ?? label.slice(0, 1).toUpperCase()}
    </div>
  );
}

function TraceDisclosure({ trace }: { trace: ToolTrace }) {
  return (
    <details className="group rounded-2xl border border-slate-200 bg-slate-50/90">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-[12px] font-semibold text-slate-600">
        <Database size={13} />
        <span>조회 근거 보기</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-400">{toolLabel(trace)}</span>
        {trace.rowCount !== undefined && (
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-400">
            {trace.rowCount} rows
          </span>
        )}
        <span className="ml-auto text-[11px] text-slate-400 transition group-open:rotate-90">
          <ChevronRight size={14} />
        </span>
      </summary>
      <div className="space-y-3 border-t border-slate-200/80 px-3 py-3 text-sm text-slate-600">
        <p className="leading-6">{trace.summary}</p>
        {trace.sourceViews && trace.sourceViews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {trace.sourceViews.map((view) => (
              <span key={view} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                {view}
              </span>
            ))}
          </div>
        )}
        {trace.sql && (
          <pre className="chat-scrollbar max-h-44 overflow-auto rounded-2xl bg-slate-950 px-3 py-2 text-[11px] leading-5 text-slate-50">
            {trace.sql}
          </pre>
        )}
      </div>
    </details>
  );
}

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const bubbleTone = isUser
    ? 'bg-blue-600 text-white'
    : message.status === 'error'
      ? 'border border-rose-200 bg-rose-50 text-rose-700'
      : 'border border-slate-200 bg-white text-slate-700';

  return (
    <article
      data-testid={`message-${message.role}-${message.id}`}
      data-message-role={message.role}
      className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}
    >
      <div className={`max-w-[88%] rounded-[22px] px-4 py-3 shadow-sm ${bubbleTone}`}>
        <div className={`mb-2 flex items-center gap-2 text-[11px] font-bold ${isUser ? 'justify-end text-blue-100' : 'text-slate-400'}`}>
          {!isUser && <Bot size={12} />}
          <span>{isUser ? '내 질문' : 'AI'}</span>
          {isUser && <MessageCircle size={12} />}
          {message.status === 'pending' && <LoaderCircle size={12} className="animate-spin" />}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
      </div>

      {!isUser && message.toolTrace && message.toolTrace.length > 0 && (
        <div className="w-full max-w-[88%] space-y-2">
          {message.toolTrace.map((trace, index) => (
            <TraceDisclosure key={`${message.id}-trace-${index}`} trace={trace} />
          ))}
        </div>
      )}

      <span className={`px-1 text-[11px] font-medium text-slate-400 ${isUser ? 'text-right' : 'text-left'}`}>
        {formatTimestamp(message.createdAt)}
      </span>
    </article>
  );
}

function SettingsModal({
  open,
  onClose,
  providers,
  settings,
  setSettings,
  credentials,
  testResult,
  onSave,
  onTest,
  onDelete,
  error,
  info,
  testing,
  saving,
  deleting,
}: {
  open: boolean;
  onClose: () => void;
  providers: ProviderDescriptor[];
  settings: SettingsState;
  setSettings: (next: SettingsState) => void;
  credentials: Record<string, ProviderCredential>;
  testResult: CredentialConnectionTestResponse | null;
  onSave: () => void;
  onTest: () => void;
  onDelete: () => void;
  error: string | null;
  info: string | null;
  testing: boolean;
  saving: boolean;
  deleting: boolean;
}) {
  const activeProvider = providers.find((item) => item.provider === settings.provider) ?? getProviderFallback(settings.provider);
  const activeModels = activeProvider.models.length > 0 ? activeProvider.models : getProviderFallback(activeProvider.provider).models;
  const activeCredential = credentials[settings.provider];
  const credentialMeta = getCredentialPresentation(activeCredential);
  const canSave = Boolean(settings.apiKey.trim() || activeCredential?.hasKey || settings.chatPanelEnabled === false);
  const isCurrentTestResult = testResult?.provider === settings.provider && testResult?.model === settings.model;

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!activeModels.some((model) => model.id === settings.model)) {
      setSettings({
        ...settings,
        model: activeModels[0]?.id ?? settings.model,
      });
    }
  }, [activeModels, open, setSettings, settings]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-sm md:items-center">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="설정 닫기"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="AI 설정"
        className="relative z-[10000] w-full max-w-3xl overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]"
      >
        <header className="flex items-start justify-between border-b border-slate-200/80 bg-slate-50/80 px-5 py-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">AI settings</p>
            <h3 className="mt-1 text-xl font-black text-slate-900">모델과 API 키 설정</h3>
            <p className="mt-1 text-sm text-slate-500">한 번 저장하면 이후 채팅은 이 기본값을 자동으로 사용합니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="chat-focus-ring rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50"
            aria-label="설정 닫기"
          >
            <X size={18} />
          </button>
        </header>

        <div className="grid gap-0 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] p-4 lg:border-b-0 lg:border-r">
            <div className="space-y-2">
              {providers.map((provider) => {
                const active = provider.provider === settings.provider;
                const credential = credentials[provider.provider];
                return (
                  <button
                    key={provider.provider}
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        provider: provider.provider,
                        model: provider.models[0]?.id ?? settings.model,
                      })
                    }
                    className={`chat-focus-ring w-full rounded-[20px] border px-3 py-3 text-left transition ${
                      active
                        ? 'border-blue-200 bg-white shadow-sm'
                        : 'border-transparent bg-transparent hover:bg-white/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ProviderBadge provider={provider.provider} label={provider.label} active={active} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-slate-900">{provider.label}</p>
                        <p className="truncate text-xs text-slate-500">{provider.description ?? '모델 카탈로그'}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span>{credential?.hasKey ? '연결됨' : '키 필요'}</span>
                      <span>{provider.models.length} models</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="grid gap-5 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Provider</span>
                <select
                  value={settings.provider}
                  onChange={(event) => {
                    const provider = event.target.value;
                    const nextModels = getProviderModels(provider, providers);
                    setSettings({
                      ...settings,
                      provider,
                      model: nextModels[0]?.id ?? settings.model,
                    });
                  }}
                  className="chat-focus-ring rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  {providers.map((provider) => (
                    <option key={provider.provider} value={provider.provider}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Model</span>
                <select
                  value={settings.model}
                  onChange={(event) => setSettings({ ...settings, model: event.target.value })}
                  className="chat-focus-ring rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  {activeModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">API Key</span>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(event) => setSettings({ ...settings, apiKey: event.target.value })}
                placeholder="비워두면 기존 키를 유지합니다"
                className="chat-focus-ring rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 placeholder:text-slate-300"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">저장된 자격증명</p>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  {activeCredential?.hasKey
                    ? activeCredential?.maskedKey ?? '등록됨'
                    : '미등록'}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{credentialMeta.detail}</p>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">연결 상태</p>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  {isCurrentTestResult
                    ? testResult?.success
                      ? '방금 연결 확인 완료'
                      : '연결 확인 실패'
                    : credentialMeta.label}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {isCurrentTestResult
                    ? `${testResult?.message} · ${formatDateTime(testResult?.checkedAt)}`
                    : activeCredential?.validatedAt
                      ? `${formatDateTime(activeCredential.validatedAt)} 기준`
                      : '아직 연결 확인 기록이 없습니다.'}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">저장 동작</p>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  {settings.apiKey.trim() ? '연결 확인 후 저장' : '기존 키 유지 + 기본 모델 저장'}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  새 키를 입력하면 저장 시 서버가 실제 provider 연결을 검증합니다.
                </p>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">선택된 모델</p>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  {activeModels.find((model) => model.id === settings.model)?.name ?? settings.model}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  provider별 접근 가능한 모델만 저장됩니다.
                </p>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">패널 표시</p>
                  <p className="text-sm font-bold text-slate-800">AI 채팅 패널 표시</p>
                  <p className="text-xs leading-5 text-slate-500">
                    필요 없는 사용자는 채팅 패널과 모바일 버튼을 완전히 숨길 수 있습니다.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.chatPanelEnabled}
                  aria-label="AI 채팅 패널 표시"
                  onClick={() => setSettings({ ...settings, chatPanelEnabled: !settings.chatPanelEnabled })}
                  className={`chat-focus-ring inline-flex h-8 w-14 items-center rounded-full border px-1 transition ${
                    settings.chatPanelEnabled
                      ? 'border-blue-200 bg-blue-600 justify-end'
                      : 'border-slate-200 bg-slate-300 justify-start'
                  }`}
                >
                  <span className="h-6 w-6 rounded-full bg-white shadow-sm" />
                </button>
              </div>
            </div>

            {(error || info || isCurrentTestResult) && (
              <div className="space-y-2">
                {error && (
                  <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    {error}
                  </div>
                )}
                {!error && isCurrentTestResult && (
                  <div className={`rounded-[18px] border px-4 py-3 text-sm font-medium ${testResult?.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                    {testResult?.message}
                  </div>
                )}
                {!error && info && (
                  <div className="rounded-[18px] border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                    {info}
                  </div>
                )}
              </div>
            )}

            <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting || !activeCredential?.hasKey}
                className="chat-focus-ring rounded-[18px] border border-rose-200 px-4 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? '삭제 중...' : '현재 provider 키 삭제'}
              </button>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onTest}
                  disabled={testing || !settings.apiKey.trim()}
                  className="chat-focus-ring inline-flex items-center justify-center gap-2 rounded-[18px] border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {testing && <LoaderCircle size={15} className="animate-spin" />}
                  연결 확인
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="chat-focus-ring rounded-[18px] border border-slate-200 px-4 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving || testing || !canSave}
                  className="chat-focus-ring inline-flex items-center justify-center gap-2 rounded-[18px] bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {saving && <LoaderCircle size={15} className="animate-spin" />}
                  저장
                </button>
              </div>
            </footer>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function EmptyPromptState({
  missingKey,
  providerLabel,
  onPromptClick,
}: {
  missingKey: boolean;
  providerLabel: string;
  onPromptClick: (prompt: string) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-5 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-blue-600 text-white shadow-[0_14px_40px_rgba(37,99,235,0.22)]">
        <Sparkles size={24} />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-black text-slate-900">재고 내용을 바로 물어보세요</h3>
        <p className="text-sm leading-6 text-slate-500">
          {missingKey
            ? `${providerLabel} API 키를 연결하면 바로 재고 질의를 시작할 수 있습니다. 상단 메뉴의 설정에서 연결하세요.`
            : '입고량, 재고 부족, 월마감 상태 같은 질문을 한 번에 답합니다.'}
        </p>
      </div>

      <div className="grid w-full gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPromptClick(prompt)}
            disabled={missingKey}
            className="chat-focus-ring rounded-[18px] border border-blue-100 bg-blue-50/80 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  onStop,
  disabled,
  loading,
  hasKey,
}: {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  onStop: () => void;
  disabled: boolean;
  loading: boolean;
  hasKey: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-3">
      <div className="flex gap-3">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (hasKey) {
                onSend();
              }
            }
          }}
          rows={2}
          placeholder={hasKey ? '재고 내용을 질문하세요' : '상단 ... 메뉴의 설정에서 모델과 API 키를 연결하세요'}
          className="chat-focus-ring chat-scrollbar min-h-[72px] flex-1 resize-none rounded-[18px] border border-transparent bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm"
        />
        <div className="flex flex-col justify-end gap-2">
          {loading ? (
            <button
              type="button"
              onClick={onStop}
              className="chat-focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-800"
              aria-label="응답 중단"
            >
              <Square size={16} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={disabled || !hasKey}
              className="chat-focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              aria-label="메시지 전송"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPanel({
  mobileOpen,
  onCloseMobile,
  collapsed,
  onToggleCollapse,
  width,
  onPreferencesChange,
}: ChatPanelProps) {
  const workspace = useChatWorkspace();
  const listRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connectionFeedback, setConnectionFeedback] = useState<CredentialConnectionTestResponse | null>(null);
  const [settings, setSettings] = useState<SettingsState>({
    provider: workspace.draft.provider,
    model: workspace.draft.model,
    apiKey: '',
    chatPanelEnabled: workspace.preferences?.chatPanelEnabled ?? false,
  });

  const activeCredential = workspace.credentials[workspace.draft.provider];
  const activeProviderLabel = useMemo(
    () => getProviderLabel(workspace.draft.provider, workspace.providers),
    [workspace.draft.provider, workspace.providers],
  );
  const activeCredentialMeta = getCredentialPresentation(activeCredential);
  const hasActiveKey = Boolean(activeCredential?.hasKey);

  const updateSettings = (next: SettingsState) => {
    setConnectionFeedback(null);
    workspace.clearNotices();
    setSettings(next);
  };

  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) {
      return;
    }
    if (typeof listElement.scrollTo === 'function') {
      listElement.scrollTo({
        top: listElement.scrollHeight,
        behavior: 'smooth',
      });
      return;
    }
    listElement.scrollTop = listElement.scrollHeight;
  }, [workspace.messages]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [menuOpen]);

  const syncSettingsState = () => {
    updateSettings({
      provider: workspace.draft.provider,
      model: workspace.draft.model,
      apiKey: '',
      chatPanelEnabled: workspace.preferences?.chatPanelEnabled ?? false,
    });
  };

  const handleOpenSettings = () => {
    workspace.clearNotices();
    syncSettingsState();
    setMenuOpen(false);
    setSettingsOpen(true);
  };

  const handleTestCredential = async () => {
    const result = await workspace.testCredential(settings);
    setConnectionFeedback(result);
  };

  const handleSaveSettings = async () => {
    const saved = await workspace.applySettings(settings);
    if (!saved) {
      return;
    }
    onPreferencesChange?.(saved);
    updateSettings({ ...settings, apiKey: '' });
    setSettingsOpen(false);
  };

  const handleDeleteCredential = async () => {
    await workspace.removeCredential(settings.provider);
    updateSettings({ ...settings, apiKey: '' });
  };

  const handleSend = async (prompt?: string) => {
    if (!hasActiveKey) {
      return;
    }
    await workspace.sendMessage(prompt);
  };

  const handleResetConversation = () => {
    workspace.resetConversation();
    setMenuOpen(false);
  };

  const handlePanelAction = () => {
    setMenuOpen(false);
    if (mobileOpen) {
      onCloseMobile();
      return;
    }
    onToggleCollapse();
  };

  const renderExpandedPanel = (mode: 'desktop' | 'mobile') => (
    <div className="flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_22%,#f8fafc_100%)]">
      <header className="border-b border-slate-200/80 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[20px] bg-blue-600 text-white shadow-[0_14px_34px_rgba(37,99,235,0.24)]">
                <Bot size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">AI Chat</p>
                <h2 className="truncate text-lg font-black text-slate-900">재고 질의</h2>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <span className={`rounded-full px-2.5 py-1 ${activeCredentialMeta.tone}`}>
                {activeCredentialMeta.label}
              </span>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{activeProviderLabel}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500">{workspace.draft.model}</span>
            </div>
          </div>

          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="chat-focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
              aria-label="채팅 메뉴"
            >
              <MoreHorizontal size={18} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-30 min-w-[190px] overflow-hidden rounded-[20px] border border-slate-200 bg-white p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.14)]">
                <button
                  type="button"
                  onClick={handleOpenSettings}
                  className="chat-focus-ring flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Settings size={16} />
                  설정
                </button>
                <button
                  type="button"
                  onClick={handleResetConversation}
                  className="chat-focus-ring flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Trash2 size={16} />
                  대화 초기화
                </button>
                <button
                  type="button"
                  onClick={handlePanelAction}
                  className="chat-focus-ring flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {mode === 'mobile' ? <X size={16} /> : <ChevronRight size={16} />}
                  {mode === 'mobile' ? '패널 닫기' : '패널 접기'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-[0_10px_32px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Conversation</p>
            <h3 className="mt-1 text-sm font-black text-slate-900">
              {workspace.runtimeSessionId ? '현재 대화' : '새 대화'}
            </h3>
          </div>

          <div ref={listRef} className="chat-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
            {workspace.requestState.bootstrapping ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                  <LoaderCircle size={16} className="animate-spin" />
                  설정을 불러오는 중입니다
                </div>
              </div>
            ) : workspace.messages.length > 0 ? (
              workspace.messages.map((message) => <ChatMessageBubble key={message.id} message={message} />)
            ) : (
              <EmptyPromptState
                missingKey={!hasActiveKey}
                providerLabel={activeProviderLabel}
                onPromptClick={(prompt) => void handleSend(prompt)}
              />
            )}
          </div>

          <div className="space-y-3 border-t border-slate-100 p-3">
            {workspace.requestState.error && (
              <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {workspace.requestState.error}
              </div>
            )}
            {workspace.requestState.info && (
              <div className="rounded-[18px] border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                {workspace.requestState.info}
              </div>
            )}
            <Composer
              value={workspace.composerValue}
              onChange={workspace.setComposerValue}
              onSend={() => void handleSend()}
              onStop={workspace.stopResponse}
              disabled={!workspace.composerValue.trim() || workspace.requestState.sendingMessage}
              loading={workspace.requestState.sendingMessage}
              hasKey={hasActiveKey}
            />
          </div>
        </section>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        providers={workspace.providers}
        settings={settings}
        setSettings={updateSettings}
        credentials={workspace.credentials}
        testResult={connectionFeedback}
        onSave={() => void handleSaveSettings()}
        onTest={() => void handleTestCredential()}
        onDelete={() => void handleDeleteCredential()}
        error={workspace.requestState.error}
        info={workspace.requestState.info}
        testing={workspace.requestState.testingCredential}
        saving={workspace.requestState.savingSettings}
        deleting={workspace.requestState.deletingCredential}
      />
    </div>
  );

  const renderCollapsedRail = () => (
    <div className="flex h-full flex-col items-center justify-between gap-4 px-3 py-4">
      <button
        type="button"
        onClick={onToggleCollapse}
        className="chat-focus-ring flex h-12 w-12 items-center justify-center rounded-[20px] bg-blue-600 text-white shadow-[0_14px_34px_rgba(37,99,235,0.24)]"
        aria-label="채팅 패널 펼치기"
      >
        <MessageCircle size={18} />
      </button>

      <div className="flex flex-col items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${hasActiveKey ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 [writing-mode:vertical-rl]">
          AI
        </span>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className="hidden min-h-0 flex-col border-l border-slate-200/80 bg-white/96 shadow-[0_24px_60px_rgba(15,23,42,0.08)] transition-[width] duration-200 ease-out lg:flex"
        style={{ width }}
        aria-label="채팅 패널"
      >
        {collapsed ? renderCollapsedRail() : renderExpandedPanel('desktop')}
      </aside>

      <div className={`fixed inset-0 z-[60] lg:hidden ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!mobileOpen}>
        <div
          className={`absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onCloseMobile}
        />
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-[430px] border-l border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.24)] transition-transform duration-300 ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {mobileOpen ? renderExpandedPanel('mobile') : null}
        </div>
      </div>

    </>
  );
}
