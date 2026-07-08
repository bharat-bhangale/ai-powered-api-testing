import type { Request, Response } from 'express';
import { ApiReverseEngineerService } from './api-reverse-engineer.service';

// ===== Per-session state =====
// Single orchestrator per server; production would key by userId/sessionId.
let activeService: ApiReverseEngineerService | null = null;

/**
 * POST /api/discovery/start
 * Starts API discovery and streams progress as Server-Sent Events (SSE).
 *
 * Body: { baseUrl: string }
 * Events (text/event-stream):
 *   { type: 'phase', data: ... }
 *   { type: 'probing', data: ... }
 *   { type: 'discovered', data: ... }
 *   { type: 'error', data: ... }
 *   { type: 'complete', data: { totalEndpoints, collection } }
 *   { type: 'stopped', data: ... }
 */
export async function startDiscovery(req: Request, res: Response): Promise<void> {
  const { baseUrl } = req.body;

  if (!baseUrl || typeof baseUrl !== 'string') {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'baseUrl is required' },
    });
    return;
  }

  // Stop any existing session
  if (activeService) {
    activeService.stop();
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const emit = (event: object): void => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  };

  // Handle client disconnect
  req.on('close', () => {
    if (activeService) {
      activeService.stop();
    }
  });

  activeService = new ApiReverseEngineerService();

  try {
    await activeService.discover(baseUrl, emit);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Discovery failed';
    emit({ type: 'error', data: { url: baseUrl, error: message } });
  }

  if (!res.writableEnded) {
    res.end();
  }

  activeService = null;
}

/**
 * POST /api/discovery/stop
 * Gracefully stops an in-progress discovery session.
 */
export function stopDiscovery(_req: Request, res: Response): void {
  if (activeService) {
    activeService.stop();
    res.json({ success: true, message: 'Discovery session stopped' });
  } else {
    res.json({ success: true, message: 'No active discovery session' });
  }
}
