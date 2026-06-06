import { eq, and, lte } from 'drizzle-orm';
import { getDb } from '../client';
import { schedules, type ScheduleRow, type InsertScheduleRow } from '../schema';

// ===== Types =====

export interface ScheduleRecord {
  id: string;
  userId: string;
  collectionId: string;
  collectionName: string;
  environmentId?: string;
  cronExpression: string;
  label: string;
  enabled: boolean;
  webhookUrl?: string;
  notifyEmail?: string;
  notifyDesktop: boolean;
  lastRunAt?: string;
  lastRunStatus?: string;
  lastRunId?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleInput {
  id: string;
  userId: string;
  collectionId: string;
  collectionName: string;
  environmentId?: string;
  cronExpression: string;
  label: string;
  enabled?: boolean;
  webhookUrl?: string;
  notifyEmail?: string;
  notifyDesktop?: boolean;
  nextRunAt?: string;
}

export interface UpdateScheduleInput {
  id: string;
  userId: string;
  collectionName?: string;
  environmentId?: string;
  cronExpression?: string;
  label?: string;
  enabled?: boolean;
  webhookUrl?: string;
  notifyEmail?: string;
  notifyDesktop?: boolean;
  lastRunAt?: string;
  lastRunStatus?: string;
  lastRunId?: string;
  nextRunAt?: string;
}

// ===== Map Row =====

function rowToRecord(row: ScheduleRow): ScheduleRecord {
  return {
    id: row.id,
    userId: row.userId,
    collectionId: row.collectionId,
    collectionName: row.collectionName,
    environmentId: row.environmentId ?? undefined,
    cronExpression: row.cronExpression,
    label: row.label,
    enabled: row.enabled,
    webhookUrl: row.webhookUrl ?? undefined,
    notifyEmail: row.notifyEmail ?? undefined,
    notifyDesktop: row.notifyDesktop,
    lastRunAt: row.lastRunAt ?? undefined,
    lastRunStatus: row.lastRunStatus ?? undefined,
    lastRunId: row.lastRunId ?? undefined,
    nextRunAt: row.nextRunAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ===== Repository =====

export const schedulesRepository = {
  async listByUser(userId: string): Promise<ScheduleRecord[]> {
    const db = getDb();
    const rows = await db.select().from(schedules).where(eq(schedules.userId, userId));
    return rows.map(rowToRecord);
  },

  async listDue(): Promise<ScheduleRecord[]> {
    const db = getDb();
    const now = new Date().toISOString();
    const rows = await db
      .select()
      .from(schedules)
      .where(and(eq(schedules.enabled, true), lte(schedules.nextRunAt, now)));
    return rows.map(rowToRecord);
  },

  async getById(params: { id: string; userId: string }): Promise<ScheduleRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(schedules)
      .where(and(eq(schedules.id, params.id), eq(schedules.userId, params.userId)))
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  },

  async create(input: CreateScheduleInput): Promise<ScheduleRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const row: InsertScheduleRow = {
      id: input.id,
      userId: input.userId,
      collectionId: input.collectionId,
      collectionName: input.collectionName,
      environmentId: input.environmentId ?? null,
      cronExpression: input.cronExpression,
      label: input.label,
      enabled: input.enabled ?? true,
      webhookUrl: input.webhookUrl ?? null,
      notifyEmail: input.notifyEmail ?? null,
      notifyDesktop: input.notifyDesktop ?? true,
      nextRunAt: input.nextRunAt ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(schedules).values(row);
    const created = await this.getById({ id: input.id, userId: input.userId });
    if (!created) throw new Error('Failed to create schedule');
    return created;
  },

  async update(input: UpdateScheduleInput): Promise<ScheduleRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const patch: Partial<InsertScheduleRow> = { updatedAt: now };

    if (input.collectionName !== undefined) patch.collectionName = input.collectionName;
    if (input.environmentId !== undefined) patch.environmentId = input.environmentId;
    if (input.cronExpression !== undefined) patch.cronExpression = input.cronExpression;
    if (input.label !== undefined) patch.label = input.label;
    if (input.enabled !== undefined) patch.enabled = input.enabled;
    if (input.webhookUrl !== undefined) patch.webhookUrl = input.webhookUrl;
    if (input.notifyEmail !== undefined) patch.notifyEmail = input.notifyEmail;
    if (input.notifyDesktop !== undefined) patch.notifyDesktop = input.notifyDesktop;
    if (input.lastRunAt !== undefined) patch.lastRunAt = input.lastRunAt;
    if (input.lastRunStatus !== undefined) patch.lastRunStatus = input.lastRunStatus;
    if (input.lastRunId !== undefined) patch.lastRunId = input.lastRunId;
    if (input.nextRunAt !== undefined) patch.nextRunAt = input.nextRunAt;

    await db.update(schedules).set(patch).where(and(eq(schedules.id, input.id), eq(schedules.userId, input.userId)));
    const updated = await this.getById({ id: input.id, userId: input.userId });
    if (!updated) throw new Error('Schedule not found after update');
    return updated;
  },

  async delete(params: { id: string; userId: string }): Promise<void> {
    const db = getDb();
    await db.delete(schedules).where(and(eq(schedules.id, params.id), eq(schedules.userId, params.userId)));
  },
};
