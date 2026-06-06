import { eq, and, desc, lt } from 'drizzle-orm';
import { getDb } from '../client';
import { historyEntries, type HistoryEntryRow, type InsertHistoryEntryRow } from '../schema';

// ===== Types =====

export interface HistoryRecord {
  id: string;
  userId: string;
  collectionId?: string;
  requestId?: string;
  environmentName?: string;
  request: unknown;
  response: unknown;
  executedAt: string;
  createdAt: string;
}

export interface RecordHistoryInput {
  id: string;
  userId: string;
  collectionId?: string;
  requestId?: string;
  environmentName?: string;
  request: unknown;
  response: unknown;
  executedAt: string;
}

export interface SearchHistoryInput {
  userId: string;
  limit?: number;
  offset?: number;
}

// ===== Map Row =====

function rowToRecord(row: HistoryEntryRow): HistoryRecord {
  return {
    id: row.id,
    userId: row.userId,
    collectionId: row.collectionId ?? undefined,
    requestId: row.requestId ?? undefined,
    environmentName: row.environmentName ?? undefined,
    request: JSON.parse(row.requestJson),
    response: JSON.parse(row.responseJson),
    executedAt: row.executedAt,
    createdAt: row.createdAt,
  };
}

// ===== Repository =====

export const historyRepository = {
  async record(input: RecordHistoryInput): Promise<HistoryRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const row: InsertHistoryEntryRow = {
      id: input.id,
      userId: input.userId,
      collectionId: input.collectionId ?? null,
      requestId: input.requestId ?? null,
      environmentName: input.environmentName ?? null,
      requestJson: JSON.stringify(input.request),
      responseJson: JSON.stringify(input.response),
      executedAt: input.executedAt,
      createdAt: now,
    };
    await db.insert(historyEntries).values(row);
    const created = await this.getById({ id: input.id, userId: input.userId });
    if (!created) throw new Error('Failed to record history');
    return created;
  },

  async search(input: SearchHistoryInput): Promise<HistoryRecord[]> {
    const db = getDb();
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
    
    const rows = await db
      .select()
      .from(historyEntries)
      .where(eq(historyEntries.userId, input.userId))
      .orderBy(desc(historyEntries.executedAt))
      .limit(limit)
      .offset(offset);
      
    return rows.map(rowToRecord);
  },

  async getById(params: { id: string; userId: string }): Promise<HistoryRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(historyEntries)
      .where(and(eq(historyEntries.id, params.id), eq(historyEntries.userId, params.userId)))
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  },

  async delete(params: { id: string; userId: string }): Promise<void> {
    const db = getDb();
    await db.delete(historyEntries).where(and(eq(historyEntries.id, params.id), eq(historyEntries.userId, params.userId)));
  },

  async clearByUser(userId: string): Promise<void> {
    const db = getDb();
    await db.delete(historyEntries).where(eq(historyEntries.userId, userId));
  },

  async deleteOlderThan(params: { userId: string; cutoffIsoString: string }): Promise<void> {
    const db = getDb();
    await db
      .delete(historyEntries)
      .where(and(eq(historyEntries.userId, params.userId), lt(historyEntries.executedAt, params.cutoffIsoString)));
  },
};
