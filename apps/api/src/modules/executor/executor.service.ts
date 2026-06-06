import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { validateUrl } from '../../utils/ssrf-guard';
import { executeSandbox } from '../test-runner/sandbox';
import { buildAtxGlobal } from '../test-runner/atx-api';
import { VariableResolver } from './variable-resolver';
import { dbProvider } from '../../data/database-provider';
import crypto from 'crypto';
import { getProxyConfig } from './proxy-config';
import { getCertificateAgent } from './certificate-config';

/**
 * Parameters for executing an HTTP request.
 */
interface ExecuteParams {
  userId?: string;
  environmentName?: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  params: Record<string, string>;
  body: unknown;
  timeout?: number;
  preRequestScript?: string;
  variables?: Record<string, string>;
}

/**
 * Structured execution result returned to the frontend.
 */
interface ExecutionResult {
  success: boolean;
  request: {
    resolvedUrl: string;
    resolvedHeaders: Record<string, string>;
    resolvedBody: unknown;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    size: number;
    timing: {
      total: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
  executedAt: string;
  preRequestLogs?: string[];
  preRequestError?: string;
  globalsToSet?: Record<string, string>;
}

/**
 * Executor service — makes HTTP calls on behalf of the user.
 * Uses SSRF guard, captures timing, and never throws on HTTP status codes.
 * Auto-saves history to the data provider.
 */
export class ExecutorService {
  async execute(params: ExecuteParams): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      let finalUrl = params.url;
      let finalHeaders = { ...params.headers };
      let finalParams = { ...params.params };
      let finalBody = params.body;
      
      let preRequestLogs: string[] = [];
      let preRequestError: string | undefined;
      const globalsToSet: Record<string, string> = {};

      // Execute Pre-Request Script if provided
      if (params.preRequestScript?.trim()) {
        const { atx, collected } = buildAtxGlobal(
          {
            method: params.method,
            url: params.url,
            headers: params.headers,
            body: params.body,
          },
          undefined,
          params.variables || {},
        );

        const sandboxResult = executeSandbox(params.preRequestScript, atx, collected);
        preRequestLogs = sandboxResult.logs;
        preRequestError = sandboxResult.error;

        // Collect globals
        if (collected.globals.size > 0) {
          for (const [k, v] of collected.globals.entries()) {
            globalsToSet[k] = v;
          }
        }

        // If the script set new variables, apply a second pass of resolution
        // to handle any {{variables}} that were injected.
        if (collected.variables.size > 0) {
          const mergedVariables = { ...params.variables };
          for (const [k, v] of collected.variables.entries()) {
            mergedVariables[k] = v;
          }
          
          const resolver = new VariableResolver(mergedVariables);
          
          // Second pass resolution
          finalUrl = resolver.resolve(finalUrl);
          
          for (const [k, v] of Object.entries(finalHeaders)) {
            finalHeaders[k] = resolver.resolve(v);
          }
          
          for (const [k, v] of Object.entries(finalParams)) {
            finalParams[k] = resolver.resolve(v);
          }
          
          if (typeof finalBody === 'string') {
            finalBody = resolver.resolve(finalBody);
          } else if (finalBody && typeof finalBody === 'object') {
            // Stringify, resolve, then parse back if it was an object
            try {
              const resolvedStr = resolver.resolve(JSON.stringify(finalBody));
              finalBody = JSON.parse(resolvedStr);
            } catch {
              // Ignore parse errors, leave as is
            }
          }
        }
      }

      // SSRF protection: validate the target URL before making the request
      await validateUrl(finalUrl);

      // Get proxy and certificate agents
      const proxyAgent = await getProxyConfig();
      const httpsAgent = params.userId ? await getCertificateAgent(params.userId) : null;

      // Build axios config
      const config: AxiosRequestConfig = {
        method: params.method.toLowerCase() as AxiosRequestConfig['method'],
        url: finalUrl,
        headers: finalHeaders || {},
        params: finalParams || {},
        data: finalBody ?? undefined,
        timeout: params.timeout || 30000,
        validateStatus: () => true, // Never throw on any status code
        maxRedirects: 5,
        transformResponse: [(data: string) => data], // Don't auto-parse
        proxy: proxyAgent ? false : undefined, // Disable default proxy if using agent
        httpsAgent: proxyAgent || httpsAgent || undefined,
        httpAgent: proxyAgent || undefined,
      };

      const response: AxiosResponse<string> = await axios(config);
      const endTime = Date.now();

      // Parse body: try JSON, fallback to raw string
      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(response.data);
      } catch {
        parsedBody = response.data;
      }

      // Calculate response size
      const size = typeof response.data === 'string'
        ? Buffer.byteLength(response.data, 'utf8')
        : 0;

      const result: ExecutionResult = {
        success: true,
        request: {
          resolvedUrl: finalUrl,
          resolvedHeaders: finalHeaders,
          resolvedBody: finalBody,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers as Record<string, string>,
          body: parsedBody,
          size,
          timing: { total: endTime - startTime },
        },
        executedAt: new Date().toISOString(),
        preRequestLogs,
        preRequestError,
        globalsToSet,
      };

      if (params.userId) {
        dbProvider.history.record({
          id: crypto.randomUUID(),
          userId: params.userId,
          environmentName: params.environmentName,
          request: result.request,
          response: result.response,
          executedAt: result.executedAt,
        }).catch(err => console.error('Failed to save history:', err));
      }

      return result;
    } catch (error: unknown) {
      const endTime = Date.now();
      const errObj = error instanceof Error ? error : new Error('Unknown error');
      const axiosError = error as { code?: string };

      const result: ExecutionResult = {
        success: false,
        request: {
          resolvedUrl: params.url,
          resolvedHeaders: params.headers,
          resolvedBody: params.body,
        },
        response: {
          status: 0,
          statusText: 'Error',
          headers: {},
          body: null,
          size: 0,
          timing: { total: endTime - startTime },
        },
        error: {
          code: axiosError.code || 'NETWORK_ERROR',
          message: errObj.message || 'Request failed',
        },
        executedAt: new Date().toISOString(),
      };

      if (params.userId) {
        dbProvider.history.record({
          id: crypto.randomUUID(),
          userId: params.userId,
          environmentName: params.environmentName,
          request: result.request,
          response: result.response,
          executedAt: result.executedAt,
        }).catch(err => console.error('Failed to save history:', err));
      }

      return result;
    }
  }
}
