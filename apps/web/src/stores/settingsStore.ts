import { create } from 'zustand';
import { SettingsService, SecretReference } from '../services/settings.service';

interface SettingsState {
  settings: Record<string, any>;
  secrets: SecretReference[];
  isLoading: boolean;
  error: string | null;

  fetchSettings: () => Promise<void>;
  fetchSecrets: () => Promise<void>;
  setSetting: (key: string, value: any) => Promise<void>;
  addSecret: (scope: string, label: string, value: string) => Promise<void>;
  deleteSecret: (id: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  secrets: [],
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await SettingsService.listSettings();
      set({ settings, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch settings', isLoading: false });
    }
  },

  fetchSecrets: async () => {
    set({ isLoading: true, error: null });
    try {
      const secrets = await SettingsService.listSecrets();
      set({ secrets, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch secrets', isLoading: false });
    }
  },

  setSetting: async (key: string, value: any) => {
    try {
      await SettingsService.setSetting(key, value);
      const { settings } = get();
      set({ settings: { ...settings, [key]: value } });
    } catch (error: any) {
      set({ error: error.message || `Failed to set setting ${key}` });
      throw error;
    }
  },

  addSecret: async (scope: string, label: string, value: string) => {
    try {
      const newSecret = await SettingsService.createSecret(scope, label, value);
      const { secrets } = get();
      set({ secrets: [...secrets, newSecret] });
    } catch (error: any) {
      set({ error: error.message || 'Failed to add secret' });
      throw error;
    }
  },

  deleteSecret: async (id: string) => {
    try {
      await SettingsService.deleteSecret(id);
      const { secrets } = get();
      set({ secrets: secrets.filter((s) => s.id !== id) });
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete secret' });
      throw error;
    }
  },
}));
