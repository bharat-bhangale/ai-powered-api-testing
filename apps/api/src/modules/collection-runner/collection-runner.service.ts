import { SavedRequest, type ISavedRequest } from '../../models/Request.model';
import { Collection } from '../../models/Collection.model';
import { ExecutorService } from '../executor/executor.service';
import { VariableResolver } from '../executor/variable-resolver';
import { TestRunnerService } from '../test-runner/test-runner.service';
import { TestRunService } from '../test-runs/test-run.service';
import type { IRequestRunResult, ITestResult } from '../test-runs/TestRun.model';
import { Environment } from '../../models/Environment.model';
import { ChainResolver, type ChainContextData } from './chain-resolver';

// ===== Types =====

export interface RunProgressEvent {
  type: 'progress';
  data: {
    requestIndex: number;
    total: number;
    requestName: string;
    method: string;
    url: string;
    status: number;
    statusText: string;
    timing: number;
    size: number;
    testResults: ITestResult[];
    totalPassed: number;
    totalFailed: number;
    error?: string;
  };
}

export interface RunCompleteEvent {
  type: 'complete';
  data: {
    runId: string;
    totalRequests: number;
    completedRequests: number;
    totalTestsPassed: number;
    totalTestsFailed: number;
    totalDuration: number;
    status: 'completed' | 'failed' | 'cancelled';
  };
}

export type RunEvent = RunProgressEvent | RunCompleteEvent;

export interface RunOptions {
  userId: string;
  collectionId: string;
  environmentId?: string;
  signal?: AbortSignal;
}

// ===== Service =====

/**
 * Collection Runner Service — executes all requests in a collection sequentially,
 * runs their test scripts, resolves chain variables, and collects results.
 */
export class CollectionRunnerService {
  private executor = new ExecutorService();
  private testRunner = new TestRunnerService();
  private testRunService = new TestRunService();

  /**
   * Runs all requests in a collection.
   * Yields events as an async generator for SSE streaming.
   */
  async *run(options: RunOptions): AsyncGenerator<RunEvent> {
    const { userId, collectionId, environmentId, signal } = options;
    const { dbProvider } = await import('../../data/database-provider');

    // 1. Load collection
    const collection = await dbProvider.collections.getById({ id: collectionId, userId });
    if (!collection) {
      throw new Error('Collection not found');
    }

    // 2. Load all requests in order
    const requests = await dbProvider.requests.listByCollection({ collectionId, userId });

    if (requests.length === 0) {
      throw new Error('Collection has no requests');
    }

    // 3. Load environment variables
    let envVariables: Record<string, string> = {};
    if (environmentId) {
      const env = await dbProvider.environments.getById({ id: environmentId, userId });
      if (env) {
        for (const v of env.variables) {
          envVariables[v.key] = v.value;
        }
      }
    }

    // 4. Create a TestRun record
    const run = await this.testRunService.create({
      userId,
      collectionId,
      collectionName: collection.name,
      environmentId,
      trigger: 'manual',
    });

    // 5. Track chain context across the run
    const chainContext = new Map<string, ChainContextData>();

    let completedCount = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalDuration = 0;

    // 6. Execute each request sequentially
    for (let i = 0; i < requests.length; i++) {
      // Check abort signal
      if (signal?.aborted) {
        await this.testRunService.complete(userId, run.id, 'cancelled', requests.length);
        yield {
          type: 'complete',
          data: {
            runId: run.id,
            totalRequests: requests.length,
            completedRequests: completedCount,
            totalTestsPassed: totalPassed,
            totalTestsFailed: totalFailed,
            totalDuration,
            status: 'cancelled',
          },
        };
        return;
      }

      const request = requests[i]!;
      const { result: requestResult, chainWarningMsg } = await this.executeRequest(
        request,
        envVariables,
        chainContext,
      );

      // Add to chain context for subsequent requests
      chainContext.set(request.name, {
        status: requestResult.status,
        headers: requestResult.headers,
        body: requestResult.body,
        timing: requestResult.timing,
      });

      // Run test script if it exists
      let testResults: ITestResult[] = [];
      let testPassed = 0;
      let testFailed = 0;

      if (request.testScript?.trim() && requestResult.status > 0) {
        try {
          const testOutput = await this.testRunner.runTests({
            script: request.testScript,
            request: {
              method: request.method,
              url: request.url,
              headers: {},
              body: undefined,
            },
            response: {
              status: requestResult.status,
              statusText: requestResult.statusText,
              headers: requestResult.headers,
              body: requestResult.body,
              size: requestResult.size,
              timing: { total: requestResult.timing },
            },
          });

          testResults = testOutput.tests.map((t) => ({
            name: t.name,
            passed: t.passed,
            error: t.error,
            duration: t.duration,
          }));
          testPassed = testOutput.totalPassed;
          testFailed = testOutput.totalFailed;
        } catch {
          // Test execution error — don't fail the whole run
          testResults = [];
        }
      }

      // Build result record
      const result: IRequestRunResult = {
        requestId: request.id,
        requestName: request.name,
        method: request.method,
        url: request.url,
        status: requestResult.status,
        statusText: requestResult.statusText,
        timing: requestResult.timing,
        size: requestResult.size,
        testResults,
        totalPassed: testPassed,
        totalFailed: testFailed,
        error: chainWarningMsg ? `${requestResult.error ? requestResult.error + ' | ' : ''}${chainWarningMsg}` : requestResult.error,
      };

      // Persist to DB
      await this.testRunService.addResult(userId, run.id, result);

      completedCount++;
      totalPassed += testPassed;
      totalFailed += testFailed;
      totalDuration += requestResult.timing;

      // Yield progress event
      yield {
        type: 'progress',
        data: {
          requestIndex: i,
          total: requests.length,
          requestName: request.name,
          method: request.method,
          url: request.url,
          status: requestResult.status,
          statusText: requestResult.statusText,
          timing: requestResult.timing,
          size: requestResult.size,
          testResults,
          totalPassed: testPassed,
          totalFailed: testFailed,
          error: result.error,
        },
      };
    }

    // 7. Mark run as completed
    const finalStatus = totalFailed > 0 ? 'failed' : 'completed';
    await this.testRunService.complete(userId, run.id, finalStatus, requests.length);

    yield {
      type: 'complete',
      data: {
        runId: run.id,
        totalRequests: requests.length,
        completedRequests: completedCount,
        totalTestsPassed: totalPassed,
        totalTestsFailed: totalFailed,
        totalDuration,
        status: finalStatus,
      },
    };
  }

