import type { AuthResponse, PagePermissionKey, Role } from '../types/api';

const AUTH_KEYS = {
  token: 'token',
  name: 'name',
  email: 'email',
  role: 'role',
  permissionPreset: 'permissionPreset',
  pagePermissions: 'pagePermissions',
  passwordChangeRequired: 'passwordChangeRequired',
} as const;

export function saveAuthSession(auth: AuthResponse) {
  localStorage.setItem(AUTH_KEYS.token, auth.token);
  localStorage.setItem(AUTH_KEYS.name, auth.name ?? '');
  localStorage.setItem(AUTH_KEYS.email, auth.email);
  localStorage.setItem(AUTH_KEYS.role, auth.role);
  localStorage.setItem(AUTH_KEYS.permissionPreset, auth.permissionPreset ?? '');
  localStorage.setItem(AUTH_KEYS.pagePermissions, JSON.stringify(auth.pagePermissions ?? []));
  localStorage.setItem(AUTH_KEYS.passwordChangeRequired, String(auth.passwordChangeRequired));
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_KEYS.token);
  localStorage.removeItem(AUTH_KEYS.name);
  localStorage.removeItem(AUTH_KEYS.email);
  localStorage.removeItem(AUTH_KEYS.role);
  localStorage.removeItem(AUTH_KEYS.permissionPreset);
  localStorage.removeItem(AUTH_KEYS.pagePermissions);
  localStorage.removeItem(AUTH_KEYS.passwordChangeRequired);
}

function isTokenExpired(token: string): boolean {
  try {
    const segment = token.split('.')[1];
    if (!segment) return true;
    const payload = JSON.parse(atob(segment));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function getStoredToken(): string | null {
  const token = localStorage.getItem(AUTH_KEYS.token);
  if (!token) return null;
  if (isTokenExpired(token)) {
    clearAuthSession();
    return null;
  }
  return token;
}

export function getStoredEmail() {
  return localStorage.getItem(AUTH_KEYS.email) ?? '';
}

export function getStoredName() {
  return localStorage.getItem(AUTH_KEYS.name) ?? '';
}

export function getStoredRole(): Role | null {
  const role = localStorage.getItem(AUTH_KEYS.role);
  if (role === 'USER' || role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return role;
  }
  return null;
}

export function getStoredPermissionPreset() {
  return localStorage.getItem(AUTH_KEYS.permissionPreset) ?? '';
}

export function getStoredPagePermissions(): PagePermissionKey[] {
  const raw = localStorage.getItem(AUTH_KEYS.pagePermissions);
  if (!raw) {
    return defaultPermissionsForRole(getStoredRole());
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return defaultPermissionsForRole(getStoredRole());
    }
    return parsed.filter(isPagePermissionKey);
  } catch {
    return defaultPermissionsForRole(getStoredRole());
  }
}

export function hasStoredPagePermission(permission: PagePermissionKey) {
  const role = getStoredRole();
  if (role === 'SUPER_ADMIN') {
    return true;
  }
  return getStoredPagePermissions().includes(permission);
}

export function requiresPasswordSetup() {
  return localStorage.getItem(AUTH_KEYS.passwordChangeRequired) === 'true';
}

export function completePasswordSetup() {
  localStorage.setItem(AUTH_KEYS.passwordChangeRequired, 'false');
}

export function updateStoredProfile(profile: {
  name?: string;
  email: string;
  role: Role;
  permissionPreset?: string;
  pagePermissions?: string[];
  passwordChangeRequired: boolean;
}) {
  localStorage.setItem(AUTH_KEYS.name, profile.name ?? '');
  localStorage.setItem(AUTH_KEYS.email, profile.email);
  localStorage.setItem(AUTH_KEYS.role, profile.role);
  localStorage.setItem(AUTH_KEYS.permissionPreset, profile.permissionPreset ?? '');
  localStorage.setItem(AUTH_KEYS.pagePermissions, JSON.stringify(profile.pagePermissions ?? []));
  localStorage.setItem(AUTH_KEYS.passwordChangeRequired, String(profile.passwordChangeRequired));
}

export function getDefaultRouteForRole(role: Role | null) {
  const routes: Array<{ permission: PagePermissionKey; path: string }> = [
    { permission: 'DASHBOARD', path: '/dashboard' },
    { permission: 'CURRENT_STOCK', path: '/stock/current' },
    { permission: 'STOCK_LEDGER', path: '/stock/ledger' },
    { permission: 'HISTORY', path: '/history' },
    { permission: 'INBOUND', path: '/inbound' },
    { permission: 'OUTBOUND', path: '/outbound' },
    { permission: 'CLOSING', path: '/closing' },
    { permission: 'MASTER_DATA', path: '/master-data' },
    { permission: 'ADMIN_ACCOUNTS', path: '/admin/accounts' },
  ];

  if (role === 'SUPER_ADMIN') {
    return '/dashboard';
  }

  const available = getStoredPagePermissions();
  return routes.find((item) => available.includes(item.permission))?.path ?? '/account/password';
}

function defaultPermissionsForRole(role: Role | null): PagePermissionKey[] {
  if (role === 'SUPER_ADMIN') {
    return [
      'DASHBOARD',
      'CURRENT_STOCK',
      'STOCK_LEDGER',
      'HISTORY',
      'INBOUND',
      'OUTBOUND',
      'CLOSING',
      'MASTER_DATA',
      'ADMIN_ACCOUNTS',
    ];
  }
  if (role === 'ADMIN') {
    return ['DASHBOARD', 'CURRENT_STOCK', 'STOCK_LEDGER', 'HISTORY', 'INBOUND', 'OUTBOUND'];
  }
  return ['DASHBOARD', 'CURRENT_STOCK', 'STOCK_LEDGER', 'HISTORY'];
}

function isPagePermissionKey(value: unknown): value is PagePermissionKey {
  return (
    typeof value === 'string' &&
    [
      'DASHBOARD',
      'CURRENT_STOCK',
      'STOCK_LEDGER',
      'HISTORY',
      'INBOUND',
      'OUTBOUND',
      'CLOSING',
      'MASTER_DATA',
      'ADMIN_ACCOUNTS',
    ].includes(value)
  );
}
