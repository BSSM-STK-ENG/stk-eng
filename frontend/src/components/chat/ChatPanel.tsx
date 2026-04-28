import {
  Bot,
  ChevronRight,
  Database,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  Package,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type {
  AiPreferences,
  ChatMessage,
  CredentialConnectionTestResponse,
  ProviderCredential,
  ProviderDescriptor,
  ProviderType,
  QuickSearchMaterial,
  QuickSearchResult,
  ToolTrace,
} from '../../types/chat';
import { DEFAULT_PROVIDER_CATALOG } from './chatDefaults';
import type { ChatWorkspaceState } from './useChatWorkspace';
import { useChatWorkspace } from './useChatWorkspace';

interface ChatPanelProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  width: number;
  onPreferencesChange?: (next: AiPreferences) => void;
  workspace?: ChatWorkspaceState;
}

type ChatPanelViewProps = ChatPanelProps & {
  workspace: ChatWorkspaceState;
};

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

const QUICK_ACTIONS = [
  {
    key: 'search',
    label: '재고 검색',
    icon: Search,
    path: null,
    focusSearch: true,
    color: 'bg-blue-50 text-blue-600 border-blue-100',
  },
  {
    key: 'low-stock',
    label: '안전재고 확인',
    icon: ShieldCheck,
    path: '/stock/current?scope=LOW',
    focusSearch: false,
    color: 'bg-amber-50 text-amber-600 border-amber-100',
  },
  {
    key: 'inbound',
    label: '입고 현황',
    icon: Package,
    path: '/inbound',
    focusSearch: false,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  },
  {
    key: 'outbound',
    label: '출고 현황',
    icon: ChevronRight,
    path: '/outbound',
    focusSearch: false,
    color: 'bg-violet-50 text-violet-600 border-violet-100',
  },
  {
    key: 'closing',
    label: '월마감 확인',
    icon: Database,
    path: '/closing',
    focusSearch: false,
    color: 'bg-rose-50 text-rose-600 border-rose-100',
  },
] as const;

const SLASH_COMMANDS = [
  { command: '/search', description: '빠른 검색 — 자재/거래/마감 검색', prefix: '/search ' },
  { command: '/stock', description: '재고 현황 페이지로 이동', prefix: '/stock' },
  { command: '/inbound', description: '입고 현황 페이지로 이동', prefix: '/inbound' },
  { command: '/outbound', description: '출고 현황 페이지로 이동', prefix: '/outbound' },
  { command: '/close', description: '월마감 확인 페이지로 이동', prefix: '/close' },
  { command: '/help', description: '사용 가능한 명령어 보기', prefix: '/help' },
] as const;

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

