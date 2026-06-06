import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../client';
import { testRuns, type TestRunRow, type InsertTestRunRow } from '../schema';

// ===== Types =====

export interface TestRunRecord {
  id: string;
  userId: string;
  collectionId: string;
  collectionName: string;
  environmentId?: string;
  trigger: 'manual' | 'scheduled' | 'ci';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  results: unknown[];
  totalRequests: number;
  completedRequests: number;
  totalTestsPassed: number;
  totalTestsFailed: number;
  totalDuration: number;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestRunInput {
  id: string;
  userId: string;
  collectionId: string;
  collectionName: string;
  environmentId?: string;
  trigger: 'manual' | 'scheduled' | 'ci';
}

export interface UpdateTestRunInput {
  id: string;
  userId: string;
  status?: 'running' | 'completed' | 'failed' | 'cancelled';
  results?: unknown[];
  totalRequests?: number;
  completedRequests?: number;
  totalTestsPassed?: number;
  totalTestsFailed?: number;
  totalDuration?: number;
  completedAt?: string;
}

// ===== Map Row =====

function rowToRecord(row: TestRunRow): TestRunRecord {
  return {
    id: row.id,
    userId: row.userId,
    collectionId: row.collectionId,
    collectionName: row.collectionName,
    environmentId: row.environmentId ?? undefined,
    trigger: row.trigger as TestRunRecord['trigger'],
    status: row.status as TestRunRecord['status'],
    results: JSON.parse(row.resultsJson),
    totalRequests: row.totalRequests,
    completedRequests: row.completedRequests,
    totalTestsPassed: row.totalTestsPassed,
    totalTestsFailed: row.totalTestsFailed,
    totalDuration: row.totalDuration,
    startedAt: row.startedAt,
    completedAt: row.completedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ===== Repository =====

export const testRunsRepository = {
  async listByUser(params: { userId: string; limit?: number }): Promise<TestRunRecord[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(testRuns)
      .where(eq(testRuns.userId, params.userId))
      .orderBy(desc(testRuns.createdAt))
      .limit(params.limit ?? 50);
    return rows.map(rowToRecord);
  },

  async getById(params: { id: string; userId: string }): Promise<TestRunRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(testRuns)
      .where(and(eq(testRuns.id, params.id), eq(testRuns.userId, params.userId)))
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  },

  async create(input: CreateTestRunInput): Promise<TestRunRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const row: InsertTestRunRow = {
      id: input.id,
      userId: input.userId,
      collectionId: input.collectionId,
      collectionName: input.collectionName,
      environmentId: input.environmentId ?? null,
      trigger: input.trigger,
      status: 'running',
      resultsJson: '[]',
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(testRuns).values(row);
    const created = await this.getById({ id: input.id, userId: input.userId });
    if (!created) throw new Error('Failed to create test run');
    return created;
  },

  async update(input: UpdateTestRunInput): Promise<TestRunRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const patch: Partial<InsertTestRunRow> = { updatedAt: now };

    if (input.status !== undefined) patch.status = input.status;
    if (input.results !== undefined) patch.resultsJson = JSON.stringify(input.results);
    if (input.totalRequests !== undefined) patch.totalRequests = input.totalRequests;
    if (input.completedRequests !== undefined) patch.completedRequests = input.completedRequests;
    if (input.totalTestsPassed !== undefined) patch.totalTestsPassed = input.totalTestsPassed;
    if (input.totalTestsFailed !== undefined) patch.totalTestsFailed = input.totalTestsFailed;
    if (input.totalDuration !== undefined) patch.totalDuration = input.totalDuration;
    if (input.completedAt !== undefined) patch.completedAt = input.completedAt;

    await db.update(testRuns).set(patch).where(and(eq(testRuns.id, input.id), eq(testRuns.userId, input.userId)));
    const updated = await this.getById({ id: input.id, userId: input.userId });
    if (!updated) throw new Error('Test run not found after update');
    return updated;
  },

  async delete(params: { id: string; userId: string }): Promise<void> {
    const db = getDb();
    await db.delete(testRuns).where(and(eq(testRuns.id, params.id), eq(testRuns.userId, params.userId)));
  },
};
