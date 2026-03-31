import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: { post: vi.fn(), get: vi.fn(), delete: vi.fn() },
}));
const mockedPost = vi.mocked(api.post);

const renderLogin = () =>
  render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders login form', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('name@company.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /로그인/ })).toBeInTheDocument();
  });

  it('renders title and description', () => {
    renderLogin();
    expect(screen.getByText('STK-ENG')).toBeInTheDocument();
    expect(screen.getByText('이메일 인증을 마친 계정으로 로그인하세요.')).toBeInTheDocument();
  });

  it('shows signup guidance', () => {
    renderLogin();
    expect(screen.getByText('회원가입')).toBeInTheDocument();
    expect(screen.getByText(/가입 후 권한 변경은 슈퍼 어드민이 관리합니다/)).toBeInTheDocument();
  });

  it('updates input values on change', async () => {
    renderLogin();
    const user = userEvent.setup();

    const emailInput = screen.getByPlaceholderText('name@company.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');

    await user.type(emailInput, 'test@test.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@test.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('stores token and email on successful login', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        token: 'test-token',
        name: '홍길동',
        email: 'test@test.com',
        role: 'USER',
        permissionPreset: 'VIEWER',
        pagePermissions: ['DASHBOARD', 'CURRENT_STOCK', 'STOCK_LEDGER', 'HISTORY'],
        passwordChangeRequired: true,
        message: 'success',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    });

    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('name@company.com'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
    await user.click(screen.getByRole('button', { name: /로그인/ }));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('test-token');
      expect(localStorage.getItem('name')).toBe('홍길동');
      expect(localStorage.getItem('email')).toBe('test@test.com');
      expect(localStorage.getItem('role')).toBe('USER');
      expect(localStorage.getItem('permissionPreset')).toBe('VIEWER');
      expect(localStorage.getItem('pagePermissions')).toBe(JSON.stringify(['DASHBOARD', 'CURRENT_STOCK', 'STOCK_LEDGER', 'HISTORY']));
      expect(localStorage.getItem('passwordChangeRequired')).toBe('true');
    });
  });

  it('shows error message on failed login', async () => {
    mockedPost.mockRejectedValueOnce(new Error('401'));

    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('name@company.com'), 'wrong@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /로그인/ }));

    await waitFor(() => {
      expect(screen.getByText(/로그인에 실패했습니다/)).toBeInTheDocument();
    });
  });
});
