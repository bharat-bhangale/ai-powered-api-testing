import type { Request, Response } from 'express';
import { MockGeneratorService } from '../ai/features/mock-generator.service';
import { mockServerService } from './mock-server.service';

const mockGenerator = new MockGeneratorService();

// In-memory: last generated config (per process)
let lastConfig: Awaited<ReturnType<MockGeneratorService['generate']>> | null = null;

/**
 * POST /api/mock-server/generate
 * AI generates a mock server config from the specified collection.
 * Body: { collectionId: string, port?: number }
 */
export async function generateMock(req: Request, res: Response): Promise<void> {
  try {
    const { collectionId } = req.body;

    if (!collectionId || typeof collectionId !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'collectionId is required' },
      });
      return;
    }

    const config = await mockGenerator.generate(req.userId!, collectionId);
    lastConfig = config;

    res.json({
      success: true,
      data: {
        config,
        routeCount: config.routes.length,
        resourceCount: config.resources.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Mock generation failed';
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message } });
  }
}

/**
 * POST /api/mock-server/start
 * Starts the mock server using the last generated config or a provided one.
 * Body: { port?: number, config?: MockServerConfig }
 */
export async function startMock(req: Request, res: Response): Promise<void> {
  try {
    const port = parseInt(req.body.port || '3001', 10);
    const config = req.body.config || lastConfig;

    if (!config) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_CONFIG', message: 'No mock config found. Call /generate first.' },
      });
      return;
    }

    if (port === 8000) {
      res.status(400).json({
        success: false,
        error: { code: 'PORT_CONFLICT', message: 'Port 8000 is reserved for the main API server' },
      });
      return;
    }

    await mockServerService.start(config, port);
    const status = mockServerService.getStatus();
    const endpoints = mockServerService.getEndpoints();

    res.json({ success: true, data: { status, endpoints } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start mock server';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/**
 * POST /api/mock-server/stop
 * Stops the running mock server.
 */
export async function stopMock(_req: Request, res: Response): Promise<void> {
  try {
    await mockServerService.stop();
    res.json({ success: true, message: 'Mock server stopped' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to stop mock server';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/**
 * GET /api/mock-server/status
 * Returns running status, port, endpoint list.
 */
export function getMockStatus(_req: Request, res: Response): void {
  const status = mockServerService.getStatus();
  const endpoints = mockServerService.getEndpoints();
  res.json({ success: true, data: { status, endpoints } });
}
