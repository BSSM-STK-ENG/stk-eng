import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatPanel from '../ChatPanel';
import { useChatWorkspace } from '../useChatWorkspace';
import type { ChatMessage, ProviderDescriptor } from '../../../types/chat';

vi.mock('../useChatWorkspace', () => ({
  useChatWorkspace: vi.fn(),
}));

const mockedUseChatWorkspace = vi.mocked(useChatWorkspace);

const providers: ProviderDescriptor[] = [
  {
    provider: 'openai',
    label: 'ChatGPT',
    description: '기본',
    models: [
      {
        id: 'gpt-5',
        name: 'GPT-5',
        provider: 'openai',
      },
    ],
  },
];

function createWorkspace(messages: ChatMessage[] = []) {
  return {
    providers,
    credentials: {
      openai: {
        provider: 'openai',
        hasKey: true,
        maskedKey: '****...7890',
        status: 'verified' as const,
        validationStatus: 'success' as const,
        validationMessage: '연결 확인에 성공했습니다.',
        validatedAt: '2026-03-22T10:00:00.000Z',
      },
    },
    preferences: {
      provider: 'openai',
      model: 'gpt-5',
    },
    draft: {
      provider: 'openai',
      model: 'gpt-5',
    },
    messages,
    composerValue: '',
    runtimeSessionId: null,
    credentialTestResult: null,
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
    sendMessage: vi.fn().mockResolvedValue(null),
    testCredential: vi.fn().mockResolvedValue({
      success: true,
      provider: 'openai',
      model: 'gpt-5',
      message: '연결 확인에 성공했습니다.',
      checkedAt: '2026-03-22T10:00:00.000Z',
    }),
    stopResponse: vi.fn(),
    resetConversation: vi.fn(),
    applySettings: vi.fn().mockResolvedValue({ provider: 'openai', model: 'gpt-5' }),
    removeCredential: vi.fn().mockResolvedValue(undefined),
    clearNotices: vi.fn(),
    refreshMetadata: vi.fn(),
  };
}

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens settings from the overflow menu in a portal modal', async () => {
    const user = userEvent.setup();
    mockedUseChatWorkspace.mockReturnValue(createWorkspace());

    render(
      <ChatPanel
        mobileOpen={false}
        onCloseMobile={vi.fn()}
        collapsed={false}
        onToggleCollapse={vi.fn()}
        width={400}
      />,
    );

    expect(screen.queryByText('모델과 API 키 설정')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '채팅 메뉴' }));
    await user.click(screen.getByRole('button', { name: '설정' }));

    expect(screen.getByText('모델과 API 키 설정')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '연결 확인' })).toBeInTheDocument();
  });

  it('renders user messages on the right and assistant messages on the left', () => {
    mockedUseChatWorkspace.mockReturnValue(createWorkspace([
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
    ]));

    render(
      <ChatPanel
        mobileOpen={false}
        onCloseMobile={vi.fn()}
        collapsed={false}
        onToggleCollapse={vi.fn()}
        width={400}
      />,
    );

    const userBubble = screen.getByTestId('message-user-m1');
    const assistantBubble = screen.getByTestId('message-assistant-m2');

    expect(userBubble).toHaveClass('items-end');
    expect(assistantBubble).toHaveClass('items-start');
  });

  it('shows evidence collapsed by default and keeps session/toolbars hidden', () => {
    mockedUseChatWorkspace.mockReturnValue(createWorkspace([
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
    ]));

    render(
      <ChatPanel
        mobileOpen={false}
        onCloseMobile={vi.fn()}
        collapsed={false}
        onToggleCollapse={vi.fn()}
        width={400}
      />,
    );

    expect(screen.getAllByText('조회 근거 보기').length).toBeGreaterThan(0);
    expect(screen.queryByText('동기화')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('toggles collapse from the overflow menu', async () => {
    const user = userEvent.setup();
    const onToggleCollapse = vi.fn();
    mockedUseChatWorkspace.mockReturnValue(createWorkspace());

    render(
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
});
