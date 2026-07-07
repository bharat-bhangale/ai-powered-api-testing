import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../client';
import { environments, type EnvironmentRow, type InsertEnvironmentRow } from '../schema';
import type { EnvironmentVariable } from '@atx/shared/src/types/environment.types';

// ===== Types =====

export interface EnvironmentRecord {
  id: string;
  userId: string;
  name: string;
  variables: EnvironmentVariable[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnvironmentInput {
  id: string;
  userId: string;
  name: string;
  variables?: EnvironmentVariable[];
  isDefault?: boolean;
}

export interface UpdateEnvironmentInput {
  id: string;
  userId: string;
  name?: string;
  variables?: EnvironmentVariable[];
  isDefault?: boolean;
}

// ===== Validation =====

const EnvVarSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
  type: z.enum(['text', 'secret']),
  description: z.string(),
  secretRefId: z.string().optional(),
});

function parseVars(json: string): EnvironmentVariable[] {
  try {
    return z.array(EnvVarSchema).parse(JSON.parse(json)) as EnvironmentVariable[];
  } catch {
    return [];
  }
}

function rowToRecord(row: EnvironmentRow): EnvironmentRecord {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    variables: parseVars(row.variablesJson),
    isDefault: row.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ===== Repository =====

export const environmentsRepository = {
  async listByUser(userId: string): Promise<EnvironmentRecord[]> {
    const db = getDb();
    const rows = await db.select().from(environments).where(eq(environments.userId, userId));
    return rows.map(rowToRecord);
  },

  async getById(params: { id: string; userId: string }): Promise<EnvironmentRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(environments)
      .where(and(eq(environments.id, params.id), eq(environments.userId, params.userId)))
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  },

  async create(input: CreateEnvironmentInput): Promise<EnvironmentRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    
    if (input.isDefault) {
      await db.update(environments).set({ isDefault: false }).where(eq(environments.userId, input.userId));
    }

    const row: InsertEnvironmentRow = {
      id: input.id,
      userId: input.userId,
      name: input.name,
      variablesJson: JSON.stringify(input.variables ?? []),
      isDefault: input.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(environments).values(row);
    const created = await this.getById({ id: input.id, userId: input.userId });
    if (!created) throw new Error('Failed to create environment');
    return created;
  },

  async update(input: UpdateEnvironmentInput): Promise<EnvironmentRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const patch: Partial<InsertEnvironmentRow> = { updatedAt: now };

    if (input.isDefault !== undefined) {
      patch.isDefault = input.isDefault;
      if (input.isDefault) {
        await db.update(environments).set({ isDefault: false }).where(eq(environments.userId, input.userId));
      }
    }

    if (input.name !== undefined) patch.name = input.name;
    if (input.variables !== undefined) patch.variablesJson = JSON.stringify(input.variables);

    await db.update(environments).set(patch).where(and(eq(environments.id, input.id), eq(environments.userId, input.userId)));
    const updated = await this.getById({ id: input.id, userId: input.userId });
    if (!updated) throw new Error('Environment not found after update');
    return updated;
  },

  async delete(params: { id: string; userId: string }): Promise<void> {
    const db = getDb();
    await db.delete(environments).where(and(eq(environments.id, params.id), eq(environments.userId, params.userId)));
  },

  async setDefault(params: { id: string; userId: string }): Promise<void> {
    const db = getDb();
    await db.update(environments).set({ isDefault: false }).where(eq(environments.userId, params.userId));
    await db.update(environments).set({ isDefault: true, updatedAt: new Date().toISOString() }).where(and(eq(environments.id, params.id), eq(environments.userId, params.userId)));
  },
};
