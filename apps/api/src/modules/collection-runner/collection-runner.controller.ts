import type { Request, Response } from 'express';
import { CollectionRunnerService } from './collection-runner.service';
import { TestRunService } from '../test-runs/test-run.service';

const runnerService = new CollectionRunnerService();
const testRunService = new TestRunService();

// Active abort controllers keyed by userId:collectionId
const activeRuns = new Map<string, AbortController>();

/**
 * POST /api/collections/:id/run
 * SSE endpoint — streams progress events as requests complete.
 */
export async function runCollection(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const collectionId = req.params.id as string;
  const environmentId = req.body?.environmentId;

  const runKey = `${userId}:${collectionId}`;

  // Abort any previous run for this collection
  if (activeRuns.has(runKey)) {
    activeRuns.get(runKey)!.abort();
  }

  const abortController = new AbortController();
  activeRuns.set(runKey, abortController);

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Handle client disconnect
  req.on('close', () => {
    abortController.abort();
    activeRuns.delete(runKey);
  });

  try {
    const events = runnerService.run({
      userId,
      collectionId,
      environmentId,
      signal: abortController.signal,
    });

    for await (const event of events) {
      if (abortController.signal.aborted) break;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Collection run failed';
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: { code: 'RUN_ERROR', message } });
      return;
    }
    res.write(`data: ${JSON.stringify({ type: 'error', data: { message } })}\n\n`);
  } finally {
    activeRuns.delete(runKey);
    res.end();
  }
}

/**
 * POST /api/collections/:id/run/stop
 * Stops an active collection run.
 */
export async function stopCollection(req: Request, res: Response): Promise<void> {
  const userId = req.userId!;
  const collectionId = req.params.id as string;
  const runKey = `${userId}:${collectionId}`;

  const controller = activeRuns.get(runKey);
  if (controller) {
    controller.abort();
    activeRuns.delete(runKey);
    res.json({ success: true, data: { message: 'Run stopped' } });
  } else {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No active run found' } });
  }
}

/**
 * GET /api/collections/:id/runs
 * Returns run history for a collection.
 */
export async function getRunHistory(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const collectionId = req.params.id as string;
    const limitQuery = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = parseInt(limitQuery as string) || 20;

    const runs = await testRunService.listByCollection(userId, collectionId, limit);
    res.json({ success: true, data: runs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch run history';
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message } });
  }
}

/**
 * GET /api/test-runs/:id
 * Returns a single test run by ID.
 */
export async function getRunById(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const runId = req.params.id as string;

    const run = await testRunService.getById(userId, runId);
    if (!run) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Run not found' } });
      return;
    }

    res.json({ success: true, data: run });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch run';
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message } });
  }
}
