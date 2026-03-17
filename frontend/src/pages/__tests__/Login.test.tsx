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
    expect(screen.getByText('로그인')).toBeInTheDocument();
  });

  it('renders title and description', () => {
    renderLogin();
    expect(screen.getByText('STK Inventory')).toBeInTheDocument();
    expect(screen.getByText('재고 관리 시스템에 오신 것을 환영합니다.')).toBeInTheDocument();
  });

  it('has link to register page', () => {
    renderLogin();
    expect(screen.getByText('회원가입')).toHaveAttribute('href', '/register');
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
      data: { token: 'test-token', email: 'test@test.com', message: 'success' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    });

    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('name@company.com'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
    await user.click(screen.getByText('로그인'));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('test-token');
      expect(localStorage.getItem('email')).toBe('test@test.com');
    });
  });

  it('shows error message on failed login', async () => {
    mockedPost.mockRejectedValueOnce(new Error('401'));

    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('name@company.com'), 'wrong@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpass');
    await user.click(screen.getByText('로그인'));

    await waitFor(() => {
      expect(screen.getByText(/로그인에 실패했습니다/)).toBeInTheDocument();
    });
  });
});
