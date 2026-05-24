import type { Request, Response } from 'express';
import { HistoryService } from './history.service';

const historyService = new HistoryService();

/** GET /api/history — List history (paginated, filterable) */
export async function listHistory(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit, method, search, status } = req.query;
    const result = await historyService.list(req.userId!, {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      method: method as string | undefined,
      search: search as string | undefined,
      status: status as string | undefined,
    });
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list history';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/** GET /api/history/:id — Get single history entry */
export async function getHistoryEntry(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const entry = await historyService.getById(req.userId!, id);
    if (!entry) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'History entry not found' } });
      return;
    }
    res.json({ success: true, data: { entry } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get history entry';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/** DELETE /api/history/:id — Delete single entry */
export async function deleteHistoryEntry(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const deleted = await historyService.delete(req.userId!, id);
    if (!deleted) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'History entry not found' } });
      return;
    }
    res.json({ success: true, data: { message: 'History entry deleted' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete history entry';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/** DELETE /api/history — Clear all history for the user */
export async function clearHistory(req: Request, res: Response): Promise<void> {
  try {
    const deleted = await historyService.clearAll(req.userId!);
    res.json({ success: true, data: { message: `${deleted} history entries cleared` } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to clear history';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}
