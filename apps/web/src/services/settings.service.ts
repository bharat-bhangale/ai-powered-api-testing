import { apiClient } from './api';

export interface SecretReference {
  id: string;
  scope: string;
  label: string;
  keychainService: string;
  keychainAccount: string;
  redactedPreview: string;
  createdAt: string;
  updatedAt: string;
}

export const SettingsService = {
  // Settings
  async getSetting(key: string): Promise<any> {
    const res = await apiClient.get(`/api/settings/${key}`);
    return res.data.value;
  },

  async setSetting(key: string, value: any): Promise<void> {
    await apiClient.put(`/api/settings/${key}`, { value });
  },

  async listSettings(): Promise<Record<string, any>> {
    const res = await apiClient.get('/api/settings');
    return res.data;
  },

  // Secrets
  async listSecrets(): Promise<SecretReference[]> {
    const res = await apiClient.get('/api/secrets');
    return res.data;
  },

  async createSecret(scope: string, label: string, value: string): Promise<SecretReference> {
    const res = await apiClient.post('/api/secrets', { scope, label, value });
    return res.data;
  },

  async deleteSecret(id: string): Promise<void> {
    await apiClient.delete(`/api/secrets/${id}`);
  },
};
