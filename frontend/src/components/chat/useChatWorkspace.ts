import { useCallback, useEffect, useRef, useState } from 'react';
import { sendQuickSearch } from '../../api/chat';
import type {
  AiPreferences,
  ChatMessage,
  CredentialConnectionTestResponse,
  ProviderCredential,
  ProviderDescriptor,
  ProviderType,
  QuickSearchResult,
} from '../../types/chat';
import { generateBrowserGemmaResponse, getBrowserGemmaStatus } from './browserGemma';
import { DEFAULT_PROVIDER_CATALOG } from './chatDefaults';

type ChatDraft = {
  provider: ProviderType;
  model: string;
};

type SettingsPayload = {
  provider: ProviderType;
  model: string;
};

type RequestState = {
  bootstrapping: boolean;
  sendingMessage: boolean;
  testingCredential: boolean;
  savingSettings: boolean;
  deletingCredential: boolean;
  error: string | null;
  info: string | null;
};

const GEMMA_PROVIDER: ProviderDescriptor = DEFAULT_PROVIDER_CATALOG.find(
  (provider) => provider.provider === 'gemma',
) ?? {
  provider: 'gemma',
  label: 'Gemma 4',
  description: 'API 키 없이 브라우저에서 내장 Gemma 4를 실행합니다.',
  models: [
    {
      id: 'gemma4',
      name: 'Gemma 4',
      provider: 'gemma',
      recommended: true,
      description: 'API 키 없이 브라우저에서 실행되는 기본 모델',
    },
  ],
};
const GEMMA_MODEL = GEMMA_PROVIDER.models[0]?.id ?? 'gemma4';
const GEMMA_CATALOG = [GEMMA_PROVIDER];
const GEMMA_PREFERENCES: AiPreferences = {
  provider: GEMMA_PROVIDER.provider,
  model: GEMMA_MODEL,
  chatPanelEnabled: true,
};
const GEMMA_DRAFT: ChatDraft = {
  provider: GEMMA_PREFERENCES.provider,
  model: GEMMA_PREFERENCES.model,
};

