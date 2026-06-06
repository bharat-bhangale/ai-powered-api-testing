import { User } from '../models/User.model';
import type { AtxDataProvider } from './database-provider';
import type { UserRecord, CreateUserInput, UpdateUserInput, SettingRecord, SetSettingInput } from '@atx/db';

/**
 * The MongoDB data provider implementation.
 * Wraps existing Mongoose models to match the AtxDataProvider interface.
 * 
 * NOTE: Only users and settings are implemented for the boundary proof of concept.
 * The remaining entities currently proxy to Mongoose in their respective services 
 * but will be moved here in later phases.
 */
export const mongoProvider: AtxDataProvider = {
  users: {
    getById: async (id: string): Promise<UserRecord | null> => {
      const u = await User.findById(id);
      if (!u) return null;
      return {
        id: u._id.toString(),
        email: u.email,
        name: u.name,
        passwordHash: u.passwordHash,
        avatar: u.avatar ?? null,
        theme: u.preferences?.theme ?? 'dark',
        editorFontSize: u.preferences?.editorFontSize ?? 14,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      };
    },

    getByEmail: async (email: string): Promise<UserRecord | null> => {
      const u = await User.findOne({ email: email.toLowerCase() });
      if (!u) return null;
      return {
        id: u._id.toString(),
        email: u.email,
        name: u.name,
        passwordHash: u.passwordHash,
        avatar: u.avatar ?? null,
        theme: u.preferences?.theme ?? 'dark',
        editorFontSize: u.preferences?.editorFontSize ?? 14,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      };
    },

    create: async (input: CreateUserInput): Promise<UserRecord> => {
      const u = new User({
        _id: input.id,
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash: input.passwordHash,
        avatar: input.avatar,
        preferences: {
          theme: input.theme ?? 'dark',
          editorFontSize: input.editorFontSize ?? 14,
        },
      });
      await u.save();
      const created = await mongoProvider.users.getById(u._id.toString());
      if (!created) throw new Error('Failed to create user in Mongo');
      return created;
    },

    update: async (input: UpdateUserInput): Promise<UserRecord> => {
      const u = await User.findById(input.id);
      if (!u) throw new Error('User not found');

      if (input.name !== undefined) u.name = input.name;
      if (input.avatar !== undefined) u.avatar = input.avatar;
      if (input.passwordHash !== undefined) u.passwordHash = input.passwordHash;
      
      if (input.theme !== undefined || input.editorFontSize !== undefined) {
        u.preferences = u.preferences || {};
        if (input.theme !== undefined) u.preferences.theme = input.theme as any;
        if (input.editorFontSize !== undefined) u.preferences.editorFontSize = input.editorFontSize;
      }

      await u.save();
      const updated = await mongoProvider.users.getById(u._id.toString());
      if (!updated) throw new Error('Failed to fetch user after update');
      return updated;
    },
  },

  settings: {
    getAll: async (): Promise<Record<string, unknown>> => ({}), // Not yet backed by Mongoose
    getByKey: async (key: string): Promise<SettingRecord> => ({ key, value: null, updatedAt: new Date().toISOString() }),
    set: async (input: SetSettingInput): Promise<SettingRecord> => ({ key: input.key, value: input.value, updatedAt: new Date().toISOString() }),
    reset: async (key: string): Promise<SettingRecord> => ({ key, value: null, updatedAt: new Date().toISOString() }),
  },

  // Remaining entities are stubbed out as any. They are not yet migrated to the provider boundary.
  collections: {} as any,
  folders: {} as any,
  requests: {} as any,
  environments: {} as any,
  history: {} as any,
  testRuns: {} as any,
  schedules: {} as any,
  schemaContracts: {} as any,
  secretReferences: {} as any,
  certificates: {} as any,
  backups: {} as any,
};
