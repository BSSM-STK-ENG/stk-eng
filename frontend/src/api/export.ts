const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

export const exportUrl = (path: string) => `${BASE}/export/${path}`;
