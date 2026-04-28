import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PROVIDER_CATALOG } from '../chatDefaults';
import { useChatWorkspace } from '../useChatWorkspace';

const apiMocks = vi.hoisted(() => ({
  getAiPreferences: vi.fn(),
  getChatCredentials: vi.fn(),
  getChatModels: vi.fn(),
  getChatProviders: vi.fn(),
  saveAiPreferences: vi.fn(),
  saveChatCredential: vi.fn(),
  testChatCredential: vi.fn(),
  deleteChatCredential: vi.fn(),
  sendChatMessage: vi.fn(),
  sendQuickSearch: vi.fn(),
}));

vi.mock('../../../api/chat', () => ({
  getAiPreferences: apiMocks.getAiPreferences,
  getChatCredentials: apiMocks.getChatCredentials,
  getChatModels: apiMocks.getChatModels,
  getChatProviders: apiMocks.getChatProviders,
  saveAiPreferences: apiMocks.saveAiPreferences,
  saveChatCredential: apiMocks.saveChatCredential,
  testChatCredential: apiMocks.testChatCredential,
  deleteChatCredential: apiMocks.deleteChatCredential,
  sendChatMessage: apiMocks.sendChatMessage,
  sendQuickSearch: apiMocks.sendQuickSearch,
}));

