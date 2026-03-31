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
    </BrowserRouter>,
  );

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders register form', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: '회원가입' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('이름 입력')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@company.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '인증 메일 받기' })).toBeInTheDocument();
  });

  it('shows success state after requesting email verification', async () => {
    mockedPost.mockResolvedValueOnce({
      data: { email: 'new@test.com', message: '인증 메일을 보냈습니다.' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    });

    renderRegister();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('이름 입력'), '신규사용자');
    await user.type(screen.getByPlaceholderText('name@company.com'), 'new@test.com');
    await user.type(screen.getByPlaceholderText('8자 이상 입력'), 'Password123!');
    await user.type(screen.getByPlaceholderText('비밀번호를 다시 입력'), 'Password123!');
    await user.click(screen.getByRole('button', { name: '인증 메일 받기' }));

    await waitFor(() => {
      expect(screen.getByText('인증 메일을 보냈습니다.')).toBeInTheDocument();
    });
  });
});
