import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { validateUrl } from '../../utils/ssrf-guard';

/**
 * Parameters for executing an HTTP request.
 */
interface ExecuteParams {
  method: string;
  url: string;
  headers: Record<string, string>;
  params: Record<string, string>;
  body: unknown;
  timeout?: number;
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
}

/**
 * Executor service — makes HTTP calls on behalf of the user.
 * Uses SSRF guard, captures timing, and never throws on HTTP status codes.
 */
export class ExecutorService {
  async execute(params: ExecuteParams): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // SSRF protection: validate the target URL before making the request
      await validateUrl(params.url);

      // Build axios config
      const config: AxiosRequestConfig = {
        method: params.method.toLowerCase() as AxiosRequestConfig['method'],
        url: params.url,
        headers: params.headers || {},
        params: params.params || {},
        data: params.body ?? undefined,
        timeout: params.timeout || 30000,
        validateStatus: () => true, // Never throw on any status code
        maxRedirects: 5,
        transformResponse: [(data: string) => data], // Don't auto-parse
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

      return {
        success: true,
        request: {
          resolvedUrl: params.url,
          resolvedHeaders: params.headers,
          resolvedBody: params.body,
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
      };
    } catch (error: unknown) {
      const endTime = Date.now();
      const errObj = error instanceof Error ? error : new Error('Unknown error');
      const axiosError = error as { code?: string };

      return {
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
    }
  }
}
