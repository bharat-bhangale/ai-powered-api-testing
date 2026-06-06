import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../client';
import { collections, type CollectionRow, type InsertCollectionRow } from '../schema';

// ===== Types =====

export interface AuthConfig {
  type: 'none' | 'apikey' | 'bearer' | 'basic';
  config: Record<string, unknown>;
}

export interface CollectionRecord {
  id: string;
  userId: string;
  name: string;
  description: string;
  auth: AuthConfig;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollectionInput {
  id: string;
  userId: string;
  name: string;
  description?: string;
  auth?: AuthConfig;
  sortOrder?: number;
}

export interface UpdateCollectionInput {
  id: string;
  userId: string;
  name?: string;
  description?: string;
  auth?: AuthConfig;
  sortOrder?: number;
}

export interface ReorderCollectionInput {
  id: string;
  userId: string;
  sortOrder: number;
}

// ===== Validation =====

const AuthConfigSchema = z.object({
  type: z.enum(['none', 'apikey', 'bearer', 'basic']),
  config: z.record(z.unknown()),
});

function parseAuthConfig(json: string): AuthConfig {
  try {
    return AuthConfigSchema.parse(JSON.parse(json));
  } catch {
    return { type: 'none', config: {} };
  }
}

function rowToRecord(row: CollectionRow): CollectionRecord {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description,
    auth: parseAuthConfig(row.authConfigJson),
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ===== Repository =====

export const collectionsRepository = {
  async listByUser(userId: string): Promise<CollectionRecord[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(collections)
      .where(eq(collections.userId, userId))
      .orderBy(asc(collections.sortOrder));
    return rows.map(rowToRecord);
  },

  async getById(params: { id: string; userId: string }): Promise<CollectionRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(collections)
      .where(eq(collections.id, params.id))
      .limit(1);
    if (!rows[0] || rows[0].userId !== params.userId) return null;
    return rowToRecord(rows[0]);
  },

  async create(input: CreateCollectionInput): Promise<CollectionRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const row: InsertCollectionRow = {
      id: input.id,
      userId: input.userId,
      name: input.name,
      description: input.description ?? '',
      authType: input.auth?.type ?? 'none',
      authConfigJson: JSON.stringify(input.auth ?? { type: 'none', config: {} }),
      sortOrder: input.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(collections).values(row);
    const created = await this.getById({ id: input.id, userId: input.userId });
    if (!created) throw new Error('Failed to create collection');
    return created;
  },

  async update(input: UpdateCollectionInput): Promise<CollectionRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const patch: Partial<InsertCollectionRow> = { updatedAt: now };
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.auth !== undefined) {
      patch.authType = input.auth.type;
      patch.authConfigJson = JSON.stringify(input.auth);
    }
    if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

    await db.update(collections).set(patch).where(eq(collections.id, input.id));
    const updated = await this.getById({ id: input.id, userId: input.userId });
    if (!updated) throw new Error('Collection not found after update');
    return updated;
  },

  async delete(params: { id: string; userId: string }): Promise<void> {
    const db = getDb();
    await db.delete(collections).where(eq(collections.id, params.id));
  },

  async reorder(input: ReorderCollectionInput): Promise<void> {
    const db = getDb();
    await db
      .update(collections)
      .set({ sortOrder: input.sortOrder, updatedAt: new Date().toISOString() })
      .where(eq(collections.id, input.id));
  },
};
