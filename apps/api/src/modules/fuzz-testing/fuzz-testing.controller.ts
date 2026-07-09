import type { Request, Response } from 'express';
import { FuzzTestingService } from './fuzz-testing.service';
import type { FuzzCategory } from './payload-generators';

const fuzzService = new FuzzTestingService();

/**
 * POST /api/fuzz/run
 * SSE endpoint. Streams fuzz results as they arrive.
 * Body: {
 *   method, url, headers, body,
 *   categories: FuzzCategory[],
 *   useAiPayloads?: boolean
 * }
 */
export async function runFuzz(req: Request, res: Response): Promise<void> {
  const { method, url, headers, body: reqBody, categories, useAiPayloads = false } = req.body;

  if (!method || !url) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'method and url are required' },
    });
    return;
  }

  if (!Array.isArray(categories) || categories.length === 0) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'At least one fuzz category must be selected' },
    });
    return;
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data: unknown) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    await fuzzService.runFuzz(
      {
        method,
        url,
        headers: headers || {},
        body: reqBody,
      },
      categories as FuzzCategory[],
      Boolean(useAiPayloads),
      (event) => send(event),
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Fuzz test failed';
    send({ type: 'error', message });
  } finally {
    if (!res.writableEnded) res.end();
  }
}