describe('useChatWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiMocks.getChatProviders.mockResolvedValue(DEFAULT_PROVIDER_CATALOG);
    apiMocks.getChatModels.mockImplementation(
      async (provider: string) => DEFAULT_PROVIDER_CATALOG.find((item) => item.provider === provider)?.models ?? [],
    );
    apiMocks.getChatCredentials.mockResolvedValue([
      {
        provider: 'openai',
        hasKey: true,
        maskedKey: '****...7890',
        status: 'verified',
        validationStatus: 'success',
        validationMessage: '연결 확인에 성공했습니다.',
        validatedAt: '2026-03-22T10:00:00.000Z',
      },
    ]);
    apiMocks.getAiPreferences.mockResolvedValue({
      provider: 'openai',
      model: 'gpt-5',
      chatPanelEnabled: true,
    });
    apiMocks.saveAiPreferences.mockResolvedValue({
      provider: 'google',
      model: 'gemini-2.5-flash',
      chatPanelEnabled: false,
    });
    apiMocks.saveChatCredential.mockImplementation(async (provider: string) => ({
      provider,
      hasKey: true,
      maskedKey: '****...7890',
      status: 'verified',
      validationStatus: 'success',
      validationMessage: '연결 확인에 성공했습니다.',
      validatedAt: '2026-03-22T10:00:00.000Z',
    }));
    apiMocks.testChatCredential.mockResolvedValue({
      success: true,
      provider: 'openai',
      model: 'gpt-5',
      message: '연결 확인에 성공했습니다.',
      checkedAt: '2026-03-22T10:00:00.000Z',
    });
    apiMocks.deleteChatCredential.mockResolvedValue(undefined);
    apiMocks.sendQuickSearch.mockResolvedValue({
      query: 'bolt',
      materials: [],
      recentTransactions: [],
      currentClosing: null,
    });
  });

  it('loads providers, credentials, and preferences without restoring old sessions', async () => {
    const { result } = renderHook(() => useChatWorkspace());

    await waitFor(() => {
      expect(result.current.requestState.bootstrapping).toBe(false);
    });

    expect(result.current.preferences?.provider).toBe('openai');
    expect(result.current.preferences?.model).toBe('gpt-5');
    expect(result.current.preferences?.chatPanelEnabled).toBe(true);
  });

  it('reuses the runtime session until conversation reset', async () => {
    apiMocks.sendChatMessage
      .mockResolvedValueOnce({
        sessionId: 'session-1',
        messageId: 'assistant-1',
        assistantMessage: {
          id: 'assistant-1',
          sessionId: 'session-1',
          role: 'assistant',
          content: '첫 답변',
          createdAt: '2026-03-22T10:00:00.000Z',
        },
        toolTrace: [],
      })
      .mockResolvedValueOnce({
        sessionId: 'session-1',
        messageId: 'assistant-2',
        assistantMessage: {
          id: 'assistant-2',
          sessionId: 'session-1',
          role: 'assistant',
          content: '둘째 답변',
          createdAt: '2026-03-22T10:01:00.000Z',
        },
        toolTrace: [],
      })
      .mockResolvedValueOnce({
        sessionId: 'session-2',
        messageId: 'assistant-3',
        assistantMessage: {
          id: 'assistant-3',
          sessionId: 'session-2',
          role: 'assistant',
          content: '새 대화 답변',
          createdAt: '2026-03-22T10:02:00.000Z',
        },
        toolTrace: [],
      });

    const { result } = renderHook(() => useChatWorkspace());

    await waitFor(() => {
      expect(result.current.requestState.bootstrapping).toBe(false);
    });

    act(() => {
      result.current.setComposerValue('첫 질문');
    });
    await act(async () => {
      await result.current.sendMessage();
    });

    act(() => {
      result.current.setComposerValue('둘째 질문');
    });
    await act(async () => {
      await result.current.sendMessage();
    });

    act(() => {
      result.current.resetConversation();
      result.current.setComposerValue('셋째 질문');
    });
    await act(async () => {
      await result.current.sendMessage();
    });

    expect(apiMocks.sendChatMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sessionId: null, message: '첫 질문', contextMode: 'inventory' }),
      expect.any(AbortSignal),
    );
    expect(apiMocks.sendChatMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sessionId: 'session-1', message: '둘째 질문' }),
      expect.any(AbortSignal),
    );
    expect(apiMocks.sendChatMessage).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ sessionId: null, message: '셋째 질문' }),
      expect.any(AbortSignal),
    );
  });

  it('persists and applies account-level default provider and model', async () => {
    const { result } = renderHook(() => useChatWorkspace());

    await waitFor(() => {
      expect(result.current.requestState.bootstrapping).toBe(false);
    });

    await act(async () => {
      await result.current.applySettings({
        provider: 'google',
        model: 'gemini-2.5-flash',
        apiKey: 'gm-test-123456',
        chatPanelEnabled: false,
      });
    });

    expect(apiMocks.saveChatCredential).toHaveBeenCalledWith('google', {
      apiKey: 'gm-test-123456',
      model: 'gemini-2.5-flash',
    });
    expect(apiMocks.saveAiPreferences).toHaveBeenCalledWith({
      provider: 'google',
      model: 'gemini-2.5-flash',
      chatPanelEnabled: false,
    });
    expect(result.current.credentialTestResult).toEqual({
      success: true,
      provider: 'google',
      model: 'gemini-2.5-flash',
      message: '연결 확인에 성공했습니다.',
      checkedAt: '2026-03-22T10:00:00.000Z',
    });
    expect(result.current.preferences?.provider).toBe('google');
    expect(result.current.preferences?.model).toBe('gemini-2.5-flash');
    expect(result.current.preferences?.chatPanelEnabled).toBe(false);
  });

  it('tests credential connectivity and exposes the success message', async () => {
    const { result } = renderHook(() => useChatWorkspace());

    await waitFor(() => {
      expect(result.current.requestState.bootstrapping).toBe(false);
    });

    await act(async () => {
      await result.current.testCredential({
        provider: 'openai',
        model: 'gpt-5',
        apiKey: 'sk-test-1234567890',
        chatPanelEnabled: true,
      });
    });

    expect(apiMocks.testChatCredential).toHaveBeenCalledWith('openai', {
      apiKey: 'sk-test-1234567890',
      model: 'gpt-5',
    });
    expect(result.current.requestState.info).toBe('연결 확인에 성공했습니다.');
  });

  it('skips quick search API calls for blank queries', async () => {
    const { result } = renderHook(() => useChatWorkspace());

    await waitFor(() => {
      expect(result.current.requestState.bootstrapping).toBe(false);
    });

    await act(async () => {
      await result.current.executeQuickSearch('   ');
    });

    expect(apiMocks.sendQuickSearch).not.toHaveBeenCalled();
    expect(result.current.quickSearchLoading).toBe(false);
  });

  it('syncs explicit quick search queries into state and stores results', async () => {
    apiMocks.sendQuickSearch.mockResolvedValueOnce({
      query: 'bolt',
      materials: [
        {
          materialCode: 'MAT-001',
          materialName: 'Bolt',
          description: null,
          location: null,
          safeStockQty: 3,
          currentStockQty: 10,
        },
      ],
      recentTransactions: [],
      currentClosing: null,
    });
    const { result } = renderHook(() => useChatWorkspace());

    await waitFor(() => {
      expect(result.current.requestState.bootstrapping).toBe(false);
    });

    await act(async () => {
      await result.current.executeQuickSearch('  bolt  ');
    });

    expect(apiMocks.sendQuickSearch).toHaveBeenCalledWith('bolt', expect.any(AbortSignal));
    expect(result.current.quickSearchQuery).toBe('bolt');
    expect(result.current.quickSearchResults?.materials[0]?.materialCode).toBe('MAT-001');
    expect(result.current.quickSearchLoading).toBe(false);
  });
});
