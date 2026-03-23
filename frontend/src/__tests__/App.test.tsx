import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: { post: vi.fn(), get: vi.fn(), delete: vi.fn() },
}));

const mockedGet = vi.mocked(api.get);

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/login');
    mockedGet.mockResolvedValue({ data: [], status: 200, statusText: 'OK', headers: {}, config: {} as never });
  });

  it('renders login page at /login', () => {
    render(<App />);
    expect(screen.getByText('STK Inventory')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@company.com')).toBeInTheDocument();
  });

  it('redirects /register to login', () => {
    window.history.pushState({}, '', '/register');
    render(<App />);
    expect(screen.getByPlaceholderText('name@company.com')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    window.history.pushState({}, '', '/stock/current');
    render(<App />);
    // Should redirect to login since no token
    expect(screen.getByPlaceholderText('name@company.com')).toBeInTheDocument();
  });

  it('renders protected route when authenticated', async () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('email', 'test@test.com');
    localStorage.setItem('role', 'USER');
    localStorage.setItem('passwordChangeRequired', 'false');
    window.history.pushState({}, '', '/stock/current');
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('STK Inventory').length).toBeGreaterThan(0);
    });
    expect(screen.getByRole('button', { name: 'AI 패널 켜기' })).toBeInTheDocument();
    expect(screen.queryByLabelText('채팅 패널')).not.toBeInTheDocument();
  });

  it('redirects authenticated users who must change password', () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('email', 'test@test.com');
    localStorage.setItem('role', 'USER');
    localStorage.setItem('passwordChangeRequired', 'true');
    window.history.pushState({}, '', '/stock/current');
    render(<App />);
    expect(screen.getByText('초기 비밀번호 변경')).toBeInTheDocument();
  });

  it('renders super admin account page for super admin users', async () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('email', 'superadmin@test.com');
    localStorage.setItem('role', 'SUPER_ADMIN');
    localStorage.setItem('passwordChangeRequired', 'false');
    mockedGet.mockImplementation(async (url) => ({
      data:
        url === '/admin/users'
          ? []
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
    render(<App />);
    expect(screen.getByText('계정 발급 센터')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('아직 발급된 계정이 없습니다.')).toBeInTheDocument();
    });
  });

  it('renders password change page for authenticated users', () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('email', 'user@test.com');
    localStorage.setItem('role', 'USER');
    localStorage.setItem('passwordChangeRequired', 'false');
    window.history.pushState({}, '', '/account/password');
    render(<App />);
    expect(screen.getByRole('heading', { name: '비밀번호 변경' })).toBeInTheDocument();
  });

  it('hides the chat panel when account preferences disable it', async () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('email', 'user@test.com');
    localStorage.setItem('role', 'USER');
    localStorage.setItem('passwordChangeRequired', 'false');
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

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByLabelText('채팅 패널')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'AI 패널 켜기' })).toBeInTheDocument();
  });
});
