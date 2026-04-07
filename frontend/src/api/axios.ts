import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { clearAuthSession, getStoredToken } from '../utils/auth-session';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 403) {
      const data = error.response.data as Record<string, unknown> | undefined;
      const message = typeof data?.message === 'string' ? data.message : '접근 권한이 없습니다.';
      window.dispatchEvent(new CustomEvent('stk:permission-denied', { detail: { message } }));
    }
    if (error.response?.status === 401) {
      clearAuthSession();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export async function getMe() {
  const response = await api.get('/auth/me');
  return response.data;
}

export default api;
