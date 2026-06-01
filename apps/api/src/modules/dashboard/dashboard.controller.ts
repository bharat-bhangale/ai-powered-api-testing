import type { Request, Response } from 'express';
import { DashboardService } from './dashboard.service';

const dashboardService = new DashboardService();

/**
 * GET /api/dashboard
 * Returns aggregated dashboard data for the authenticated user.
 */
export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const data = await dashboardService.getDashboard(req.userId!);
    res.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}
