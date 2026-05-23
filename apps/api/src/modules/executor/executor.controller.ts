import type { Request, Response } from 'express';
import { ExecutorService } from './executor.service';

const executorService = new ExecutorService();

/**
 * POST /api/execute
 * Receives request config from the frontend, executes the HTTP call,
 * and returns the structured result.
 */
export async function executeRequest(req: Request, res: Response): Promise<void> {
  try {
    const { method, url, headers, params, body, timeout } = req.body;

    // Validate required fields
    if (!url || !method) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'URL and method are required',
        },
      });
      return;
    }

    // Convert headers array to object (only enabled entries with non-empty key)
    const headerObj: Record<string, string> = {};
    if (Array.isArray(headers)) {
      for (const h of headers) {
        if (h.enabled && h.key) {
          headerObj[h.key] = h.value;
        }
      }
    }

    // Convert params array to object (only enabled entries with non-empty key)
    const paramObj: Record<string, string> = {};
    if (Array.isArray(params)) {
      for (const p of params) {
        if (p.enabled && p.key) {
          paramObj[p.key] = p.value;
        }
      }
    }

    // Parse body content based on mode
    let parsedBody: unknown = undefined;
    if (body && body.mode !== 'none' && body.content) {
      if (body.mode === 'json') {
        try {
          parsedBody = JSON.parse(body.content);
        } catch {
          parsedBody = body.content;
        }
      } else {
        parsedBody = body.content;
      }
    }

    // Auto-set Content-Type for JSON body if not already set
    if (parsedBody && !headerObj['Content-Type'] && !headerObj['content-type']) {
      if (body?.mode === 'json') {
        headerObj['Content-Type'] = 'application/json';
      }
    }

    const result = await executorService.execute({
      method,
      url,
      headers: headerObj,
      params: paramObj,
      body: parsedBody,
      timeout,
    });

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Execution failed';
    res.status(500).json({
      success: false,
      error: { code: 'EXECUTION_ERROR', message },
    });
  }
}