function nowIso() {
  return new Date().toISOString();
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function createTempId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getGemmaModel(model: string) {
  return GEMMA_PROVIDER.models.some((candidate) => candidate.id === model) ? model : GEMMA_MODEL;
}

function createGemmaCredential(): ProviderCredential {
  return {
    provider: GEMMA_PROVIDER.provider,
    hasKey: true,
    maskedKey: '브라우저 내장',
    status: 'verified',
    validationStatus: 'success',
    validationMessage: 'API 키 없이 브라우저에서 Gemma 4를 실행합니다.',
    validatedAt: null,
  };
}

export type ChatWorkspaceState = {
  providers: ProviderDescriptor[];
  credentials: Record<string, ProviderCredential>;
  preferences: AiPreferences | null;
  draft: ChatDraft;
  messages: ChatMessage[];
  runtimeSessionId: string | null;
  composerValue: string;
  requestState: RequestState;
  credentialTestResult: CredentialConnectionTestResponse | null;
  quickSearchQuery: string;
  quickSearchResults: QuickSearchResult | null;
  quickSearchLoading: boolean;
  quickSearchError: string | null;
  setComposerValue: (value: string) => void;
  setQuickSearchQuery: (value: string) => void;
  refreshMetadata: () => Promise<void>;
  testCredential: (
    payload: SettingsPayload,
  ) => Promise<
    | CredentialConnectionTestResponse
    | { success: false; provider: ProviderType; model: string; message: string; checkedAt: string }
  >;
  sendMessage: (overrideText?: string) => Promise<unknown>;
  stopResponse: () => void;
  resetConversation: (infoMessage?: string) => void;
  applySettings: (payload: SettingsPayload) => Promise<AiPreferences | null>;
  removeCredential: (provider: ProviderType) => Promise<void>;
  clearNotices: () => void;
  executeQuickSearch: (query?: string) => Promise<void>;
  clearQuickSearch: () => void;
};

export function useChatWorkspace(): ChatWorkspaceState {
  const abortRef = useRef<AbortController | null>(null);
  const quickSearchAbortRef = useRef<AbortController | null>(null);
  const [providers, setProviders] = useState<ProviderDescriptor[]>(GEMMA_CATALOG);
  const [credentials, setCredentials] = useState<Record<string, ProviderCredential>>({
    [GEMMA_PROVIDER.provider]: createGemmaCredential(),
  });
  const [preferences, setPreferences] = useState<AiPreferences | null>(GEMMA_PREFERENCES);
  const [draft, setDraft] = useState<ChatDraft>(GEMMA_DRAFT);
  const [runtimeSessionId, setRuntimeSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composerValue, setComposerValue] = useState('');
  const [credentialTestResult, setCredentialTestResult] = useState<CredentialConnectionTestResponse | null>(null);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [quickSearchResults, setQuickSearchResults] = useState<QuickSearchResult | null>(null);
  const [quickSearchLoading, setQuickSearchLoading] = useState(false);
  const [quickSearchError, setQuickSearchError] = useState<string | null>(null);
  const [requestState, setRequestState] = useState<RequestState>({
    bootstrapping: false,
    sendingMessage: false,
    testingCredential: false,
    savingSettings: false,
    deletingCredential: false,
    error: null,
    info: null,
  });

  const refreshMetadata = useCallback(async () => {
    setProviders(GEMMA_CATALOG);
    setCredentials({ [GEMMA_PROVIDER.provider]: createGemmaCredential() });
    setPreferences(GEMMA_PREFERENCES);
    setDraft(GEMMA_DRAFT);
    setCredentialTestResult(null);
    setRequestState((current) => ({ ...current, bootstrapping: false, error: null }));
  }, []);

  const testCredential = useCallback(async (payload: SettingsPayload) => {
    const selectedModel = getGemmaModel(payload.model);
    setRequestState((current) => ({ ...current, testingCredential: true, error: null, info: null }));
    try {
      if (!getBrowserGemmaStatus()) {
        throw new Error('Gemma 4 브라우저 실행은 WebGPU를 지원하는 Chrome/Edge 데스크톱 브라우저가 필요합니다.');
      }
      const result = {
        success: true,
        provider: GEMMA_PROVIDER.provider,
        model: selectedModel,
        message: 'API 키 없이 브라우저에서 Gemma 4를 실행할 수 있습니다.',
        checkedAt: nowIso(),
      } as const;
      setCredentialTestResult(result);
      setRequestState((current) => ({ ...current, info: result.message }));
      return result;
    } catch (error) {
      const message = toErrorMessage(error, '브라우저 Gemma 4 실행 확인에 실패했습니다.');
      const failedResult = {
        success: false,
        provider: GEMMA_PROVIDER.provider,
        model: selectedModel,
        message,
        checkedAt: nowIso(),
      } as const;
      setCredentialTestResult(failedResult);
      setRequestState((current) => ({ ...current, error: message }));
      return failedResult;
    } finally {
      setRequestState((current) => ({ ...current, testingCredential: false }));
    }
  }, []);

  const applySettings = useCallback(async (payload: SettingsPayload) => {
    const nextPreferences: AiPreferences = {
      provider: GEMMA_PROVIDER.provider,
      model: getGemmaModel(payload.model),
      chatPanelEnabled: true,
    };

    setRequestState((current) => ({ ...current, savingSettings: true, error: null, info: null }));
    try {
      setCredentials({ [GEMMA_PROVIDER.provider]: createGemmaCredential() });
      setPreferences(nextPreferences);
      setDraft({ provider: nextPreferences.provider, model: nextPreferences.model });
      setRequestState((current) => ({ ...current, info: '기본 Gemma 4 설정을 적용했습니다.' }));
      return nextPreferences;
    } finally {
      setRequestState((current) => ({ ...current, savingSettings: false }));
    }
  }, []);

  const removeCredential = useCallback(async (provider: ProviderType) => {
    setRequestState((current) => ({
      ...current,
      deletingCredential: false,
      error: null,
      info: `${provider}는 삭제할 API 키 없이 브라우저에서 실행됩니다.`,
    }));
  }, []);

  const clearNotices = useCallback(() => {
    setRequestState((current) => ({
      ...current,
      error: null,
      info: null,
    }));
  }, []);

  const executeQuickSearch = useCallback(
    async (query?: string) => {
      const searchTerm = (query ?? quickSearchQuery).trim();
      if (!searchTerm) {
        return;
      }
      if (query !== undefined) {
        setQuickSearchQuery(searchTerm);
      }

      quickSearchAbortRef.current?.abort();
      const controller = new AbortController();
      quickSearchAbortRef.current = controller;

      setQuickSearchLoading(true);
      setQuickSearchError(null);
      setQuickSearchResults(null);

      try {
        const result = await sendQuickSearch(searchTerm, controller.signal);
        if (quickSearchAbortRef.current !== controller) {
          return;
        }
        if (!result) {
          throw new Error('검색 결과를 불러오지 못했습니다.');
        }
        setQuickSearchResults(result);
      } catch (error) {
        if (controller.signal.aborted || quickSearchAbortRef.current !== controller) {
          return;
        }
        setQuickSearchError(error instanceof Error ? error.message : '검색에 실패했습니다.');
      } finally {
        if (quickSearchAbortRef.current === controller) {
          setQuickSearchLoading(false);
          quickSearchAbortRef.current = null;
        }
      }
    },
    [quickSearchQuery],
  );

  const clearQuickSearch = useCallback(() => {
    quickSearchAbortRef.current?.abort();
    quickSearchAbortRef.current = null;
    setQuickSearchQuery('');
    setQuickSearchResults(null);
    setQuickSearchError(null);
    setQuickSearchLoading(false);
  }, []);

  const resetConversation = useCallback((infoMessage = '대화를 초기화했습니다.') => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRuntimeSessionId(null);
    setMessages([]);
    setComposerValue('');
    setRequestState((current) => ({
      ...current,
      sendingMessage: false,
      error: null,
      info: infoMessage,
    }));
  }, []);

  const stopResponse = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRequestState((current) => ({
      ...current,
      sendingMessage: false,
      info: '응답 생성을 중단했습니다.',
    }));
  }, []);

  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const messageText = (overrideText ?? composerValue).trim();
      if (!messageText || requestState.sendingMessage) {
        return null;
      }

      const activeModel = getGemmaModel(draft.model);
      const optimisticUserMessage: ChatMessage = {
        id: createTempId('user'),
        sessionId: runtimeSessionId ?? 'runtime',
        role: 'user',
        content: messageText,
        createdAt: nowIso(),
        status: 'sent',
      };
      const optimisticAssistantMessage: ChatMessage = {
        id: createTempId('assistant'),
        sessionId: runtimeSessionId ?? 'runtime',
        role: 'assistant',
        content: '답변을 정리하고 있습니다.',
        createdAt: nowIso(),
        status: 'pending',
      };

      setRequestState((current) => ({ ...current, sendingMessage: true, error: null, info: null }));
      setMessages((current) => [...current, optimisticUserMessage, optimisticAssistantMessage]);
      setComposerValue('');

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const browserAnswer = await generateBrowserGemmaResponse(messageText);
        if (controller.signal.aborted) {
          setMessages((current) => current.filter((item) => item.id !== optimisticAssistantMessage.id));
          setRequestState((current) => ({ ...current, sendingMessage: false }));
          return null;
        }

        const nextSessionId = runtimeSessionId ?? createTempId('browser-session');
        const assistantMessage: ChatMessage = {
          ...optimisticAssistantMessage,
          sessionId: nextSessionId,
          content: browserAnswer,
          status: 'sent',
        };

        setRuntimeSessionId(nextSessionId);
        setMessages((current) =>
          current.map((item) =>
            item.id === optimisticAssistantMessage.id
              ? assistantMessage
              : item.id === optimisticUserMessage.id
                ? { ...item, sessionId: nextSessionId }
                : item,
          ),
        );
        setRequestState((current) => ({ ...current, sendingMessage: false }));
        return {
          assistantMessage,
          sessionId: nextSessionId,
          messageId: assistantMessage.id,
          provider: GEMMA_PROVIDER.provider,
          model: activeModel,
        };
      } catch (error) {
        if (controller.signal.aborted) {
          setMessages((current) => current.filter((item) => item.id !== optimisticAssistantMessage.id));
          setRequestState((current) => ({ ...current, sendingMessage: false }));
          return null;
        }

        setMessages((current) =>
          current.map((item) =>
            item.id === optimisticAssistantMessage.id
              ? { ...item, content: 'Gemma 4 응답 생성 실패', status: 'error' }
              : item,
          ),
        );
        setRequestState((current) => ({
          ...current,
          sendingMessage: false,
          error: toErrorMessage(error, '메시지를 전송하지 못했습니다.'),
        }));
        return null;
      } finally {
        abortRef.current = null;
      }
    },
    [composerValue, draft.model, requestState.sendingMessage, runtimeSessionId],
  );

  useEffect(() => {
    void refreshMetadata();
  }, [refreshMetadata]);

  return {
    providers,
    credentials,
    preferences,
    draft,
    messages,
    runtimeSessionId,
    composerValue,
    requestState,
    credentialTestResult,
    quickSearchQuery,
    quickSearchResults,
    quickSearchLoading,
    quickSearchError,
    setComposerValue,
    setQuickSearchQuery,
    refreshMetadata,
    testCredential,
    sendMessage,
    stopResponse,
    resetConversation,
    applySettings,
    removeCredential,
    clearNotices,
    executeQuickSearch,
    clearQuickSearch,
  };
}
