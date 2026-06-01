import type { Request, Response } from 'express';
import { TestTrendService } from './test-trend.service';

const trendService = new TestTrendService();

/**
 * GET /api/test-runs/trends
 * Full trend analysis: history, daily trends, flaky tests, regressions, perf degradation.
 * Query: ?collectionId=xxx (optional)
 */
export async function getTrends(req: Request, res: Response): Promise<void> {
  try {
    const collectionId = req.query.collectionId as string | undefined;
    const analysis = await trendService.analyze(req.userId!, collectionId);
    res.json({ success: true, data: analysis });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to analyze trends';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/**
 * GET /api/test-runs/history
 * Paginated test run history.
 * Query: ?collectionId=xxx&page=1&limit=20
 */
export async function getHistory(req: Request, res: Response): Promise<void> {
  try {
    const collectionId = req.query.collectionId as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await trendService.getHistory(req.userId!, collectionId, page, limit);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load history';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}
