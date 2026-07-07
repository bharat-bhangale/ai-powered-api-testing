import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { isDesktopRuntime } from './desktop.service';

/**
 * Fallback base URL used in web mode.
 * Overridden at startup by App.tsx once the desktop API URL is resolved.
 */
const WEB_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Pre-configured Axios instance for all API calls.
 *
 * Base URL lifecycle:
 *   - Web mode: set immediately from VITE_API_URL / localhost:8000
 *   - Desktop mode: starts empty; App.tsx calls setApiBaseUrl() before
 *     any data fetching begins (enforced by the AppInitGuard render gate).
 *
 * Security:
 *   - Request interceptor: attaches access token from authStore
 *   - Response interceptor: auto-refresh on 401, skip redirect in desktop mode
 */
export const apiClient = axios.create({
  baseURL: isDesktopRuntime() ? '' : WEB_BASE_URL,
  withCredentials: true,
  timeout: 60_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Updates the Axios baseURL at runtime.
 * Called by App.tsx after the desktop API URL is resolved.
 * Also used in tests to override the base URL without mocking the module.
 */
export function setApiBaseUrl(url: string): void {
  apiClient.defaults.baseURL = url;
}

/**
 * Returns the currently configured base URL.
 */
export function getApiBaseUrl(): string {
  return apiClient.defaults.baseURL as string;
}

// ===== Request Interceptor =====

/**
 * Attaches the access token from Zustand authStore to every outbound request.
 * In desktop mode no token is needed (no auth wall), so this is a no-op
 * when accessToken is null.
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ===== Response Interceptor =====

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null): void => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

/**
 * Response interceptor — auto-refresh on 401.
 *
 * - Desktop mode: 401 responses are passed through without triggering
 *   token refresh or redirect (desktop has no auth wall).
 * - Web mode: on first 401, attempt token refresh; on failure, logout
 *   and redirect to /login. Concurrent 401s are queued.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // In desktop mode: no auth, no redirect — pass 401 through
    if (isDesktopRuntime()) {
      return Promise.reject(error);
    }

    // Only handle 401s that haven't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If already refreshing, queue the request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await useAuthStore.getState().refreshToken();
        const newToken = useAuthStore.getState().accessToken;
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
