import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteChatCredential,
  getAiPreferences,
  getChatCredentials,
  getChatModels,
  getChatProviders,
  saveAiPreferences,
  saveChatCredential,
  sendChatMessage,
  testChatCredential,
} from '../../api/chat';
import { DEFAULT_PROVIDER_CATALOG, getFallbackProvider, getFallbackProviderModels } from './chatDefaults';
import type {
  AiPreferences,
  ChatContextMode,
  ChatMessage,
  CredentialConnectionTestResponse,
  ModelDescriptor,
  ProviderCredential,
  ProviderDescriptor,
  ProviderType,
} from '../../types/chat';

type ChatDraft = {
  provider: ProviderType;
  model: string;
};

type SettingsPayload = {
  provider: ProviderType;
  model: string;
  apiKey: string;
  chatPanelEnabled: boolean;
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

const INVENTORY_CONTEXT_MODE: ChatContextMode = 'inventory';

function nowIso() {
  return new Date().toISOString();
}

function toErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const record = error as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };
    const responseMessage = record.response?.data?.message ?? record.response?.data?.error;
    if (responseMessage) {
      return responseMessage;
    }
    if (record.message) {
      return record.message;
    }
  }

  return fallback;
}

function createTempId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function firstModelForProvider(provider: ProviderType, providers: ProviderDescriptor[]) {
  const providerEntry = providers.find((item) => item.provider === provider) ?? getFallbackProvider(provider);
  return providerEntry.models?.[0]?.id ?? '';
}

function normalizeProviderCatalog(
  providers: ProviderDescriptor[],
  modelsByProvider: Record<string, ModelDescriptor[]>,
): ProviderDescriptor[] {
  return providers.map((provider) => ({
    ...provider,
    models: (() => {
      const candidateModels = modelsByProvider[provider.provider] ?? [];
      const fallbackModels = provider.models ?? [];
      return candidateModels.length > 0
        ? candidateModels
        : fallbackModels.length > 0
          ? fallbackModels
          : getFallbackProviderModels(provider.provider);
    })(),
  }));
}

function normalizeCredentialMap(credentialList: ProviderCredential[]) {
  return credentialList.reduce<Record<string, ProviderCredential>>((acc, item) => {
    acc[item.provider] = item;
    return acc;
  }, {});
}

function resolveDraft(providers: ProviderDescriptor[], preferences: AiPreferences | null): ChatDraft {
  const firstProvider = providers[0]?.provider ?? 'openai';
  const preferredProvider = preferences?.provider ?? firstProvider;
  const providerEntry = providers.find((item) => item.provider === preferredProvider) ?? providers[0] ?? getFallbackProvider(firstProvider);
  const supportedModel = providerEntry.models.find((item) => item.id === preferences?.model)?.id;
  return {
    provider: providerEntry.provider,
    model: supportedModel ?? providerEntry.models[0]?.id ?? preferences?.model ?? '',
  };
}

