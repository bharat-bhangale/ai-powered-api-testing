import { dbProvider } from '../../data/database-provider';

export class SettingsService {
  /**
   * Gets a specific setting by key.
   */
  async getSetting(key: string): Promise<any> {
    return await dbProvider.settings.getByKey(key);
  }

  /**
   * Sets a specific setting key to the given value.
   */
  async setSetting(key: string, value: any): Promise<void> {
    await dbProvider.settings.set({ key, value });
  }

  /**
   * Lists all settings.
   */
  async listSettings(): Promise<Record<string, any>> {
    const record = await dbProvider.settings.getAll();
    return record;
  }
}
