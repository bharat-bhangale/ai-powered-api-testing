import { create } from 'zustand';
import { apiClient } from '../services/api';

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
  isLoading: true,

  // Actions
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

  checkAuth: async () => {
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
