import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

  it('renders protected route when authenticated', () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('email', 'test@test.com');
    localStorage.setItem('role', 'USER');
    localStorage.setItem('passwordChangeRequired', 'false');
    window.history.pushState({}, '', '/stock/current');
    render(<App />);
    // Should show the layout (sidebar with STK Inventory text is from MainLayout)
    expect(screen.getAllByText('STK Inventory').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('채팅 패널')).toBeInTheDocument();
  });

  it('redirects authenticated users who must change password', () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('email', 'test@test.com');
    localStorage.setItem('role', 'USER');
    localStorage.setItem('passwordChangeRequired', 'true');
    window.history.pushState({}, '', '/stock/current');
    render(<App />);
    expect(screen.getByText('비밀번호 설정')).toBeInTheDocument();
  });

  it('renders super admin account page for super admin users', () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('email', 'superadmin@test.com');
    localStorage.setItem('role', 'SUPER_ADMIN');
    localStorage.setItem('passwordChangeRequired', 'false');
    window.history.pushState({}, '', '/admin/accounts');
    render(<App />);
    expect(screen.getByText('계정 발급 센터')).toBeInTheDocument();
  });
});
