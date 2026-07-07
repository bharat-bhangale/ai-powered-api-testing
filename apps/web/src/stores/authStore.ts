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

  refreshToken: async () => {
    try {
      const res = await apiClient.post('/api/auth/refresh');
      const { accessToken } = res.data.data;
      set({ accessToken });
    } catch {
      set({ user: null, accessToken: null, isAuthenticated: false });
      throw new Error('Token refresh failed');
    }
  },

  /**
   * checkAuth — verifies the current session and hydrates the auth state.
   *
   * Desktop mode:
   *   - No JWT tokens or cookies exist.
   *   - Call GET /api/auth/me which returns the local user profile directly
   *     (authenticate middleware injects local-user without requiring a header).
   *   - Set isAuthenticated: true immediately.
   *
   * Web mode (unchanged):
   *   - Attempt token refresh using the httpOnly cookie.
   *   - Then fetch /api/auth/me with the new access token.
   *   - On failure: set unauthenticated.
   */
  checkAuth: async () => {
    if (isDesktopRuntime()) {
      // Desktop: fetch local user profile from the already-running API
      try {
        const res = await apiClient.get('/api/auth/me');
        const user: User = res.data.data.user ?? DESKTOP_LOCAL_USER;
        set({
          user,
          accessToken: null,  // No JWT in desktop mode
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        // API not reachable yet — use the static fallback profile
        set({
          user: DESKTOP_LOCAL_USER,
          accessToken: null,
          isAuthenticated: true,
          isLoading: false,
        });
      }
      return;
    }

    // Web mode: standard JWT session check
    try {
      // Try refreshing the token first (uses httpOnly cookie)
      await get().refreshToken();

      // Fetch user profile
      const res = await apiClient.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${get().accessToken}` },
      });
      set({
        user: res.data.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  setAccessToken: (token: string | null) => {
    set({ accessToken: token });
  },
}));
