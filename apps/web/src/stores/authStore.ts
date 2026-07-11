import { create } from 'zustand';
import { apiClient } from '../services/api';
import { isDesktopRuntime } from '../services/desktop.service';

// ===== Local user constant (mirrors desktop-auth.service.ts) =====

/** Stable synthetic user presented to the UI in desktop mode. */
const DESKTOP_LOCAL_USER = {
  _id: 'local-user',
  email: 'local@atx.desktop',
  name: 'Local User',
  avatar: undefined as string | undefined,
  preferences: {
    theme: 'dark' as const,
    editorFontSize: 14,
  },
};

// ===== Types =====

interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  preferences: {
    theme: string;
    editorFontSize: number;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setAccessToken: (token: string | null) => void;
}

type AuthStore = AuthState & AuthActions;

// Guard against double-invocation from React StrictMode
let _checkAuthInFlight = false;

// ===== Store =====

export const useAuthStore = create<AuthStore>((set, get) => ({
  // State
  user: null,
  accessToken: null,
  isAuthenticated: false,
  /**
   * isLoading:
   *   - Web mode: true initially (we must verify session before rendering)
   *   - Desktop mode: false (no session to check; local user is pre-known)
   */
  isLoading: !isDesktopRuntime(),

  // ===== Actions =====

  login: async (email: string, password: string) => {
    const res = await apiClient.post('/api/auth/login', { email, password });
    const { user, accessToken } = res.data.data;
    set({ user, accessToken, isAuthenticated: true });
  },

  register: async (email: string, name: string, password: string) => {
    const res = await apiClient.post('/api/auth/register', {
      email,
      name,
      password,
    });
    const { user, accessToken } = res.data.data;
    set({ user, accessToken, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
      // Logout even if API call fails
    }
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  // refreshToken no longer re-throws — callers handle the failure via catch
  refreshToken: async () => {
    const res = await apiClient.post('/api/auth/refresh');
    const { accessToken } = res.data.data;
    set({ accessToken });
  },

  /**
   * checkAuth — verifies the current session and hydrates the auth state.
   *
   * Desktop mode:
   *   - No JWT tokens or cookies exist.
   *   - Call GET /api/auth/me which returns the local user profile directly.
   *   - Set isAuthenticated: true immediately.
   *
   * Web mode:
   *   - Attempt token refresh using the httpOnly cookie.
   *   - Then fetch /api/auth/me with the new access token.
   *   - On failure: set isLoading:false + isAuthenticated:false → redirects to /login.
   */
  checkAuth: async () => {
    // Prevent duplicate calls (React StrictMode double-invokes effects)
    if (_checkAuthInFlight) return;
    _checkAuthInFlight = true;

    if (isDesktopRuntime()) {
      try {
        const res = await apiClient.get('/api/auth/me');
        const user: User = res.data.data.user ?? DESKTOP_LOCAL_USER;
        set({ user, accessToken: null, isAuthenticated: true, isLoading: false });
      } catch {
        set({ user: DESKTOP_LOCAL_USER, accessToken: null, isAuthenticated: true, isLoading: false });
      } finally {
        _checkAuthInFlight = false;
      }
      return;
    }

    // Web mode: standard JWT session check
    try {
      await get().refreshToken();
      const res = await apiClient.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${get().accessToken}` },
      });
      set({ user: res.data.data.user, isAuthenticated: true, isLoading: false });
    } catch {
      // No valid session — ProtectedRoute will redirect to /login
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    } finally {
      _checkAuthInFlight = false;
    }
  },

  setAccessToken: (token: string | null) => {
    set({ accessToken: token });
  },
}));
