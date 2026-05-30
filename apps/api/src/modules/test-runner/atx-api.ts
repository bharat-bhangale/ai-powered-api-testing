import { createExpect, type ExpectChain } from './assertion-library';

// ===== Types =====

export interface RequestContext {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface ResponseContext {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  size: number;
  timing: { total: number };
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  expected?: unknown;
  actual?: unknown;
  duration: number;
}

/**
 * The full `atx` global object exposed inside the test sandbox.
 */
export interface AtxGlobal {
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: unknown;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    size: number;
    timing: { total: number };
    /** Parses response body as JSON. Returns the already-parsed body. */
    json: () => unknown;
    /** Returns response body as a string. */
    text: () => string;
  };
  expect: (value: unknown) => ExpectChain;
  test: (name: string, fn: () => void) => void;
  variables: {
    get: (name: string) => string | undefined;
    set: (name: string, value: string) => void;
  };
  log: (message: unknown) => void;
}

// ===== Collected Results =====

interface CollectedData {
  tests: TestResult[];
  logs: string[];
  variables: Map<string, string>;
}

// ===== Factory =====

/**
 * Builds the `atx` global object from request+response data.
 * The object is injected into the vm sandbox context.
 *
 * @param request  - The HTTP request that was sent
 * @param response - The HTTP response that was received
 * @param initialVariables - Optional environment variables to seed atx.variables
 * @returns { atx, collected } — the global and its mutable result collector
 */
export function buildAtxGlobal(
  request: RequestContext,
  response: ResponseContext,
  initialVariables?: Record<string, string>,
): { atx: AtxGlobal; collected: CollectedData } {
  const collected: CollectedData = {
    tests: [],
    logs: [],
    variables: new Map(
      initialVariables ? Object.entries(initialVariables) : [],
    ),
  };

  const atx: AtxGlobal = {
    // ===== Request (read-only) =====
    request: Object.freeze({
      method: request.method,
      url: request.url,
      headers: Object.freeze({ ...request.headers }),
      body: request.body,
    }),

    // ===== Response (read-only) =====
    response: Object.freeze({
      status: response.status,
      statusText: response.statusText,
      headers: Object.freeze({ ...response.headers }),
      body: response.body,
      size: response.size,
      timing: Object.freeze({ total: response.timing.total }),

      json() {
        if (typeof response.body === 'object') return response.body;
        if (typeof response.body === 'string') {
          try {
            return JSON.parse(response.body);
          } catch {
            throw new Error('Response body is not valid JSON');
          }
        }
        return response.body;
      },

      text() {
        if (typeof response.body === 'string') return response.body;
        return JSON.stringify(response.body);
      },
    }),

    // ===== Assertions =====
    expect: (value: unknown) => createExpect(value),

    // ===== Test Registration =====
    test(name: string, fn: () => void) {
      const startTime = Date.now();
      try {
        fn();
        collected.tests.push({
          name,
          passed: true,
          duration: Date.now() - startTime,
        });
      } catch (error: unknown) {
        const err = error as { message?: string; expected?: unknown; actual?: unknown };
        collected.tests.push({
          name,
          passed: false,
          error: err.message || 'Unknown assertion error',
          expected: err.expected,
          actual: err.actual,
          duration: Date.now() - startTime,
        });
      }
    },

    // ===== Variables =====
    variables: {
      get(name: string) {
        return collected.variables.get(name);
      },
      set(name: string, value: string) {
        collected.variables.set(name, value);
      },
    },

    // ===== Logging =====
    log(message: unknown) {
      const str = typeof message === 'string' ? message : JSON.stringify(message);
      collected.logs.push(str);
    },
  };

  return { atx, collected };
}
