import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import i18n from '../i18n';
import { useAuthStore } from '../store/auth';
import type { ApiErrorBody, RefreshResponse } from '../types';

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach Bearer access token to every request.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Single in-flight refresh; concurrent 401s queue on this promise.
let refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  // Plain axios (not `api`) so this call skips the interceptors.
  const res = await axios.post<RefreshResponse>('/api/auth/refresh', {
    refresh_token: refreshToken,
  });
  useAuthStore.getState().setTokens(res.data);
  return res.data.access_token;
}

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const isAuthPath = AUTH_PATHS.some((p) => original?.url?.includes(p));

    if (status === 401 && original && !original._retry && !isAuthPath) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = performRefresh().finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

/**
 * Extract the human-readable message from an API error response.
 * Server-provided messages render as-is; generic fallbacks are localized.
 */
export function getApiErrorMessage(err: unknown, fallback?: string): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ApiErrorBody | undefined;
    if (body && typeof body.error === 'string') {
      return body.error;
    }
    if (err.code === 'ERR_NETWORK') {
      return i18n.t('errors.network');
    }
  }
  return fallback ?? i18n.t('errors.generic');
}
