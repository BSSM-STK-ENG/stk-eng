import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Register from '../Register';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: { post: vi.fn(), get: vi.fn(), delete: vi.fn() },
}));
const mockedPost = vi.mocked(api.post);

const renderRegister = () =>
  render(
    <BrowserRouter>
      <Register />
    </BrowserRouter>
  );

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders registration form', () => {
    renderRegister();
    expect(screen.getByText('회원가입')).toBeInTheDocument();
    expect(screen.getByText('관리자 계정을 생성해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('가입하기')).toBeInTheDocument();
  });

  it('has link to login page', () => {
    renderRegister();
    expect(screen.getByText('로그인')).toHaveAttribute('href', '/login');
  });

  it('shows error for mismatched passwords', async () => {
    renderRegister();
    const user = userEvent.setup();

    const inputs = screen.getAllByPlaceholderText('••••••••');
    await user.type(screen.getByPlaceholderText('name@company.com'), 'test@test.com');
    await user.type(inputs[0]!, 'password1');
    await user.type(inputs[1]!, 'password2');
    await user.click(screen.getByText('가입하기'));

    await waitFor(() => {
      expect(screen.getByText(/비밀번호가 일치하지 않습니다/)).toBeInTheDocument();
    });
  });

  it('calls register API on successful submit', async () => {
    mockedPost.mockResolvedValueOnce({
      data: { token: 'new-token', email: 'new@test.com', message: 'created' },
      status: 201,
      statusText: 'Created',
      headers: {},
      config: {} as never,
    });

    renderRegister();
    const user = userEvent.setup();

    const inputs = screen.getAllByPlaceholderText('••••••••');
    await user.type(screen.getByPlaceholderText('name@company.com'), 'new@test.com');
    await user.type(inputs[0]!, 'password123');
    await user.type(inputs[1]!, 'password123');
    await user.click(screen.getByText('가입하기'));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith('/auth/register', {
        email: 'new@test.com',
        password: 'password123',
      });
      expect(localStorage.getItem('token')).toBe('new-token');
    });
  });
});
