import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../client';
import { backups, type BackupRow, type InsertBackupRow } from '../schema';

// ===== Types =====

export interface BackupRecord {
  id: string;
  userId: string;
  filePath: string;
  kind: string;
  status: string;
  sizeBytes: number;
  checksum?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CreateBackupInput {
  id: string;
  userId: string;
  filePath: string;
  kind: string;
  status: string;
}

export interface UpdateBackupInput {
  id: string;
  userId: string;
  status?: string;
  sizeBytes?: number;
  checksum?: string;
  completedAt?: string;
}

// ===== Map Row =====

function rowToRecord(row: BackupRow): BackupRecord {
  return {
    id: row.id,
    userId: row.userId,
    filePath: row.filePath,
    kind: row.kind,
    status: row.status,
    sizeBytes: row.sizeBytes,
    checksum: row.checksum ?? undefined,
    createdAt: row.createdAt,
    completedAt: row.completedAt ?? undefined,
  };
}

// ===== Repository =====

export const backupsRepository = {
  async listByUser(userId: string): Promise<BackupRecord[]> {
    const db = getDb();
    const rows = await db.select().from(backups).where(eq(backups.userId, userId)).orderBy(desc(backups.createdAt));
    return rows.map(rowToRecord);
  },

  async getById(params: { id: string; userId: string }): Promise<BackupRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(backups)
      .where(and(eq(backups.id, params.id), eq(backups.userId, params.userId)))
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  },

  async create(input: CreateBackupInput): Promise<BackupRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const row: InsertBackupRow = {
      id: input.id,
      userId: input.userId,
      filePath: input.filePath,
      kind: input.kind,
      status: input.status,
      sizeBytes: 0,
      createdAt: now,
    };
    await db.insert(backups).values(row);
    const created = await this.getById({ id: input.id, userId: input.userId });
    if (!created) throw new Error('Failed to create backup record');
    return created;
  },

  async update(input: UpdateBackupInput): Promise<BackupRecord> {
    const db = getDb();
    const patch: Partial<InsertBackupRow> = {};

    if (input.status !== undefined) patch.status = input.status;
    if (input.sizeBytes !== undefined) patch.sizeBytes = input.sizeBytes;
    if (input.checksum !== undefined) patch.checksum = input.checksum;
    if (input.completedAt !== undefined) patch.completedAt = input.completedAt;

    await db.update(backups).set(patch).where(and(eq(backups.id, input.id), eq(backups.userId, input.userId)));
    const updated = await this.getById({ id: input.id, userId: input.userId });
    if (!updated) throw new Error('Backup record not found after update');
    return updated;
  },

  async delete(params: { id: string; userId: string }): Promise<void> {
    const db = getDb();
    await db.delete(backups).where(and(eq(backups.id, params.id), eq(backups.userId, params.userId)));
  },
};
