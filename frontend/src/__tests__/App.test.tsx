import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: { post: vi.fn(), get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mockedGet = vi.mocked(api.get);

function createTestToken() {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: 'test@test.com', exp: Math.floor(Date.now() / 1000) + 86400 }));
  return `${header}.${payload}.test-signature`;
}

const setSession = (options: {
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  passwordChangeRequired?: boolean;
  pagePermissions?: string[];
  permissionPreset?: string;
}) => {
  localStorage.setItem('token', createTestToken());
  localStorage.setItem('email', options.email);
  localStorage.setItem('role', options.role);
  localStorage.setItem('passwordChangeRequired', String(options.passwordChangeRequired ?? false));
  if (options.permissionPreset) {
    localStorage.setItem('permissionPreset', options.permissionPreset);
  }
  if (options.pagePermissions) {
    localStorage.setItem('pagePermissions', JSON.stringify(options.pagePermissions));
  }
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

function renderApp() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/login');
    mockedGet.mockImplementation(async (url) => ({
      data:
        url === '/ai/preferences'
          ? {
              provider: 'openai',
              model: 'gpt-5',
              chatPanelEnabled: false,
            }
          : [],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    }));
  });

  it('renders login page at /login', () => {
    renderApp();
    expect(screen.getByText('STK-ENG')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@company.com')).toBeInTheDocument();
  });

  it('renders register page at /register', () => {
    window.history.pushState({}, '', '/register');
    renderApp();
    expect(screen.getByRole('heading', { name: '회원가입' })).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    window.history.pushState({}, '', '/stock/current');
    renderApp();
    // Should redirect to login since no token
    expect(screen.getByPlaceholderText('name@company.com')).toBeInTheDocument();
  });

  it('renders protected route when authenticated', async () => {
    setSession({
      email: 'test@test.com',
      role: 'USER',
      pagePermissions: ['DASHBOARD', 'CURRENT_STOCK', 'STOCK_LEDGER', 'HISTORY'],
      permissionPreset: 'VIEWER',
    });
    window.history.pushState({}, '', '/dashboard');
    renderApp();

    await waitFor(() => {
      expect(screen.getAllByText('STK-ENG').length).toBeGreaterThan(0);
    });
    expect(screen.getByRole('heading', { name: '재고 현황' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AI 패널 켜기' })).toBeInTheDocument();
    expect(screen.queryByLabelText('채팅 패널')).not.toBeInTheDocument();
  });

  it('redirects authenticated users who must change password', async () => {
    setSession({
      email: 'test@test.com',
      role: 'USER',
      passwordChangeRequired: true,
      pagePermissions: ['DASHBOARD', 'CURRENT_STOCK', 'STOCK_LEDGER', 'HISTORY'],
      permissionPreset: 'VIEWER',
    });
    window.history.pushState({}, '', '/stock/current');
    renderApp();
    await waitFor(() => {
      expect(screen.getByText('초기 비밀번호 변경')).toBeInTheDocument();
    });
  });

  it('renders super admin account page for super admin users', async () => {
    setSession({
      email: 'superadmin@test.com',
      role: 'SUPER_ADMIN',
      pagePermissions: [
        'DASHBOARD',
        'CURRENT_STOCK',
        'STOCK_LEDGER',
        'HISTORY',
        'INBOUND',
        'OUTBOUND',
        'CLOSING',
        'MASTER_DATA',
        'ADMIN_ACCOUNTS',
      ],
      permissionPreset: 'SUPER_ADMIN',
    });
    mockedGet.mockImplementation(async (url) => ({
      data:
        url === '/admin/users'
          ? []
          : url === '/admin/users/permission-options'
            ? {
                roleProfiles: [],
                pages: [],
                presets: [],
              }
            : url === '/ai/preferences'
              ? {
                  provider: 'openai',
                  model: 'gpt-5',
                  chatPanelEnabled: false,
                }
              : [],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    }));
    window.history.pushState({}, '', '/admin/accounts');
    renderApp();
    await waitFor(() => {
      expect(screen.getAllByText('사용자 관리').length).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(screen.getByText('아직 등록된 사용자가 없습니다.')).toBeInTheDocument();
    });
  });

  it('renders password change page for authenticated users', async () => {
    setSession({
      email: 'user@test.com',
      role: 'USER',
      pagePermissions: ['DASHBOARD', 'CURRENT_STOCK', 'STOCK_LEDGER', 'HISTORY'],
      permissionPreset: 'VIEWER',
    });
    window.history.pushState({}, '', '/account/password');
    renderApp();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '비밀번호 변경' })).toBeInTheDocument();
    });
  });

  it('renders master data page when the account has that page permission', async () => {
    setSession({
      email: 'admin@test.com',
      role: 'ADMIN',
      pagePermissions: [
        'DASHBOARD',
        'CURRENT_STOCK',
        'STOCK_LEDGER',
        'HISTORY',
        'INBOUND',
        'OUTBOUND',
        'CLOSING',
        'MASTER_DATA',
      ],
      permissionPreset: 'MANAGER',
    });
    window.history.pushState({}, '', '/master-data');

    renderApp();

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: '사업장 관리' }).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('사업장 관리').length).toBeGreaterThan(0);
  });

  it('redirects general users away from write pages', async () => {
    setSession({
      email: 'user@test.com',
      role: 'USER',
      pagePermissions: ['DASHBOARD', 'CURRENT_STOCK', 'STOCK_LEDGER', 'HISTORY'],
      permissionPreset: 'VIEWER',
    });
    window.history.pushState({}, '', '/inbound');

    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '재고 현황' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: '입고 관리' })).not.toBeInTheDocument();
  });

  it('redirects admins away from super admin page', async () => {
    setSession({
      email: 'admin@test.com',
      role: 'ADMIN',
      pagePermissions: ['DASHBOARD', 'CURRENT_STOCK', 'STOCK_LEDGER', 'HISTORY', 'INBOUND', 'OUTBOUND'],
      permissionPreset: 'OPERATOR',
    });
    window.history.pushState({}, '', '/admin/accounts');

    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '재고 현황' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: '사용자 관리' })).not.toBeInTheDocument();
  });

  it('hides the chat panel when account preferences disable it', async () => {
    setSession({
      email: 'user@test.com',
      role: 'USER',
      pagePermissions: ['DASHBOARD', 'CURRENT_STOCK', 'STOCK_LEDGER', 'HISTORY'],
      permissionPreset: 'VIEWER',
    });
    mockedGet.mockImplementation(async (url) => ({
      data:
        url === '/ai/preferences'
          ? {
              provider: 'openai',
              model: 'gpt-5',
              chatPanelEnabled: false,
            }
          : [],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    }));
    window.history.pushState({}, '', '/stock/current');

    renderApp();

    await waitFor(() => {
      expect(screen.queryByLabelText('채팅 패널')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'AI 패널 켜기' })).toBeInTheDocument();
    });
  });

  it('clears selected materials when opening another page', async () => {
    setSession({
      email: 'user@test.com',
      role: 'USER',
      pagePermissions: ['DASHBOARD', 'CURRENT_STOCK', 'STOCK_LEDGER', 'HISTORY'],
      permissionPreset: 'VIEWER',
    });
    localStorage.setItem('stk-material-worklist:user@test.com', JSON.stringify(['MAT-001', 'MAT-002']));
    mockedGet.mockImplementation(async (url) => ({
      data:
        url === '/ai/preferences'
          ? {
              provider: 'openai',
              model: 'gpt-5',
              chatPanelEnabled: false,
            }
          : [],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    }));
    window.history.pushState({}, '', '/dashboard');

    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '재고 현황' })).toBeInTheDocument();
    });
    expect(localStorage.getItem('stk-material-worklist:user@test.com')).toBe(JSON.stringify([]));
  });
});
