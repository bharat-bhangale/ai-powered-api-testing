import type { Request, Response } from 'express';
import { ApiDiffService } from './api-diff.service';

const diffService = new ApiDiffService();

/**
 * GET /api/diff/dates?collectionId=xxx
 * Returns available snapshot dates for the date pickers.
 */
export async function getAvailableDates(req: Request, res: Response): Promise<void> {
  try {
    const { collectionId } = req.query;
    if (!collectionId || typeof collectionId !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'collectionId query param is required' },
      });
      return;
    }

    const dates = await diffService.getAvailableDates(req.userId!, collectionId);
    res.json({ success: true, data: { dates } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get dates';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/**
 * POST /api/diff/analyze
 * Runs structural diff + AI categorization between two time-point snapshots.
 *
 * Body: { collectionId, baselineDate, currentDate }
 *   dates are ISO date strings: "2026-01-15"
 */
export async function analyzeDiff(req: Request, res: Response): Promise<void> {
  try {
    const { collectionId, baselineDate, currentDate } = req.body;

    if (!collectionId || !baselineDate || !currentDate) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'collectionId, baselineDate, and currentDate are required',
        },
      });
      return;
    }

    if (baselineDate === currentDate) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'baselineDate and currentDate must be different' },
      });
      return;
    }

    const result = await diffService.analyze(
      req.userId!,
      collectionId,
      baselineDate,
      currentDate,
    );

    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Diff analysis failed';
    const status = message.includes('No history') ? 400 : 500;
    res.status(status).json({ success: false, error: { code: 'DIFF_ERROR', message } });
  }
}