export function useChatWorkspace() {
  const abortRef = useRef<AbortController | null>(null);
  const [providers, setProviders] = useState<ProviderDescriptor[]>(DEFAULT_PROVIDER_CATALOG);
  const [credentials, setCredentials] = useState<Record<string, ProviderCredential>>({});
  const [preferences, setPreferences] = useState<AiPreferences | null>(null);
  const [draft, setDraft] = useState<ChatDraft>({
    provider: DEFAULT_PROVIDER_CATALOG[0]?.provider ?? 'openai',
    model: DEFAULT_PROVIDER_CATALOG[0]?.models[0]?.id ?? '',
  });
  const [runtimeSessionId, setRuntimeSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composerValue, setComposerValue] = useState('');
  const [credentialTestResult, setCredentialTestResult] = useState<CredentialConnectionTestResponse | null>(null);
  const [requestState, setRequestState] = useState<RequestState>({
    bootstrapping: true,
    sendingMessage: false,
    testingCredential: false,
    savingSettings: false,
    deletingCredential: false,
    error: null,
    info: null,
  });

  const refreshMetadata = useCallback(async () => {
    setRequestState((current) => ({ ...current, bootstrapping: true, error: null }));
    try {
      const providerCatalog = await getChatProviders().catch(() => []);
      const catalogToLoad = providerCatalog.length > 0 ? providerCatalog : DEFAULT_PROVIDER_CATALOG;
      const loadedModels = await Promise.all(
        catalogToLoad.map(async (provider) => {
          const models = await getChatModels(provider.provider).catch(() => []);
          return [provider.provider, models] as const;
        }),
      );

      const [credentialList, preferenceResponse] = await Promise.all([
        getChatCredentials().catch(() => []),
        getAiPreferences().catch(() => null),
      ]);

      const modelsByProvider = loadedModels.reduce<Record<string, ModelDescriptor[]>>((acc, [provider, models]) => {
        acc[provider] = models;
        return acc;
      }, {});

      const nextProviders = normalizeProviderCatalog(catalogToLoad, modelsByProvider);
      const nextPreferences = preferenceResponse
        ? {
            provider: preferenceResponse.provider,
            model: preferenceResponse.model,
            chatPanelEnabled: preferenceResponse.chatPanelEnabled,
          }
        : null;
      const nextDraft = resolveDraft(nextProviders, nextPreferences);

      setProviders(nextProviders);
      setCredentials(normalizeCredentialMap(credentialList));
      setPreferences(nextPreferences);
      setDraft(nextDraft);
      setCredentialTestResult(null);
    } finally {
      setRequestState((current) => ({ ...current, bootstrapping: false }));
    }
  }, []);

  const testCredential = useCallback(async (payload: SettingsPayload) => {
    setRequestState((current) => ({ ...current, testingCredential: true, error: null, info: null }));
    try {
      const trimmedKey = payload.apiKey.trim();
      const result = await testChatCredential(payload.provider, {
        apiKey: trimmedKey,
        model: payload.model,
      });

      if (!result?.success) {
        throw new Error('연결 확인에 실패했습니다.');
      }

      setCredentialTestResult(result);
      setRequestState((current) => ({ ...current, info: result.message }));
      return result;
    } catch (error) {
      const message = toErrorMessage(error, '연결 확인에 실패했습니다.');
      const failedResult = {
        success: false,
        provider: payload.provider,
        model: payload.model,
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
    setRequestState((current) => ({ ...current, savingSettings: true, error: null, info: null }));
    try {
      const trimmedKey = payload.apiKey.trim();
      let savedCredential = credentials[payload.provider] ?? null;
      if (trimmedKey) {
        savedCredential = await saveChatCredential(payload.provider, { apiKey: trimmedKey, model: payload.model });
        if (!savedCredential?.hasKey) {
          throw new Error('자격증명을 저장하지 못했습니다.');
        }
      } else if (!savedCredential?.hasKey) {
        throw new Error('먼저 API 키를 입력하고 연결 확인을 해주세요.');
      }

      const savedPreferences = await saveAiPreferences({
        provider: payload.provider,
        model: payload.model,
        chatPanelEnabled: payload.chatPanelEnabled,
      });

      if (savedCredential) {
        setCredentials((current) => ({
          ...current,
          [payload.provider]: savedCredential ?? current[payload.provider],
        }));
      }

      const nextPreferences = {
        provider: savedPreferences?.provider ?? payload.provider,
        model: savedPreferences?.model ?? payload.model,
        chatPanelEnabled: savedPreferences?.chatPanelEnabled ?? payload.chatPanelEnabled,
      };

      setPreferences(nextPreferences);
      setDraft({
        provider: nextPreferences.provider,
        model: nextPreferences.model,
      });
      if (savedCredential) {
        setCredentialTestResult({
          success: true,
          provider: payload.provider,
          model: payload.model,
          message: savedCredential.validationMessage ?? '연결 확인 후 저장했습니다.',
          checkedAt: savedCredential.validatedAt ?? nowIso(),
        });
      }
      setRequestState((current) => ({
        ...current,
        info: trimmedKey ? '연결 확인 후 설정을 저장했습니다.' : '설정을 저장했습니다.',
      }));
      return nextPreferences;
    } catch (error) {
      const message = toErrorMessage(error, '설정을 저장하지 못했습니다.');
      setRequestState((current) => ({ ...current, error: message }));
      return null;
    } finally {
      setRequestState((current) => ({ ...current, savingSettings: false }));
    }
  }, [credentials]);

  const removeCredential = useCallback(async (provider: ProviderType) => {
    setRequestState((current) => ({ ...current, deletingCredential: true, error: null, info: null }));
    try {
      await deleteChatCredential(provider);
      setCredentials((current) => {
        const next = { ...current };
        delete next[provider];
        return next;
      });
      setCredentialTestResult((current) => (current?.provider === provider ? null : current));
      setRequestState((current) => ({ ...current, info: `${provider} 키를 삭제했습니다.` }));
    } catch (error) {
      setRequestState((current) => ({
        ...current,
        error: toErrorMessage(error, 'API 키를 삭제하지 못했습니다.'),
      }));
    } finally {
      setRequestState((current) => ({ ...current, deletingCredential: false }));
    }
  }, []);

  const clearNotices = useCallback(() => {
    setRequestState((current) => ({
      ...current,
      error: null,
      info: null,
    }));
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

  const sendMessage = useCallback(async (overrideText?: string) => {
    const messageText = (overrideText ?? composerValue).trim();
    if (!messageText || requestState.sendingMessage) {
      return null;
    }

    const activeProvider = draft.provider;
    const activeModel = draft.model || firstModelForProvider(draft.provider, providers);
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
      const response = await sendChatMessage(
        {
          sessionId: runtimeSessionId,
          provider: activeProvider,
          model: activeModel,
          message: messageText,
          contextMode: INVENTORY_CONTEXT_MODE,
        },
        controller.signal,
      );

      if (!response) {
        throw new Error('메시지를 전송하지 못했습니다.');
      }

      const assistantMessage: ChatMessage = {
        ...response.assistantMessage,
        toolTrace: response.toolTrace?.length ? response.toolTrace : response.assistantMessage.toolTrace,
      };

      setRuntimeSessionId(response.sessionId);
      setMessages((current) => current.map((item) => (
        item.id === optimisticAssistantMessage.id
          ? assistantMessage
          : item
      )));
      setRequestState((current) => ({ ...current, sendingMessage: false }));
      return response;
    } catch (error) {
      if (controller.signal.aborted) {
        setMessages((current) => current.filter((item) => item.id !== optimisticAssistantMessage.id));
        setRequestState((current) => ({ ...current, sendingMessage: false }));
        return null;
      }

      setMessages((current) => current.map((item) => (
        item.id === optimisticAssistantMessage.id
          ? { ...item, content: '재고 DB 조회 실패', status: 'error' }
          : item
      )));
      setRequestState((current) => ({
        ...current,
        sendingMessage: false,
        error: error instanceof Error ? error.message : '메시지를 전송하지 못했습니다.',
      }));
      return null;
    } finally {
      abortRef.current = null;
    }
  }, [composerValue, draft.model, draft.provider, providers, requestState.sendingMessage, runtimeSessionId]);

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
    setComposerValue,
    refreshMetadata,
    testCredential,
    sendMessage,
    stopResponse,
    resetConversation,
    applySettings,
    removeCredential,
    clearNotices,
  };
}
