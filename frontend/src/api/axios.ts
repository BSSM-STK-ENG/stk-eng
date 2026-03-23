import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { clearAuthSession, getStoredToken } from '../utils/auth-session';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = getStoredToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
        if (error.response && error.response.status === 401) {
            clearAuthSession();
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
