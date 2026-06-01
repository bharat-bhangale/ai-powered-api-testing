import { Schedule, type ISchedule } from './Schedule.model';

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
  async create(params: CreateScheduleParams): Promise<ISchedule> {
    const nextRunAt = this.computeNextRun(params.cronExpression);
    const schedule = new Schedule({
      ...params,
      enabled: true,
      nextRunAt,
    });
    return schedule.save();
  }

  /**
   * List all schedules for a user.
   */
  async list(userId: string): Promise<ISchedule[]> {
    return Schedule.find({ userId })
      .sort({ createdAt: -1 })
      .lean() as unknown as ISchedule[];
  }

  /**
   * Get a single schedule by ID (owner-only).
   */
  async getById(userId: string, scheduleId: string): Promise<ISchedule | null> {
    return Schedule.findOne({ _id: scheduleId, userId });
  }

  /**
   * Update a schedule.
   */
  async update(
    userId: string,
    scheduleId: string,
    updates: UpdateScheduleParams,
  ): Promise<ISchedule | null> {
    const updateData: Record<string, unknown> = { ...updates };
    if (updates.cronExpression) {
      updateData.nextRunAt = this.computeNextRun(updates.cronExpression);
    }
    return Schedule.findOneAndUpdate(
      { _id: scheduleId, userId },
      { $set: updateData },
      { new: true },
    );
  }

  /**
   * Delete a schedule.
   */
  async delete(userId: string, scheduleId: string): Promise<boolean> {
    const result = await Schedule.deleteOne({ _id: scheduleId, userId });
    return result.deletedCount > 0;
  }

  /**
   * Toggle schedule enabled/disabled.
   */
  async toggle(userId: string, scheduleId: string): Promise<ISchedule | null> {
    const schedule = await Schedule.findOne({ _id: scheduleId, userId });
    if (!schedule) return null;

    schedule.enabled = !schedule.enabled;
    if (schedule.enabled) {
      schedule.nextRunAt = this.computeNextRun(schedule.cronExpression);
    } else {
      schedule.nextRunAt = undefined;
    }
    return schedule.save();
  }

  /**
   * Get all enabled schedules that are due to run.
   */
  async getDueSchedules(): Promise<ISchedule[]> {
    return Schedule.find({
      enabled: true,
      nextRunAt: { $lte: new Date() },
    }).lean() as unknown as ISchedule[];
  }

  /**
   * Mark a schedule as having just run.
   */
  async markRun(
    scheduleId: string,
    runId: string,
    status: 'completed' | 'failed',
    cronExpression: string,
  ): Promise<void> {
    await Schedule.updateOne(
      { _id: scheduleId },
      {
        $set: {
          lastRunAt: new Date(),
          lastRunStatus: status,
          lastRunId: runId,
          nextRunAt: this.computeNextRun(cronExpression),
        },
      },
    );
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
