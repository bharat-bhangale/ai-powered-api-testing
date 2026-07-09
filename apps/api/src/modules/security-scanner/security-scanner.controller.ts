import type { Request, Response } from 'express';
import crypto from 'crypto';
import { SecurityScannerService } from './security-scanner.service';
import { securityReportStore } from './SecurityReport.model';
import type { ScanEndpoint } from './security-scanner.service';

const scanner = new SecurityScannerService();

/**
 * POST /api/security/scan
 * Body: { collectionId, collectionName, endpoints: ScanEndpoint[] }
 * Streams scan progress as SSE, finalizes with the complete report.
 */
export async function startScan(req: Request, res: Response): Promise<void> {
  const { collectionId, collectionName, endpoints } = req.body;

  if (!collectionId || !collectionName || !Array.isArray(endpoints) || endpoints.length === 0) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'collectionId, collectionName, and endpoints[] are required' },
    });
    return;
  }

  // Validate that at least one endpoint has a URL
  const validEndpoints: ScanEndpoint[] = endpoints.filter(
    (e: ScanEndpoint) => e.url && e.method,
  );
  if (validEndpoints.length === 0) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'At least one endpoint with url and method is required' },
    });
    return;
  }

  // Create initial report record
  const reportId = crypto.randomUUID();
  securityReportStore.create({
    id: reportId,
    userId: req.userId!,
    collectionId,
    collectionName,
    startedAt: new Date().toISOString(),
    status: 'running',
    endpointsScanned: 0,
    checksRun: 0,
    vulnerabilities: [],
  });

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (data: unknown) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  // Send report ID immediately so frontend can poll
  sendEvent({ type: 'init', reportId });

  try {
    await scanner.runScan(
      req.userId!,
      collectionId,
      collectionName,
      validEndpoints,
      reportId,
      (event) => sendEvent(event),
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Scan failed';
    securityReportStore.update(reportId, { status: 'error' });
    sendEvent({ type: 'error', message });
  } finally {
    if (!res.writableEnded) res.end();
  }
}

/**
 * GET /api/security/reports
 * Returns all reports for the current user.
 */
export async function getReports(req: Request, res: Response): Promise<void> {
  try {
    const reports = securityReportStore.getByUser(req.userId!);
    res.json({ success: true, data: reports });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get reports';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/**
 * GET /api/security/reports/:id
 * Returns a specific scan report.
 */
export async function getReport(req: Request, res: Response): Promise<void> {
  try {
    const report = securityReportStore.getById(req.params['id'] ?? '');
    if (!report || report.userId !== req.userId!) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } });
      return;
    }
    res.json({ success: true, data: report });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get report';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}
