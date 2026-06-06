import type { Request, Response } from 'express';
import { ExecutorService } from './executor.service';
import { VariableResolver } from './variable-resolver';
import { AuthResolver } from './auth-resolver';
import { EnvironmentService } from '../environments/environment.service';
import { HistoryService } from '../history/history.service';
import type { ExecuteRequestBody } from './executor.validation';

const executorService = new ExecutorService();
const environmentService = new EnvironmentService();
const authResolver = new AuthResolver();
const historyService = new HistoryService();

/**
 * POST /api/execute
 * Receives request config from the frontend, resolves variables + auth,
 * executes the HTTP call, auto-saves to history, and returns the structured result.
 */
export async function executeRequest(req: Request, res: Response): Promise<void> {
  try {
    const { method, url, headers, params, body, auth, environmentId, timeout, preRequestScript } =
      req.body as ExecuteRequestBody & { preRequestScript?: string };

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

    // ===== Resolve variables from active environment =====
    let variables: Record<string, string> = {};
    let environmentName: string | undefined;
    if (environmentId && req.userId) {
      variables = await environmentService.getVariables(req.userId, environmentId);
      const env = await environmentService.getById(req.userId, environmentId);
      environmentName = env?.name;
    }
    const resolver = new VariableResolver(variables);

    // ===== Resolve URL =====
    const resolvedUrl = resolver.resolve(url);

    // ===== Resolve headers (array → object, with variable substitution) =====
    const headerObj: Record<string, string> = {};
    if (Array.isArray(headers)) {
      const resolved = resolver.resolveKeyValues(headers);
      Object.assign(headerObj, resolved);
    }

    // ===== Resolve params (array → object, with variable substitution) =====
    const paramObj: Record<string, string> = {};
    if (Array.isArray(params)) {
      const resolved = resolver.resolveKeyValues(params);
      Object.assign(paramObj, resolved);
    }

    // ===== Resolve body =====
    let parsedBody: unknown = undefined;
    if (body && body.mode !== 'none' && body.content) {
      parsedBody = resolver.resolveBody(body);
    }

    // ===== Resolve auth (inject into headers/params) =====
    const authResult = authResolver.resolve(auth, resolver);
    Object.assign(headerObj, authResult.headers);
    Object.assign(paramObj, authResult.params);




    // Auto-set Content-Type for JSON body if not already set
    if (parsedBody && !headerObj['Content-Type'] && !headerObj['content-type']) {
      if (body?.mode === 'json') {
        headerObj['Content-Type'] = 'application/json';
      }
    }
    const result = await executorService.execute({
      userId: req.userId,
      environmentName,
      method,
      url: resolvedUrl,
      headers: headerObj,
      params: paramObj,
      body: parsedBody,
      timeout,
      preRequestScript,
      variables,
    });

    // ===== Persist globals if set =====
    if (environmentId && req.userId && result.globalsToSet && Object.keys(result.globalsToSet).length > 0) {
      await environmentService.updateVariables(req.userId, environmentId, result.globalsToSet);
    }

    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Execution failed';
    res.status(500).json({
      success: false,
      error: { code: 'EXECUTION_ERROR', message },
    });
  }
}
