import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage, ProviderDescriptor } from '../../../types/chat';
import ChatPanel from '../ChatPanel';
import { DEFAULT_PROVIDER_CATALOG } from '../chatDefaults';
import { useChatWorkspace } from '../useChatWorkspace';

vi.mock('../useChatWorkspace', () => ({
  useChatWorkspace: vi.fn(),
}));

const mockedUseChatWorkspace = vi.mocked(useChatWorkspace);

const providers: ProviderDescriptor[] = DEFAULT_PROVIDER_CATALOG;

function createWorkspace(messages: ChatMessage[] = []) {
  return {
    providers,
    credentials: {
      gemma: {
        provider: 'gemma',
        hasKey: true,
        maskedKey: '브라우저 내장',
        status: 'verified' as const,
        validationStatus: 'success' as const,
        validationMessage: '브라우저에서 Gemma 4를 실행합니다.',
        validatedAt: '2026-03-22T10:00:00.000Z',
      },
    },
    preferences: {
      provider: 'gemma',
      model: 'gemma4',
      chatPanelEnabled: true,
    },
    draft: {
      provider: 'gemma',
      model: 'gemma4',
    },
    messages,
    composerValue: '',
    runtimeSessionId: null,
    credentialTestResult: null,
    quickSearchQuery: '',
    quickSearchResults: null,
    quickSearchLoading: false,
    quickSearchError: null,
    requestState: {
      bootstrapping: false,
      sendingMessage: false,
      testingCredential: false,
      savingSettings: false,
      deletingCredential: false,
      error: null,
      info: null,
    },
    setComposerValue: vi.fn(),
    setQuickSearchQuery: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue(null),
    testCredential: vi.fn().mockResolvedValue({
      success: true,
      provider: 'gemma',
      model: 'gemma4',
      message: '브라우저에서 Gemma 4를 실행할 수 있습니다.',
      checkedAt: '2026-03-22T10:00:00.000Z',
    }),
    stopResponse: vi.fn(),
    resetConversation: vi.fn(),
    applySettings: vi.fn().mockResolvedValue({ provider: 'gemma', model: 'gemma4', chatPanelEnabled: true }),
    removeCredential: vi.fn().mockResolvedValue(undefined),
    clearNotices: vi.fn(),
    refreshMetadata: vi.fn(),
    executeQuickSearch: vi.fn().mockResolvedValue(undefined),
    clearQuickSearch: vi.fn(),
  };
}

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWithRouter(ui: React.ReactElement) {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
  }

  it('opens settings from the overflow menu in a portal modal', async () => {
    const user = userEvent.setup();
    mockedUseChatWorkspace.mockReturnValue(createWorkspace());

    renderWithRouter(
      <ChatPanel mobileOpen={false} onCloseMobile={vi.fn()} collapsed={false} onToggleCollapse={vi.fn()} width={400} />,
    );

    expect(screen.queryByText('내장 Gemma 설정')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '채팅 메뉴' }));
    await user.click(screen.getByRole('button', { name: '설정' }));

    expect(screen.getByText('내장 Gemma 설정')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '실행 확인' })).toBeInTheDocument();
  });

  it('renders user messages on the right and assistant messages on the left', () => {
    mockedUseChatWorkspace.mockReturnValue(
      createWorkspace([
        {
          id: 'm1',
          sessionId: 'runtime',
          role: 'user',
          content: '내가 보낸 질문',
          createdAt: '2026-03-22T10:00:00.000Z',
        },
        {
          id: 'm2',
          sessionId: 'runtime',
          role: 'assistant',
          content: 'AI 응답',
          createdAt: '2026-03-22T10:01:00.000Z',
        },
      ]),
    );

    renderWithRouter(
      <ChatPanel mobileOpen={false} onCloseMobile={vi.fn()} collapsed={false} onToggleCollapse={vi.fn()} width={400} />,
    );

    const userBubble = screen.getByTestId('message-user-m1');
    const assistantBubble = screen.getByTestId('message-assistant-m2');

    expect(userBubble).toHaveClass('items-end');
    expect(assistantBubble).toHaveClass('items-start');
  });

  it('shows evidence collapsed by default and keeps session/toolbars hidden', () => {
    mockedUseChatWorkspace.mockReturnValue(
      createWorkspace([
        {
          id: 'm2',
          sessionId: 'runtime',
          role: 'assistant',
          content: '근거가 있는 응답',
          createdAt: '2026-03-22T10:01:00.000Z',
          toolTrace: [
            {
              kind: 'sql',
              title: 'SQL Query',
              summary: '입고 데이터를 집계했습니다.',
              sql: 'select * from inventory_transaction_facts',
            },
          ],
        },
      ]),
    );

    renderWithRouter(
      <ChatPanel mobileOpen={false} onCloseMobile={vi.fn()} collapsed={false} onToggleCollapse={vi.fn()} width={400} />,
    );

    expect(screen.getAllByText('조회 근거 보기').length).toBeGreaterThan(0);
    expect(screen.queryByText('동기화')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('toggles collapse from the overflow menu', async () => {
    const user = userEvent.setup();
    const onToggleCollapse = vi.fn();
    mockedUseChatWorkspace.mockReturnValue(createWorkspace());

    renderWithRouter(
      <ChatPanel
        mobileOpen={false}
        onCloseMobile={vi.fn()}
        collapsed={false}
        onToggleCollapse={onToggleCollapse}
        width={400}
      />,
    );

    await user.click(screen.getByRole('button', { name: '채팅 메뉴' }));
    await user.click(screen.getByRole('button', { name: '패널 접기' }));

    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('runs slash quick search and syncs the visible query', async () => {
    const user = userEvent.setup();
    const workspace = createWorkspace();
    workspace.composerValue = '/search bolt';
    mockedUseChatWorkspace.mockReturnValue(workspace);

    renderWithRouter(
      <ChatPanel mobileOpen={false} onCloseMobile={vi.fn()} collapsed={false} onToggleCollapse={vi.fn()} width={400} />,
    );

    await user.click(screen.getByPlaceholderText('재고 내용을 질문하세요 ( / 명령어 사용 가능)'));
    await user.keyboard('{Enter}');

    expect(workspace.setQuickSearchQuery).toHaveBeenCalledWith('bolt');
    expect(workspace.executeQuickSearch).toHaveBeenCalledWith('bolt');
    expect(workspace.sendMessage).not.toHaveBeenCalled();
  });

  it('focuses quick search without sending bare slash search as chat', async () => {
    const user = userEvent.setup();
    const workspace = createWorkspace();
    workspace.composerValue = '/search';
    mockedUseChatWorkspace.mockReturnValue(workspace);

    renderWithRouter(
      <ChatPanel mobileOpen={false} onCloseMobile={vi.fn()} collapsed={false} onToggleCollapse={vi.fn()} width={400} />,
    );

    await user.click(screen.getByPlaceholderText('재고 내용을 질문하세요 ( / 명령어 사용 가능)'));
    await user.keyboard('{Enter}');

    expect(workspace.executeQuickSearch).not.toHaveBeenCalled();
    expect(workspace.sendMessage).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('자재명, 코드, 거래내역 검색...')).toHaveFocus();
  });
});
