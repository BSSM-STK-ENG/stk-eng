import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/login');
  });

  it('renders login page at /login', () => {
    render(<App />);
    expect(screen.getByText('STK Inventory')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@company.com')).toBeInTheDocument();
  });

  it('renders register page at /register', () => {
    window.history.pushState({}, '', '/register');
    render(<App />);
    expect(screen.getByText('회원가입')).toBeInTheDocument();
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
    window.history.pushState({}, '', '/stock/current');
    render(<App />);
    // Should show the layout (sidebar with STK Inventory text is from MainLayout)
    expect(screen.getAllByText('STK Inventory').length).toBeGreaterThan(0);
  });
});
