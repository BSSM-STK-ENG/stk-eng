import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../api/axios';
import SetupPassword from '../SetupPassword';

vi.mock('../../api/axios', () => ({
  default: { post: vi.fn(), get: vi.fn(), delete: vi.fn() },
}));

const mockedPost = vi.mocked(api.post);

const renderSetupPassword = () =>
  render(
    <BrowserRouter>
      <SetupPassword />
    </BrowserRouter>,
  );

describe('SetupPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('name', '');
    localStorage.setItem('role', 'USER');
    localStorage.setItem('passwordChangeRequired', 'true');
  });

  it('shows error for mismatched passwords', async () => {
    renderSetupPassword();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('앞으로 사용할 이름'), '홍길동');
    await user.type(screen.getByPlaceholderText('새 비밀번호 8자 이상'), 'password123');
    await user.type(screen.getByPlaceholderText('새 비밀번호 다시 입력'), 'password321');
    await user.click(screen.getByText('비밀번호 저장'));

    await waitFor(() => {
      expect(screen.getByText('비밀번호가 일치하지 않습니다.')).toBeInTheDocument();
    });
  });

  it('clears password change flag after successful submit', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {},
      status: 204,
      statusText: 'No Content',
      headers: {},
      config: {} as never,
    });

    renderSetupPassword();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('앞으로 사용할 이름'), '홍길동');
    await user.type(screen.getByPlaceholderText('새 비밀번호 8자 이상'), 'password123');
    await user.type(screen.getByPlaceholderText('새 비밀번호 다시 입력'), 'password123');
    await user.click(screen.getByText('비밀번호 저장'));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith('/auth/change-password', { name: '홍길동', newPassword: 'password123' });
      expect(localStorage.getItem('name')).toBe('홍길동');
      expect(localStorage.getItem('passwordChangeRequired')).toBe('false');
    });
  });
});
