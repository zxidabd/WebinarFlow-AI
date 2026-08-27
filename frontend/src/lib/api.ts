/**
 * Axios API client for the backend.
 *
 * Base URL resolves from NEXT_PUBLIC_API_URL, falling back to same-origin /api
 * (which next.config.mjs rewrites to the backend). Tokens are pulled from the
 * persisted auth store on each request and refreshed on 401.
 */
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

const rawUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
export const API_BASE_URL = rawUrl
  ? rawUrl.endsWith('/api/v1')
    ? rawUrl
    : `${rawUrl}/api/v1`
  : 'https://webinarflow-ai.onrender.com/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

let bootstrapped = false;
function readToken(): string | null {
  // Read from persisted zustand-auth slice without importing the store (avoid cycle).
  try {
    const raw = localStorage.getItem('webinarflow-auth');
    if (!raw) return null;
    return (JSON.parse(raw)?.state?.accessToken as string) || null;
  } catch {
    return null;
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!bootstrapped) bootstrapped = true;
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Single-flight refresh on 401.
let refreshing: Promise<string | null> | null = null;

async function refresh(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const res = await axios.post<{ accessToken: string }>(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      const next = res.data.accessToken;
      try {
        const raw = localStorage.getItem('webinarflow-auth');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.state.accessToken = next;
          localStorage.setItem('webinarflow-auth', JSON.stringify(parsed));
        }
      } catch {
        /* ignore */
      }
      return next;
    } catch {
      localStorage.removeItem('webinarflow-auth');
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      const next = await refresh();
      if (next) {
        original.headers.Authorization = `Bearer ${next}`;
        return api(original);
      }
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
