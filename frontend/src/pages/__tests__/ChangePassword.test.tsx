import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ChangePassword from '../ChangePassword';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: { post: vi.fn(), get: vi.fn(), delete: vi.fn() },
}));

const mockedPost = vi.mocked(api.post);

const renderChangePassword = () =>
  render(
    <BrowserRouter>
      <ChangePassword />
    </BrowserRouter>
  );

describe('ChangePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('role', 'USER');
    localStorage.setItem('email', 'user@test.com');
    localStorage.setItem('passwordChangeRequired', 'false');
  });

  it('shows error when current password is missing', async () => {
    renderChangePassword();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('새 비밀번호 8자 이상'), 'NewPass123!');
    await user.type(screen.getByPlaceholderText('새 비밀번호 다시 입력'), 'NewPass123!');
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    await waitFor(() => {
      expect(screen.getByText('현재 비밀번호를 입력해주세요.')).toBeInTheDocument();
    });
  });

  it('submits current and new password', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {},
      status: 204,
      statusText: 'No Content',
      headers: {},
      config: {} as never,
    });

    renderChangePassword();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('현재 비밀번호 입력'), 'CurrentPass123!');
    await user.type(screen.getByPlaceholderText('새 비밀번호 8자 이상'), 'NewPass123!');
    await user.type(screen.getByPlaceholderText('새 비밀번호 다시 입력'), 'NewPass123!');
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith('/auth/change-password', {
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewPass123!',
      });
    });
  });
});
