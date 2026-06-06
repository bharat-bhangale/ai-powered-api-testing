import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../client';
import { users, type UserRow, type InsertUserRow } from '../schema';

// ===== Types =====

export type UserRecord = UserRow;

export interface CreateUserInput {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  avatar?: string;
  theme?: string;
  editorFontSize?: number;
}

export interface UpdateUserInput {
  id: string;
  name?: string;
  avatar?: string;
  theme?: string;
  editorFontSize?: number;
  passwordHash?: string;
}

// ===== Validation =====

const UserRowSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  passwordHash: z.string().nullable(),
  avatar: z.string().nullable(),
  theme: z.string(),
  editorFontSize: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

function validateUser(raw: unknown): UserRecord {
  return UserRowSchema.parse(raw) as UserRecord;
}

// ===== Repository =====

export const usersRepository = {
  async getById(id: string): Promise<UserRecord | null> {
    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ? validateUser(rows[0]) : null;
  },

  async getByEmail(email: string): Promise<UserRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return rows[0] ? validateUser(rows[0]) : null;
  },

  async create(input: CreateUserInput): Promise<UserRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const row: InsertUserRow = {
      id: input.id,
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash: input.passwordHash ?? null,
      avatar: input.avatar ?? null,
      theme: input.theme ?? 'dark',
      editorFontSize: input.editorFontSize ?? 14,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(users).values(row);
    const created = await this.getById(input.id);
    if (!created) throw new Error('Failed to create user');
    return created;
  },

  async update(input: UpdateUserInput): Promise<UserRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const patch: Partial<InsertUserRow> = { updatedAt: now };
    if (input.name !== undefined) patch.name = input.name;
    if (input.avatar !== undefined) patch.avatar = input.avatar;
    if (input.theme !== undefined) patch.theme = input.theme;
    if (input.editorFontSize !== undefined) patch.editorFontSize = input.editorFontSize;
    if (input.passwordHash !== undefined) patch.passwordHash = input.passwordHash;

    await db.update(users).set(patch).where(eq(users.id, input.id));
    const updated = await this.getById(input.id);
    if (!updated) throw new Error('User not found after update');
    return updated;
  },
};
