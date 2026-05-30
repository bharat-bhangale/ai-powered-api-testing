import type { Request, Response } from 'express';
import { TestRunnerService } from './test-runner.service';
import type { ExecuteTestBody } from './test-runner.validation';

const testRunnerService = new TestRunnerService();

/**
 * POST /api/test-runner/execute
 *
 * Receives a test script + request/response context,
 * executes the script in a sandboxed environment,
 * and returns structured test results.
 */
export async function executeTests(req: Request, res: Response): Promise<void> {
  try {
    const { script, request, response, variables } = req.body as ExecuteTestBody;

    const results = await testRunnerService.runTests({
      script,
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body,
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: response.body,
        size: response.size,
        timing: response.timing,
      },
      variables,
    });

    res.json({
      success: true,
      data: {
        results: results.tests,
        totalPassed: results.totalPassed,
        totalFailed: results.totalFailed,
        duration: results.duration,
        logs: results.logs,
        error: results.error,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Test execution failed';
    res.status(500).json({
      success: false,
      error: { code: 'TEST_EXECUTION_ERROR', message },
    });
  }
}
