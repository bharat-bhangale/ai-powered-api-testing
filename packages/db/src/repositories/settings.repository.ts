import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../client';
import { settings, type SettingsRow } from '../schema';

// ===== Default values =====

const SETTING_DEFAULTS: Record<string, unknown> = {
  general: { theme: 'dark', startupRoute: '/', minimizeToTray: false, historyRetentionDays: 90 },
  ai: { model: 'gemini-3.5-flash', showUsage: true, apiKeyRefId: null },
  proxy: { mode: 'none', host: '', port: 8080, authRefId: null },
  certificates: { defaultCertificateId: null },
  updates: { channel: 'stable', autoCheck: true, autoDownload: false },
  data: { backupLocation: '', backupRetentionDays: 30 },
  passphrase: { enabled: false },
};

// ===== Types =====

export interface SettingRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface SetSettingInput {
  key: string;
  value: unknown;
}

// ===== Validation =====

const SettingsRowSchema = z.object({
  key: z.string(),
  valueJson: z.string(),
  updatedAt: z.string(),
});

function parseSettingRow(raw: SettingsRow): SettingRecord {
  const validated = SettingsRowSchema.parse(raw);
  let value: unknown;
  try {
    value = JSON.parse(validated.valueJson);
  } catch {
    throw new Error(`[settings] Invalid JSON stored for key "${validated.key}"`);
  }
  return { key: validated.key, value, updatedAt: validated.updatedAt };
}

// ===== Repository =====

export const settingsRepository = {
  async getAll(): Promise<Record<string, unknown>> {
    const db = getDb();
    const rows = await db.select().from(settings);
    const result: Record<string, unknown> = { ...SETTING_DEFAULTS };
    for (const row of rows) {
      const parsed = parseSettingRow(row);
      result[parsed.key] = parsed.value;
    }
    return result;
  },

  async getByKey(key: string): Promise<SettingRecord> {
    const db = getDb();
    const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    if (rows[0]) {
      return parseSettingRow(rows[0]);
    }
    // Return default if key is missing
    const defaultValue = SETTING_DEFAULTS[key] ?? null;
    return { key, value: defaultValue, updatedAt: new Date().toISOString() };
  },

  async set(input: SetSettingInput): Promise<SettingRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const valueJson = JSON.stringify(input.value);

    await db
      .insert(settings)
      .values({ key: input.key, valueJson, updatedAt: now })
      .onConflictDoUpdate({ target: settings.key, set: { valueJson, updatedAt: now } });

    return { key: input.key, value: input.value, updatedAt: now };
  },

  async reset(key: string): Promise<SettingRecord> {
    const defaultValue = SETTING_DEFAULTS[key] ?? null;
    return this.set({ key, value: defaultValue });
  },
};
