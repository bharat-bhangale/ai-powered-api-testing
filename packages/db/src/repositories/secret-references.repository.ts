import { eq, and } from 'drizzle-orm';
import { getDb } from '../client';
import { secretReferences, type SecretReferenceRow, type InsertSecretReferenceRow } from '../schema';

// ===== Types =====

export interface SecretReferenceRecord {
  id: string;
  userId: string;
  scope: string;
  label: string;
  keychainService: string;
  keychainAccount: string;
  redactedPreview: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSecretReferenceInput {
  id: string;
  userId: string;
  scope: string;
  label: string;
  keychainService: string;
  keychainAccount: string;
  redactedPreview?: string;
}

export interface UpdateSecretReferenceInput {
  id: string;
  userId: string;
  label?: string;
  redactedPreview?: string;
}

// ===== Map Row =====

function rowToRecord(row: SecretReferenceRow): SecretReferenceRecord {
  return {
    id: row.id,
    userId: row.userId,
    scope: row.scope,
    label: row.label,
    keychainService: row.keychainService,
    keychainAccount: row.keychainAccount,
    redactedPreview: row.redactedPreview,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ===== Repository =====

export const secretReferencesRepository = {
  async listByUser(userId: string): Promise<SecretReferenceRecord[]> {
    const db = getDb();
    const rows = await db.select().from(secretReferences).where(eq(secretReferences.userId, userId));
    return rows.map(rowToRecord);
  },

  async getById(params: { id: string; userId: string }): Promise<SecretReferenceRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(secretReferences)
      .where(and(eq(secretReferences.id, params.id), eq(secretReferences.userId, params.userId)))
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  },

  async create(input: CreateSecretReferenceInput): Promise<SecretReferenceRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const row: InsertSecretReferenceRow = {
      id: input.id,
      userId: input.userId,
      scope: input.scope,
      label: input.label,
      keychainService: input.keychainService,
      keychainAccount: input.keychainAccount,
      redactedPreview: input.redactedPreview ?? '********',
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(secretReferences).values(row);
    const created = await this.getById({ id: input.id, userId: input.userId });
    if (!created) throw new Error('Failed to create secret reference');
    return created;
  },

  async update(input: UpdateSecretReferenceInput): Promise<SecretReferenceRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const patch: Partial<InsertSecretReferenceRow> = { updatedAt: now };

    if (input.label !== undefined) patch.label = input.label;
    if (input.redactedPreview !== undefined) patch.redactedPreview = input.redactedPreview;

    await db.update(secretReferences).set(patch).where(and(eq(secretReferences.id, input.id), eq(secretReferences.userId, input.userId)));
    const updated = await this.getById({ id: input.id, userId: input.userId });
    if (!updated) throw new Error('Secret reference not found after update');
    return updated;
  },

  async delete(params: { id: string; userId: string }): Promise<void> {
    const db = getDb();
    await db.delete(secretReferences).where(and(eq(secretReferences.id, params.id), eq(secretReferences.userId, params.userId)));
  },
};
