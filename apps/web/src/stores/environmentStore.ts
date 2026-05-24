import { create } from 'zustand';
import { apiClient } from '@/services/api';

// ===== Types =====

export interface EnvironmentVariable {
  key: string;
  value: string;
  type: 'text' | 'secret';
  description: string;
}

export interface EnvironmentData {
  _id: string;
  name: string;
  variables: EnvironmentVariable[];
  isDefault: boolean;
}

interface EnvironmentStore {
  environments: EnvironmentData[];
  activeEnvironmentId: string | null;
  isLoading: boolean;

  fetchEnvironments: () => Promise<void>;
  setActiveEnvironment: (id: string | null) => void;
  getActiveVariables: () => Record<string, string>;
  getVariableNames: () => string[];
  createEnvironment: (name: string) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;
}

// ===== LocalStorage Key =====
const ACTIVE_ENV_KEY = 'apiTool_activeEnvironmentId';

/**
 * Environment store — manages environments, active selection (persisted in localStorage),
 * and provides variable lookups for auto-complete and resolver.
 */
export const useEnvironmentStore = create<EnvironmentStore>((set, get) => ({
  environments: [],
  activeEnvironmentId: localStorage.getItem(ACTIVE_ENV_KEY),
  isLoading: false,

  fetchEnvironments: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get('/api/environments');
      const envs: EnvironmentData[] = res.data.data.environments;

      // If no activeEnvironmentId yet, pick the default or first
      const current = get().activeEnvironmentId;
      let activeId = current;
      if (!activeId || !envs.find((e) => e._id === activeId)) {
        const defaultEnv = envs.find((e) => e.isDefault);
        activeId = defaultEnv?._id || envs[0]?._id || null;
        if (activeId) localStorage.setItem(ACTIVE_ENV_KEY, activeId);
      }

      set({ environments: envs, activeEnvironmentId: activeId, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setActiveEnvironment: (id) => {
    if (id) {
      localStorage.setItem(ACTIVE_ENV_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_ENV_KEY);
    }
    set({ activeEnvironmentId: id });
  },

  getActiveVariables: () => {
    const { environments, activeEnvironmentId } = get();
    const env = environments.find((e) => e._id === activeEnvironmentId);
    if (!env) return {};

    const vars: Record<string, string> = {};
    env.variables.forEach((v) => {
      vars[v.key] = v.value;
    });
    return vars;
  },

  getVariableNames: () => {
    const { environments, activeEnvironmentId } = get();
    const env = environments.find((e) => e._id === activeEnvironmentId);
    if (!env) return [];
    return env.variables.map((v) => v.key);
  },

  createEnvironment: async (name) => {
    try {
      await apiClient.post('/api/environments', { name });
      await get().fetchEnvironments();
    } catch { /* handled by caller */ }
  },

  deleteEnvironment: async (id) => {
    try {
      await apiClient.delete(`/api/environments/${id}`);
      const { activeEnvironmentId } = get();
      if (activeEnvironmentId === id) {
        localStorage.removeItem(ACTIVE_ENV_KEY);
        set({ activeEnvironmentId: null });
      }
      await get().fetchEnvironments();
    } catch { /* handled by caller */ }
  },
}));