function ProviderBadge({ provider, label, active }: { provider: ProviderType; label: string; active?: boolean }) {
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
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-400">
          {toolLabel(trace)}
        </span>
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

function ConsentModal({
  open,
  title,
  description,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" aria-label="확인 취소" onClick={onCancel} />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-[10002] w-full max-w-sm overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]"
      >
        <div className="px-6 py-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <ShieldCheck size={24} className="text-blue-600" />
          </div>
          <h3 className="text-lg font-black text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="chat-focus-ring flex-1 rounded-[18px] border border-slate-200 px-4 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="chat-focus-ring flex-1 rounded-[18px] bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            실행
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function QuickSearchBar({
  query,
  onChange,
  onSearch,
  onClear,
  loading,
  results,
  error,
  onMaterialClick,
  searchInputRef,
}: {
  query: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  loading: boolean;
  results: QuickSearchResult | null;
  error: string | null;
  onMaterialClick: (material: QuickSearchMaterial) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              onSearch();
            }
          }}
          placeholder="자재명, 코드, 거래내역 검색..."
          className="chat-focus-ring w-full rounded-[18px] border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-slate-700 shadow-sm placeholder:text-slate-300"
        />
        {query && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="검색 초기화"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-[16px] border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm font-medium text-blue-700">
          <LoaderCircle size={14} className="animate-spin" />
          검색 중...
        </div>
      )}

      {error && (
        <div className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {results && !loading && (
        <div className="space-y-2">
          {results.materials.length > 0 && (
            <div className="space-y-1.5">
              <p className="px-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                자재 ({results.materials.length})
              </p>
              {results.materials.slice(0, 5).map((material) => (
                <button
                  key={material.materialCode}
                  type="button"
                  onClick={() => onMaterialClick(material)}
                  className="chat-focus-ring w-full rounded-[16px] border border-slate-200 bg-white px-3.5 py-2.5 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800">{material.materialName}</p>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {material.materialCode}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] font-medium text-slate-500">
                    {material.location && <span>{material.location}</span>}
                    {material.currentStockQty !== null && <span>현재 {material.currentStockQty.toLocaleString()}</span>}
                    {material.safeStockQty !== null && (
                      <span
                        className={
                          material.currentStockQty !== null &&
                          material.safeStockQty !== null &&
                          material.currentStockQty < material.safeStockQty
                            ? 'text-rose-600'
                            : ''
                        }
                      >
                        안전 {material.safeStockQty.toLocaleString()}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.recentTransactions.length > 0 && (
            <div className="space-y-1.5">
              <p className="px-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                최근 거래 ({results.recentTransactions.length})
              </p>
              {results.recentTransactions.slice(0, 3).map((tx) => (
                <div key={tx.id} className="rounded-[16px] border border-slate-200 bg-white px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-800">{tx.materialCode}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tx.transactionType === 'IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}
                    >
                      {tx.transactionType === 'IN'
                        ? '입고'
                        : tx.transactionType === 'OUT'
                          ? '출고'
                          : tx.transactionType}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">
                    {tx.quantity.toLocaleString()} · {tx.transactionDate}
                  </p>
                </div>
              ))}
            </div>
          )}

          {results.currentClosing && (
            <div className="rounded-[16px] border border-slate-200 bg-white px-3.5 py-2.5">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">월마감 상태</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">{results.currentClosing.closingMonth}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${results.currentClosing.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                >
                  {results.currentClosing.status === 'CLOSED' ? '마감 완료' : '미마감'}
                </span>
              </div>
            </div>
          )}

          {results.materials.length === 0 && results.recentTransactions.length === 0 && !results.currentClosing && (
            <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuickActionHub({ onAction }: { onAction: (action: (typeof QUICK_ACTIONS)[number]) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.key}
            type="button"
            onClick={() => onAction(action)}
            className={`chat-focus-ring group flex flex-col items-center gap-2 rounded-[18px] border px-3 py-3 text-center transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] ${action.color}`}
          >
            <Icon size={18} className="shrink-0 transition group-hover:scale-110" />
            <span className="text-[11px] font-bold leading-tight">{action.label}</span>
          </button>
        );
      })}
    </div>
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
        <div
          className={`mb-2 flex items-center gap-2 text-[11px] font-bold ${isUser ? 'justify-end text-blue-100' : 'text-slate-400'}`}
        >
          {!isUser && <Bot size={12} />}
          <span>{isUser ? '내 질문' : 'AI'}</span>
          {isUser && <MessageCircle size={12} />}
          {message.status === 'pending' && <LoaderCircle size={12} className="animate-spin" />}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
      </div>

      {!isUser && message.toolTrace && message.toolTrace.length > 0 && (
        <div className="w-full max-w-[88%] space-y-2">
          {message.toolTrace.map((trace) => (
            <TraceDisclosure key={`${message.id}-${trace.kind}-${trace.title}-${trace.summary}`} trace={trace} />
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
  const activeProvider =
    providers.find((item) => item.provider === settings.provider) ?? getProviderFallback(settings.provider);
  const activeModels =
    activeProvider.models.length > 0 ? activeProvider.models : getProviderFallback(activeProvider.provider).models;
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
      <button type="button" className="absolute inset-0" aria-label="설정 닫기" onClick={onClose} />
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
                  {activeCredential?.hasKey ? (activeCredential?.maskedKey ?? '등록됨') : '미등록'}
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
                <p className="mt-2 text-xs leading-5 text-slate-500">provider별 접근 가능한 모델만 저장됩니다.</p>
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
                  <div
                    className={`rounded-[18px] border px-4 py-3 text-sm font-medium ${testResult?.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
                  >
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
  onCommand,
}: {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  onStop: () => void;
  disabled: boolean;
  loading: boolean;
  hasKey: boolean;
  onCommand: (command: string) => void;
}) {
  const [showCommands, setShowCommands] = useState(false);
  const [commandFilter, setCommandFilter] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const filteredCommands = useMemo(() => {
    if (!commandFilter) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(
      (cmd) => cmd.command.startsWith(commandFilter) || cmd.description.includes(commandFilter),
    );
  }, [commandFilter]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (value.startsWith('/')) {
        const trimmed = value.trim();
        if (
          trimmed === '/help' ||
          trimmed === '/stock' ||
          trimmed === '/inbound' ||
          trimmed === '/outbound' ||
          trimmed === '/close'
        ) {
          onCommand(trimmed);
          onChange('');
          setShowCommands(false);
          setCommandFilter('');
          return;
        }
        if (trimmed.startsWith('/search ')) {
          onCommand(trimmed);
          onChange('');
          setShowCommands(false);
          setCommandFilter('');
          return;
        }
      }
      if (hasKey) {
        onSend();
      }
    }
  };

  const handleChange = (nextValue: string) => {
    onChange(nextValue);
    if (nextValue.startsWith('/')) {
      setShowCommands(true);
      setCommandFilter(nextValue.split(' ')[0] ?? '');
    } else {
      setShowCommands(false);
      setCommandFilter('');
    }
  };

  const handleCommandSelect = (cmd: (typeof SLASH_COMMANDS)[number]) => {
    if (cmd.command === '/search') {
      onChange('/search ');
      setShowCommands(false);
      setCommandFilter('');
      textareaRef.current?.focus();
    } else {
      onCommand(cmd.command);
      onChange('');
      setShowCommands(false);
      setCommandFilter('');
    }
  };

  return (
    <div className="relative">
      {showCommands && filteredCommands.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.12)]">
          {filteredCommands.map((cmd) => (
            <button
              key={cmd.command}
              type="button"
              onClick={() => handleCommandSelect(cmd)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-blue-50"
            >
              <span className="text-sm font-bold text-blue-600">{cmd.command}</span>
              <span className="text-xs text-slate-500">{cmd.description}</span>
            </button>
          ))}
        </div>
      )}
      <div className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-3">
        <div className="flex gap-3">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => handleChange(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder={
              hasKey
                ? '재고 내용을 질문하세요 ( / 명령어 사용 가능)'
                : '상단 ... 메뉴의 설정에서 모델과 API 키를 연결하세요'
            }
            className="chat-focus-ring chat-scrollbar min-h-[72px] flex-1 resize-none rounded-[18px] border border-transparent bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm placeholder:text-slate-300"
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
    </div>
  );
}

function ChatPanelView({
  mobileOpen,
  onCloseMobile,
  collapsed,
  onToggleCollapse,
  width,
  onPreferencesChange,
  workspace,
}: ChatPanelViewProps) {
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [consentModal, setConsentModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
    onCancel: () => {},
  });
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
  const messageCount = workspace.messages.length;

  const updateSettings = (next: SettingsState) => {
    workspace.clearNotices();
    setSettings(next);
  };

  useEffect(() => {
    if (messageCount === 0) {
      return;
    }
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
  }, [messageCount]);

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
    await workspace.testCredential(settings);
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

  const requestConsent = useCallback((title: string, description: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConsentModal({
        open: true,
        title,
        description,
        onConfirm: () => {
          setConsentModal((prev) => ({ ...prev, open: false }));
          resolve(true);
        },
        onCancel: () => {
          setConsentModal((prev) => ({ ...prev, open: false }));
          resolve(false);
        },
      });
    });
  }, []);

  const handleQuickAction = useCallback(
    async (action: (typeof QUICK_ACTIONS)[number]) => {
      if (action.focusSearch) {
        searchInputRef.current?.focus();
        return;
      }
      if (action.path) {
        const confirmed = await requestConsent('페이지 이동', `${action.label} 페이지로 이동하시겠습니까?`);
        if (!confirmed) return;
        navigate(action.path);
      }
    },
    [navigate, requestConsent],
  );

  const handleCommand = useCallback(
    (command: string) => {
      if (command === '/stock') {
        navigate('/stock/current');
      } else if (command === '/inbound') {
        navigate('/inbound');
      } else if (command === '/outbound') {
        navigate('/outbound');
      } else if (command === '/close') {
        navigate('/closing');
      } else if (command === '/help') {
        workspace.setComposerValue(
          '/help — 사용 가능한 명령어:\n/search <검색어> — 빠른 검색\n/stock — 재고 현황\n/inbound — 입고 현황\n/outbound — 출고 현황\n/close — 월마감 확인',
        );
      } else if (command.startsWith('/search ')) {
        const query = command.replace('/search ', '').trim();
        if (query) {
          workspace.executeQuickSearch(query);
        }
      }
    },
    [navigate, workspace],
  );

  const handleMaterialClick = useCallback(
    (material: QuickSearchMaterial) => {
      navigate(`/stock/current?q=${encodeURIComponent(material.materialCode)}`);
    },
    [navigate],
  );

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
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">AI 질의</p>
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
        {/* Quick Search Bar */}
        <div className="mb-3">
          <QuickSearchBar
            query={workspace.quickSearchQuery}
            onChange={workspace.setQuickSearchQuery}
            onSearch={() => workspace.executeQuickSearch()}
            onClear={workspace.clearQuickSearch}
            loading={workspace.quickSearchLoading}
            results={workspace.quickSearchResults}
            error={workspace.quickSearchError}
            onMaterialClick={handleMaterialClick}
            searchInputRef={searchInputRef}
          />
        </div>

        {/* Quick Action Hub */}
        <div className="mb-3">
          <p className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">빠른 실행</p>
          <QuickActionHub onAction={handleQuickAction} />
        </div>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-[0_10px_32px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">현재 대화</p>
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
              onCommand={handleCommand}
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
        testResult={workspace.credentialTestResult}
        onSave={() => void handleSaveSettings()}
        onTest={() => void handleTestCredential()}
        onDelete={() => void handleDeleteCredential()}
        error={workspace.requestState.error}
        info={workspace.requestState.info}
        testing={workspace.requestState.testingCredential}
        saving={workspace.requestState.savingSettings}
        deleting={workspace.requestState.deletingCredential}
      />

      <ConsentModal
        open={consentModal.open}
        title={consentModal.title}
        description={consentModal.description}
        onConfirm={consentModal.onConfirm}
        onCancel={consentModal.onCancel}
      />
    </div>
  );

  const renderCollapsedRail = () => (
    <div className="flex h-full items-start justify-center px-1.5 py-4">
      <div className="flex flex-col items-center gap-3 rounded-[24px] border border-blue-100/80 bg-white/88 px-2 py-2.5 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="chat-focus-ring flex h-10 w-10 items-center justify-center rounded-[16px] bg-blue-600 text-white shadow-[0_14px_34px_rgba(37,99,235,0.24)]"
          aria-label="채팅 패널 펼치기"
        >
          <MessageCircle size={16} />
        </button>

        <div className="flex flex-col items-center gap-1">
          <span className={`h-2.5 w-2.5 rounded-full ${hasActiveKey ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="text-[10px] font-black tracking-[0.08em] text-slate-500">AI</span>
          <span className="text-[10px] font-semibold text-slate-400">열기</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden min-h-0 flex-col transition-[width] duration-200 ease-out lg:flex ${
          collapsed
            ? 'bg-transparent shadow-none'
            : 'border-l border-slate-200/80 bg-white/96 shadow-[0_24px_60px_rgba(15,23,42,0.08)]'
        }`}
        style={{ width }}
        aria-label="채팅 패널"
      >
        {collapsed ? renderCollapsedRail() : renderExpandedPanel('desktop')}
      </aside>

      <div
        className={`fixed inset-0 z-[60] lg:hidden ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          aria-label="채팅 패널 닫기"
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

function ChatPanelWithWorkspace(props: ChatPanelProps) {
  const workspace = useChatWorkspace();
  return <ChatPanelView {...props} workspace={workspace} />;
}

export default function ChatPanel(props: ChatPanelProps) {
  if (props.workspace) {
    return <ChatPanelView {...props} workspace={props.workspace} />;
  }

  return <ChatPanelWithWorkspace {...props} />;
}
