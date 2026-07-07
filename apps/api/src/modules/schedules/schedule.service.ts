import { dbProvider } from '../../data/database-provider';
import type { ScheduleRecord } from '@atx/db';
import crypto from 'crypto';

// ===== Types =====

interface CreateScheduleParams {
  userId: string;
  collectionId: string;
  collectionName: string;
  environmentId?: string;
  cronExpression: string;
  label: string;
  webhookUrl?: string;
  notifyEmail?: string;
}

interface UpdateScheduleParams {
  cronExpression?: string;
  label?: string;
  enabled?: boolean;
  environmentId?: string;
  webhookUrl?: string;
  notifyEmail?: string;
}

// ===== Service =====

/**
 * Schedule Service — CRUD for scheduled test run records.
 * Business logic only — no req/res access.
 */
export class ScheduleService {
  /**
   * Create a new schedule.
   */
  async create(params: CreateScheduleParams): Promise<ScheduleRecord> {
    const nextRunAt = this.computeNextRun(params.cronExpression);
    return dbProvider.schedules.create({
      id: crypto.randomUUID(),
      ...params,
      enabled: true,
      nextRunAt: nextRunAt.toISOString(),
    });
  }

  /**
   * List all schedules for a user.
   */
  async list(userId: string): Promise<ScheduleRecord[]> {
    const schedules = await dbProvider.schedules.listByUser(userId);
    // Sort by createdAt descending
    return schedules.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Get a single schedule by ID (owner-only).
   */
  async getById(userId: string, scheduleId: string): Promise<ScheduleRecord | null> {
    return dbProvider.schedules.getById({ id: scheduleId, userId });
  }

  /**
   * Update a schedule.
   */
  async update(
    userId: string,
    scheduleId: string,
    updates: UpdateScheduleParams,
  ): Promise<ScheduleRecord | null> {
    const updateData: Record<string, unknown> = { id: scheduleId, userId, ...updates };
    if (updates.cronExpression) {
      updateData.nextRunAt = this.computeNextRun(updates.cronExpression).toISOString();
    }
    return dbProvider.schedules.update(updateData as any);
  }

  /**
   * Delete a schedule.
   */
  async delete(userId: string, scheduleId: string): Promise<boolean> {
    await dbProvider.schedules.delete({ id: scheduleId, userId });
    return true; // Assume success if no error thrown
  }

  /**
   * Toggle schedule enabled/disabled.
   */
  async toggle(userId: string, scheduleId: string): Promise<ScheduleRecord | null> {
    const schedule = await dbProvider.schedules.getById({ id: scheduleId, userId });
    if (!schedule) return null;

    const enabled = !schedule.enabled;
    const nextRunAt = enabled ? this.computeNextRun(schedule.cronExpression).toISOString() : undefined;
    
    // Pass null-ish as undefined if we need to clear it, but AtxDataProvider expects string | undefined
    return dbProvider.schedules.update({
      id: scheduleId,
      userId,
      enabled,
      // If undefined, update() might ignore it depending on implementation. 
      // To properly unset, we might need to handle it in update(), but we'll assume update handles undefined or we don't unset nextRunAt for now.
      nextRunAt: nextRunAt,
    });
  }

  /**
   * Get all enabled schedules that are due to run.
   */
  async getDueSchedules(): Promise<ScheduleRecord[]> {
    return dbProvider.schedules.listDue();
  }

  /**
   * Mark a schedule as having just run.
   */
  async markRun(
    userId: string,
    scheduleId: string,
    runId: string,
    status: 'completed' | 'failed',
    cronExpression: string,
  ): Promise<void> {
    await dbProvider.schedules.update({
      id: scheduleId,
      userId,
      lastRunAt: new Date().toISOString(),
      lastRunStatus: status,
      lastRunId: runId,
      nextRunAt: this.computeNextRun(cronExpression).toISOString(),
    });
  }

  /**
   * Compute the next run time from a cron expression.
   * Uses simple interval math for common patterns, falls back to +1h.
   */
  private computeNextRun(cron: string): Date {
    const now = new Date();
    const parts = cron.split(/\s+/);

    // */5 * * * * → every 5 minutes
    if (parts[0]?.startsWith('*/')) {
      const mins = parseInt(parts[0].substring(2), 10);
      if (!isNaN(mins) && mins > 0) {
        return new Date(now.getTime() + mins * 60 * 1000);
      }
    }

    // 0 * * * * → every hour
    if (parts[0] === '0' && parts[1] === '*') {
      const next = new Date(now);
      next.setMinutes(0, 0, 0);
      next.setHours(next.getHours() + 1);
      return next;
    }

    // 0 0 * * * → daily at midnight
    if (parts[0] === '0' && parts[1] === '0' && parts[2] === '*') {
      const next = new Date(now);
      next.setHours(0, 0, 0, 0);
      next.setDate(next.getDate() + 1);
      return next;
    }

    // 0 0 * * 0 → weekly on Sunday
    if (parts[0] === '0' && parts[1] === '0' && parts[4] === '0') {
      const next = new Date(now);
      next.setHours(0, 0, 0, 0);
      const daysUntilSunday = (7 - next.getDay()) % 7 || 7;
      next.setDate(next.getDate() + daysUntilSunday);
      return next;
    }

    // Default: 1 hour from now
    return new Date(now.getTime() + 60 * 60 * 1000);
  }
}
