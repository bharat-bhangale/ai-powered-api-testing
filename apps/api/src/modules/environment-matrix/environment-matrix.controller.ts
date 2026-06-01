import type { Request, Response } from 'express';
import { EnvironmentMatrixService } from './environment-matrix.service';

const matrixService = new EnvironmentMatrixService();

/**
 * POST /api/environment-matrix/run
 * Executes a collection across multiple environments via SSE.
 * Body: { collectionId, environments: [{ id, name }] }
 */
export async function runMatrix(req: Request, res: Response): Promise<void> {
  try {
    const { collectionId, environments } = req.body;

    if (!collectionId || !environments || !Array.isArray(environments) || environments.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'collectionId and environments (array of { id, name }) are required',
        },
      });
      return;
    }

    if (environments.length > 10) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Maximum 10 environments per matrix run',
        },
      });
      return;
    }

    const environmentIds = environments.map((e: { id: string }) => e.id);
    const environmentNames = environments.map((e: { name: string }) => e.name);

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const generator = matrixService.run(
      req.userId!,
      collectionId,
      environmentIds,
      environmentNames,
    );

    for await (const event of generator) {
      const data = JSON.stringify(event);
      res.write(`data: ${data}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: unknown) {
    // If headers haven't been sent, respond with JSON error
    if (!res.headersSent) {
      const message = error instanceof Error ? error.message : 'Matrix run failed';
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
    } else {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      res.write(`data: ${JSON.stringify({ type: 'error', data: { message: errMsg } })}\n\n`);
      res.end();
    }
  }
}
