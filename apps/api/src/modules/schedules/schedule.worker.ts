import { ScheduleService } from './schedule.service';
import { CollectionRunnerService } from '../collection-runner/collection-runner.service';
import axios from 'axios';

// ===== Constants =====

/** How often the worker checks for due schedules (ms) */
const POLL_INTERVAL_MS = 30_000; // 30 seconds

// ===== Worker =====

/**
 * Schedule Worker — polls for due schedules and executes them.
 * Uses a simple setInterval-based approach instead of node-cron
 * to avoid an extra dependency. The ScheduleService computes nextRunAt.
 */
export class ScheduleWorker {
  private scheduleService = new ScheduleService();
  private runner = new CollectionRunnerService();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running = false;

  /**
   * Start the schedule worker polling loop.
   */
  start(): void {
    if (this.intervalId) return;

    console.log('⏰ Schedule worker started (polling every 30s)');
    this.intervalId = setInterval(() => {
      this.tick().catch((err) =>
        console.error('Schedule worker tick error:', err),
      );
    }, POLL_INTERVAL_MS);

    // Run immediately on start
    this.tick().catch((err) =>
      console.error('Schedule worker initial tick error:', err),
    );
  }

  /**
   * Stop the worker.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏰ Schedule worker stopped');
    }
  }

  /**
   * Single tick — find due schedules and execute them.
   */
  private async tick(): Promise<void> {
    if (this.running) return; // Skip if previous tick is still running
    this.running = true;

    try {
      const dueSchedules = await this.scheduleService.getDueSchedules();
      if (dueSchedules.length === 0) return;

      console.log(`⏰ Running ${dueSchedules.length} scheduled test run(s)`);

      for (const schedule of dueSchedules) {
        try {
          await this.executeSchedule(schedule);
        } catch (err) {
          console.error(
            `Schedule ${schedule.id} failed:`,
            err instanceof Error ? err.message : err,
          );
        }
      }
    } finally {
      this.running = false;
    }
  }

  /**
   * Execute a single scheduled test run.
   */
  private async executeSchedule(schedule: {
    id: string;
    userId: string;
    collectionId: string;
    environmentId?: string;
    cronExpression: string;
    webhookUrl?: string;
    notifyEmail?: string;
    collectionName: string;
  }): Promise<void> {
    const userId = schedule.userId;
    const collectionId = schedule.collectionId;
    const environmentId = schedule.environmentId;

    let runId = '';
    let finalStatus: 'completed' | 'failed' = 'completed';
    let totalPassed = 0;
    let totalFailed = 0;

    // Execute the collection run (consume the async generator to completion)
    const generator = this.runner.run({
      userId,
      collectionId,
      environmentId,
    });

    for await (const event of generator) {
      if (event.type === 'complete') {
        runId = event.data.runId;
        finalStatus = event.data.status === 'completed' ? 'completed' : 'failed';
        totalPassed = event.data.totalTestsPassed;
        totalFailed = event.data.totalTestsFailed;
      }
    }

    // Mark schedule as run
    await this.scheduleService.markRun(
      userId,
      schedule.id,
      runId,
      finalStatus,
      schedule.cronExpression,
    );

    console.log(
      `⏰ Schedule ${schedule.id} (${schedule.collectionName}): ${finalStatus} — ${totalPassed} passed, ${totalFailed} failed`,
    );

    // Send failure notifications
    if (finalStatus === 'failed' && totalFailed > 0) {
      await this.sendNotifications(schedule, runId, totalPassed, totalFailed);
    }
  }

  /**
   * Send webhook and/or email notifications on failure.
   */
  private async sendNotifications(
    schedule: {
      collectionName: string;
      webhookUrl?: string;
      notifyEmail?: string;
    },
    runId: string,
    totalPassed: number,
    totalFailed: number,
  ): Promise<void> {
    const payload = {
      event: 'scheduled_run_failed',
      collection: schedule.collectionName,
      runId,
      totalPassed,
      totalFailed,
      timestamp: new Date().toISOString(),
    };

    // Webhook notification
    if (schedule.webhookUrl) {
      try {
        await axios.post(schedule.webhookUrl, payload, { timeout: 10000 });
        console.log(`⏰ Webhook sent to ${schedule.webhookUrl}`);
      } catch (err) {
        console.error(
          `⏰ Webhook failed for ${schedule.webhookUrl}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Email notification (log-only for now — would need SMTP config)
    if (schedule.notifyEmail) {
      console.log(
        `⏰ [EMAIL STUB] Would notify ${schedule.notifyEmail}: ${schedule.collectionName} — ${totalFailed} test(s) failed (run: ${runId})`,
      );
    }
  }
}

/** Singleton worker instance */
export const scheduleWorker = new ScheduleWorker();
