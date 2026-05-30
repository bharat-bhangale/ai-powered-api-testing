import { buildAtxGlobal, type RequestContext, type ResponseContext, type TestResult } from './atx-api';
import { executeSandbox } from './sandbox';

// ===== Types =====

export interface RunTestsParams {
  script: string;
  request: RequestContext;
  response: ResponseContext;
  variables?: Record<string, string>;
}

export interface RunTestsResult {
  tests: TestResult[];
  totalPassed: number;
  totalFailed: number;
  duration: number;
  logs: string[];
  error?: string;
}

// ===== Service =====

/**
 * Test Runner Service — orchestrates test execution:
 * 1. Builds the `atx` global context from request + response data
 * 2. Executes the test script inside the vm sandbox
 * 3. Collects and returns structured results
 *
 * This service receives plain TypeScript params — it NEVER accesses req/res.
 */
export class TestRunnerService {
  /**
   * Executes a test script against a request/response pair.
   */
  async runTests(params: RunTestsParams): Promise<RunTestsResult> {
    const { script, request, response, variables } = params;

    // Reject empty scripts early
    if (!script || !script.trim()) {
      return {
        tests: [],
        totalPassed: 0,
        totalFailed: 0,
        duration: 0,
        logs: [],
        error: 'No test script provided',
      };
    }

    // Build the atx context with request + response data
    const { atx, collected } = buildAtxGlobal(request, response, variables);

    // Execute the script inside the sandboxed vm
    const sandboxResult = executeSandbox(script, atx, collected);

    // Calculate pass/fail counts
    const totalPassed = sandboxResult.tests.filter((t) => t.passed).length;
    const totalFailed = sandboxResult.tests.filter((t) => !t.passed).length;

    return {
      tests: sandboxResult.tests,
      totalPassed,
      totalFailed,
      duration: sandboxResult.duration,
      logs: sandboxResult.logs,
      error: sandboxResult.error,
    };
  }
}
