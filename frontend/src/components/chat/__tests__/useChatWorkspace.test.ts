import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PROVIDER_CATALOG } from '../chatDefaults';
import { useChatWorkspace } from '../useChatWorkspace';

const apiMocks = vi.hoisted(() => ({
  sendQuickSearch: vi.fn(),
}));

const browserGemmaMocks = vi.hoisted(() => ({
  generateBrowserGemmaResponse: vi.fn(),
  getBrowserGemmaStatus: vi.fn(),
}));

const inventoryContextMocks = vi.hoisted(() => ({
  buildInventoryChatContext: vi.fn(),
}));

vi.mock('../../../api/chat', () => ({
  sendQuickSearch: apiMocks.sendQuickSearch,
}));

vi.mock('../browserGemma', () => ({
  generateBrowserGemmaResponse: browserGemmaMocks.generateBrowserGemmaResponse,
  getBrowserGemmaStatus: browserGemmaMocks.getBrowserGemmaStatus,
}));

vi.mock('../inventoryContext', () => ({
  buildInventoryChatContext: inventoryContextMocks.buildInventoryChatContext,
}));

describe('useChatWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiMocks.sendQuickSearch.mockResolvedValue({
      query: 'bolt',
      materials: [],
      recentTransactions: [],
      currentClosing: null,
    });
    browserGemmaMocks.generateBrowserGemmaResponse.mockResolvedValue('브라우저 Gemma 응답');
    browserGemmaMocks.getBrowserGemmaStatus.mockReturnValue(true);
    inventoryContextMocks.buildInventoryChatContext.mockResolvedValue({
      promptContext: null,
      toolTrace: [],
    });
  });

  it('starts every user on browser Gemma with chat enabled', async () => {
    const { result } = renderHook(() => useChatWorkspace());

    await waitFor(() => {
      expect(result.current.requestState.bootstrapping).toBe(false);
    });

    expect(result.current.providers).toEqual(DEFAULT_PROVIDER_CATALOG);
    expect(result.current.preferences).toEqual({ provider: 'gemma', model: 'gemma4', chatPanelEnabled: true });
    expect(result.current.draft).toEqual({ provider: 'gemma', model: 'gemma4' });
    expect(result.current.credentials.gemma?.hasKey).toBe(true);
  });

  it('runs messages in the browser without a backend chat API', async () => {
    const { result } = renderHook(() => useChatWorkspace());

    await waitFor(() => {
      expect(result.current.requestState.bootstrapping).toBe(false);
    });

    act(() => {
      result.current.setComposerValue('Gemma로 답해줘');
    });
    await act(async () => {
      await result.current.sendMessage();
    });

    expect(inventoryContextMocks.buildInventoryChatContext).toHaveBeenCalledWith(
      'Gemma로 답해줘',
      expect.any(AbortSignal),
    );
    expect(browserGemmaMocks.generateBrowserGemmaResponse).toHaveBeenCalledWith('Gemma로 답해줘', null);
    expect(result.current.messages.at(-1)?.content).toBe('브라우저 Gemma 응답');
  });

  it('passes inventory DB context into Gemma and keeps the evidence trace', async () => {
    inventoryContextMocks.buildInventoryChatContext.mockResolvedValueOnce({
      promptContext: '[DB_CONTEXT]\n직접답: 어제(2026-05-11) 들어온 재고는 0개입니다.\n[/DB_CONTEXT]',
      directAnswer: '어제(2026-05-11) 들어온 재고는 0개입니다.',
      toolTrace: [
        {
          kind: 'inventory',
          title: '어제 입고 조회',
          summary: '2026-05-11~2026-05-11 입고 0개, 거래 0건',
          sourceViews: ['GET /inventory/ledger?type=IN&from=2026-05-11&to=2026-05-11&size=100'],
          rowCount: 0,
          durationMs: 12,
        },
      ],
    });
    browserGemmaMocks.generateBrowserGemmaResponse.mockResolvedValueOnce(
      'DB 기준 숫자를 알려주시면 확인해 드릴 수 있습니다.',
    );
    const { result } = renderHook(() => useChatWorkspace());

    await waitFor(() => {
      expect(result.current.requestState.bootstrapping).toBe(false);
    });

    act(() => {
      result.current.setComposerValue('어제 들어온 재고가 몇 개야?');
    });
    await act(async () => {
      await result.current.sendMessage();
    });

    expect(browserGemmaMocks.generateBrowserGemmaResponse).toHaveBeenCalledWith(
      '어제 들어온 재고가 몇 개야?',
      expect.stringContaining('직접답: 어제(2026-05-11) 들어온 재고는 0개입니다.'),
    );
    expect(result.current.messages.at(-1)?.content).toBe('어제(2026-05-11) 들어온 재고는 0개입니다.');
    expect(result.current.messages.at(-1)?.toolTrace?.[0]?.title).toBe('어제 입고 조회');
  });

  it('keeps the browser runtime session until conversation reset', async () => {
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
    const firstSessionId = result.current.runtimeSessionId;

    act(() => {
      result.current.setComposerValue('둘째 질문');
    });
    await act(async () => {
      await result.current.sendMessage();
    });

    expect(result.current.runtimeSessionId).toBe(firstSessionId);

    act(() => {
      result.current.resetConversation();
      result.current.setComposerValue('셋째 질문');
    });
    await act(async () => {
      await result.current.sendMessage();
    });

    expect(result.current.runtimeSessionId).not.toBe(firstSessionId);
    expect(browserGemmaMocks.generateBrowserGemmaResponse).toHaveBeenNthCalledWith(1, '첫 질문', null);
    expect(browserGemmaMocks.generateBrowserGemmaResponse).toHaveBeenNthCalledWith(2, '둘째 질문', null);
    expect(browserGemmaMocks.generateBrowserGemmaResponse).toHaveBeenNthCalledWith(3, '셋째 질문', null);
  });

  it('applies Gemma settings without saving API credentials', async () => {
    const { result } = renderHook(() => useChatWorkspace());

    await waitFor(() => {
      expect(result.current.requestState.bootstrapping).toBe(false);
    });

    await act(async () => {
      const saved = await result.current.applySettings({
        provider: 'gemma',
        model: 'gemma4',
      });
      expect(saved).toEqual({ provider: 'gemma', model: 'gemma4', chatPanelEnabled: true });
    });

    expect(result.current.preferences?.provider).toBe('gemma');
    expect(result.current.preferences?.chatPanelEnabled).toBe(true);
  });

  it('checks browser Gemma support without an API key', async () => {
    const { result } = renderHook(() => useChatWorkspace());

    await waitFor(() => {
      expect(result.current.requestState.bootstrapping).toBe(false);
    });

    await act(async () => {
      await result.current.testCredential({
        provider: 'gemma',
        model: 'gemma4',
      });
    });

    expect(browserGemmaMocks.getBrowserGemmaStatus).toHaveBeenCalled();
    expect(result.current.requestState.info).toBe('API 키 없이 브라우저에서 Gemma 4를 실행할 수 있습니다.');
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

  it('keeps stale quick search completions from overwriting the active search', async () => {
    let resolveFirst: ((value: Awaited<ReturnType<typeof apiMocks.sendQuickSearch>>) => void) | undefined;
    apiMocks.sendQuickSearch
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockResolvedValueOnce({
        query: 'second',
        materials: [
          {
            materialCode: 'MAT-002',
            materialName: 'Second Bolt',
            description: null,
            location: null,
            safeStockQty: 1,
            currentStockQty: 5,
          },
        ],
        recentTransactions: [],
        currentClosing: null,
      });
    const { result } = renderHook(() => useChatWorkspace());

    await waitFor(() => {
      expect(result.current.requestState.bootstrapping).toBe(false);
    });

    const firstSearch = act(async () => {
      await result.current.executeQuickSearch('first');
    });

    await act(async () => {
      await result.current.executeQuickSearch('second');
    });

    resolveFirst?.({
      query: 'first',
      materials: [
        {
          materialCode: 'MAT-001',
          materialName: 'First Bolt',
          description: null,
          location: null,
          safeStockQty: 3,
          currentStockQty: 10,
        },
      ],
      recentTransactions: [],
      currentClosing: null,
    });
    await firstSearch;

    expect(result.current.quickSearchResults?.query).toBe('second');
    expect(result.current.quickSearchResults?.materials[0]?.materialCode).toBe('MAT-002');
  });
});
