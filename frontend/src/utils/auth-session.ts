import { AuthResponse, Role } from '../types/api';

const AUTH_KEYS = {
  token: 'token',
  email: 'email',
  role: 'role',
  passwordChangeRequired: 'passwordChangeRequired',
} as const;

export const INITIAL_ISSUED_PASSWORD = '1234';

export function saveAuthSession(auth: AuthResponse) {
  localStorage.setItem(AUTH_KEYS.token, auth.token);
  localStorage.setItem(AUTH_KEYS.email, auth.email);
  localStorage.setItem(AUTH_KEYS.role, auth.role);
  localStorage.setItem(AUTH_KEYS.passwordChangeRequired, String(auth.passwordChangeRequired));
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_KEYS.token);
  localStorage.removeItem(AUTH_KEYS.email);
  localStorage.removeItem(AUTH_KEYS.role);
  localStorage.removeItem(AUTH_KEYS.passwordChangeRequired);
}

export function getStoredToken() {
  return localStorage.getItem(AUTH_KEYS.token);
}

export function getStoredEmail() {
  return localStorage.getItem(AUTH_KEYS.email) ?? '';
}

export function getStoredRole(): Role | null {
  const role = localStorage.getItem(AUTH_KEYS.role);
  if (role === 'USER' || role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return role;
  }
  return null;
}

export function requiresPasswordSetup() {
  return localStorage.getItem(AUTH_KEYS.passwordChangeRequired) === 'true';
}

export function completePasswordSetup() {
  localStorage.setItem(AUTH_KEYS.passwordChangeRequired, 'false');
}

export function getDefaultRouteForRole(role: Role | null) {
  return role === 'SUPER_ADMIN' ? '/admin/accounts' : '/stock/current';
}
