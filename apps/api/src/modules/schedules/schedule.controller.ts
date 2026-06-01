import type { Request, Response } from 'express';
import { ScheduleService } from './schedule.service';

const scheduleService = new ScheduleService();

// ===== Validation =====

const VALID_CRON_REGEX = /^(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)$/;

function isValidCron(cron: string): boolean {
  return VALID_CRON_REGEX.test(cron.trim());
}

// ===== Controller =====

/** POST /api/schedules — Create a new schedule */
export async function createSchedule(req: Request, res: Response): Promise<void> {
  try {
    const { collectionId, collectionName, environmentId, cronExpression, label, webhookUrl, notifyEmail } = req.body;

    if (!collectionId || !cronExpression || !label) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'collectionId, cronExpression, and label are required' },
      });
      return;
    }

    if (!isValidCron(cronExpression)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid cron expression' },
      });
      return;
    }

    const schedule = await scheduleService.create({
      userId: req.userId!,
      collectionId,
      collectionName: collectionName || 'Unnamed Collection',
      environmentId,
      cronExpression: cronExpression.trim(),
      label,
      webhookUrl,
      notifyEmail,
    });

    res.status(201).json({ success: true, data: { schedule } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create schedule';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/** GET /api/schedules — List all schedules */
export async function listSchedules(req: Request, res: Response): Promise<void> {
  try {
    const schedules = await scheduleService.list(req.userId!);
    res.json({ success: true, data: { schedules } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list schedules';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/** GET /api/schedules/:id — Get a single schedule */
export async function getSchedule(req: Request, res: Response): Promise<void> {
  try {
    const schedule = await scheduleService.getById(req.userId!, req.params.id as string);
    if (!schedule) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Schedule not found' } });
      return;
    }
    res.json({ success: true, data: { schedule } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get schedule';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/** PUT /api/schedules/:id — Update a schedule */
export async function updateSchedule(req: Request, res: Response): Promise<void> {
  try {
    const { cronExpression, label, enabled, environmentId, webhookUrl, notifyEmail } = req.body;

    if (cronExpression && !isValidCron(cronExpression)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid cron expression' },
      });
      return;
    }

    const schedule = await scheduleService.update(req.userId!, req.params.id as string, {
      cronExpression: cronExpression?.trim(),
      label,
      enabled,
      environmentId,
      webhookUrl,
      notifyEmail,
    });

    if (!schedule) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Schedule not found' } });
      return;
    }

    res.json({ success: true, data: { schedule } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update schedule';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/** DELETE /api/schedules/:id — Delete a schedule */
export async function deleteSchedule(req: Request, res: Response): Promise<void> {
  try {
    const deleted = await scheduleService.delete(req.userId!, req.params.id as string);
    if (!deleted) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Schedule not found' } });
      return;
    }
    res.json({ success: true, data: { message: 'Schedule deleted' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete schedule';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/** PATCH /api/schedules/:id/toggle — Toggle enabled/disabled */
export async function toggleSchedule(req: Request, res: Response): Promise<void> {
  try {
    const schedule = await scheduleService.toggle(req.userId!, req.params.id as string);
    if (!schedule) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Schedule not found' } });
      return;
    }
    res.json({ success: true, data: { schedule } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to toggle schedule';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}