  // ===== Helpers =====

  /**
   * Execute a single request with variable resolution.
   */
  private async executeRequest(
    request: RequestRecord,
    variables: Record<string, string>,
    chainContext: Map<string, ChainContextData>,
  ): Promise<{
    result: {
      status: number;
      statusText: string;
      headers: Record<string, string>;
      body: unknown;
      timing: number;
      size: number;
      error?: string;
    },
    chainWarningMsg?: string
  }> {
    try {
      const chainWarnings: string[] = [];
      const chainResolver = new ChainResolver(chainContext);
      const envResolver = new VariableResolver(variables);
      
      let chainUrl = request.url;
      const chainHeaders = request.headers;
      const chainParams = request.params;
      const chainBodyRaw = request.body;
      
      try {
        chainUrl = chainResolver.resolve(chainUrl, chainWarnings);
      } catch (e) {
        // Safe fallback
      }

      // Resolve Env variables (chain output feeds into env resolution)
      const resolvedUrl = envResolver.resolve(chainUrl);
      
      const requestHeaders: Array<{ key: string; value: string; enabled: boolean }> = chainHeaders.map((h: { key: string, value: string, enabled: boolean }) => ({
        key: chainResolver.resolve(h.key, chainWarnings),
        value: chainResolver.resolve(h.value, chainWarnings),
        enabled: h.enabled
      }));
      const resolvedHeadersRecord = envResolver.resolveKeyValues(requestHeaders);

      const requestParams: Array<{ key: string; value: string; enabled: boolean }> = chainParams.map((p: { key: string, value: string, enabled: boolean }) => ({
        key: chainResolver.resolve(p.key, chainWarnings),
        value: chainResolver.resolve(p.value, chainWarnings),
        enabled: p.enabled
      }));
      const resolvedParamsRecord = envResolver.resolveKeyValues(requestParams);

      let finalBodyContent = chainBodyRaw.content;
      if (chainBodyRaw.mode !== 'none' && chainBodyRaw.content) {
        finalBodyContent = chainResolver.resolve(chainBodyRaw.content, chainWarnings);
      }
      const resolvedBodyValue = envResolver.resolveBody({ mode: chainBodyRaw.mode, content: finalBodyContent });

      // Build chain warning message if any
      const chainWarningMsg = chainWarnings.length > 0 ? chainWarnings.join(' | ') : undefined;

      // Auto-prepend https if needed
      let url = resolvedUrl;
      if (url && !url.match(/^https?:\/\//i)) {
        url = `https://${url}`;
      }

      const result = await this.executor.execute({
        method: request.method,
        url,
        headers: resolvedHeadersRecord,
        params: resolvedParamsRecord,
        body: resolvedBodyValue,
        timeout: 30000,
      });

      const normalizedHeaders: Record<string, string> = {};
      if (result.response.headers) {
        for (const [k, v] of Object.entries(result.response.headers)) {
          normalizedHeaders[k] = Array.isArray(v) ? v.join(', ') : String(v);
        }
      }

      return {
        result: {
          status: result.response.status,
          statusText: result.response.statusText,
          headers: normalizedHeaders,
          body: result.response.body,
          timing: result.response.timing.total,
          size: result.response.size,
          error: result.error?.message,
        },
        chainWarningMsg,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed';
      return {
        result: {
          status: 0,
          statusText: 'Error',
          headers: {},
          body: null,
          timing: 0,
          size: 0,
          error: message,
        },
      };
    }
  }

  /**
   * Extract response data into chain variables for downstream requests.
   * Format: chain.<requestName>.<path>
   */
  private extractChainVariables(
    requestName: string,
    response: { status: number; body: unknown; headers: Record<string, string> },
    variables: Record<string, string>,
  ): void {
    const safeKey = requestName.replace(/\s+/g, '_');

    // chain.requestName.status
    variables[`chain.${safeKey}.status`] = String(response.status);

    // Extract top-level body fields
    if (response.body && typeof response.body === 'object' && !Array.isArray(response.body)) {
      const body = response.body as Record<string, unknown>;
      for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          variables[`chain.${safeKey}.body.${key}`] = String(value);
        }
      }
    }

    // Extract common auth patterns
    if (response.body && typeof response.body === 'object') {
      const body = response.body as Record<string, unknown>;
      for (const tokenKey of ['token', 'access_token', 'accessToken', 'id']) {
        if (typeof body[tokenKey] === 'string') {
          variables[`chain.${safeKey}.${tokenKey}`] = body[tokenKey] as string;
        }
      }
      // Nested data object
      if (body.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
        const data = body.data as Record<string, unknown>;
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            variables[`chain.${safeKey}.data.${key}`] = String(value);
          }
        }
      }
    }
  }
}
