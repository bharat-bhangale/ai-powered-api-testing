import { apiClient } from './api';

// ===== Types =====

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  expected?: unknown;
  actual?: unknown;
  duration: number;
}

export interface TestRunResponse {
  results: TestResult[];
  totalPassed: number;
  totalFailed: number;
  duration: number;
  logs: string[];
  error?: string;
}

interface RequestContext {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

interface ResponseContext {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  size: number;
  timing: { total: number };
}

// ===== API Calls =====

/**
 * Executes a test script against a request/response pair via the backend sandbox.
 */
export async function executeTests(
  script: string,
  request: RequestContext,
  response: ResponseContext,
  variables?: Record<string, string>,
): Promise<TestRunResponse> {
  const res = await apiClient.post('/api/test-runner/execute', {
    script,
    request,
    response,
    variables,
  });

  return res.data.data;
}
