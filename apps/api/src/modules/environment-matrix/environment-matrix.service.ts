import { CollectionRunnerService, type RunEvent } from '../collection-runner/collection-runner.service';

// ===== Types =====

export interface MatrixEnvironment {
  id: string;
  name: string;
}

export interface MatrixRequestResult {
  requestName: string;
  method: string;
  url: string;
  environments: Record<string, {
    status: number;
    statusText: string;
    timing: number;
    testsPassed: number;
    testsFailed: number;
    error?: string;
  }>;
}

export interface MatrixResult {
  environments: MatrixEnvironment[];
  requests: MatrixRequestResult[];
  totals: Record<string, {
    passed: number;
    failed: number;
    duration: number;
  }>;
}

export interface MatrixProgressEvent {
  type: 'matrix_progress';
  data: {
    environmentName: string;
    environmentIndex: number;
    totalEnvironments: number;
    requestIndex: number;
    totalRequests: number;
    requestName: string;
    method: string;
    status: number;
    timing: number;
  };
}

export interface MatrixCompleteEvent {
  type: 'matrix_complete';
  data: MatrixResult;
}

export type MatrixEvent = MatrixProgressEvent | MatrixCompleteEvent;

// ===== Service =====

/**
 * Environment Matrix Service — runs the same collection test suite
 * across multiple environments simultaneously and builds a comparison matrix.
 */
export class EnvironmentMatrixService {
  private runner = new CollectionRunnerService();

  /**
   * Execute a collection across multiple environments.
   * Yields progress events and a final matrix result.
   */
  async *run(
    userId: string,
    collectionId: string,
    environmentIds: string[],
    environmentNames: string[],
  ): AsyncGenerator<MatrixEvent> {
    const matrixRequests: Map<string, MatrixRequestResult> = new Map();
    const totals: Record<string, { passed: number; failed: number; duration: number }> = {};
    const environments: MatrixEnvironment[] = environmentIds.map((id, i) => ({
      id,
      name: environmentNames[i] || `Environment ${i + 1}`,
    }));

    // Execute for each environment sequentially
    for (let envIdx = 0; envIdx < environmentIds.length; envIdx++) {
      const envId = environmentIds[envIdx]!;
      const envName = environmentNames[envIdx] || `Environment ${envIdx + 1}`;

      totals[envName] = { passed: 0, failed: 0, duration: 0 };

      const generator = this.runner.run({
        userId,
        collectionId,
        environmentId: envId,
      });

      for await (const event of generator) {
        if (event.type === 'progress') {
          const { requestName, method, url, status, statusText, timing, totalPassed, totalFailed, error } = event.data;

          // Build or update the matrix row for this request
          const key = `${method} ${requestName}`;
          if (!matrixRequests.has(key)) {
            matrixRequests.set(key, {
              requestName,
              method,
              url,
              environments: {},
            });
          }

          const row = matrixRequests.get(key)!;
          row.environments[envName] = {
            status,
            statusText,
            timing,
            testsPassed: totalPassed,
            testsFailed: totalFailed,
            error,
          };

          totals[envName]!.passed += totalPassed;
          totals[envName]!.failed += totalFailed;
          totals[envName]!.duration += timing;

          // Yield progress
          yield {
            type: 'matrix_progress',
            data: {
              environmentName: envName,
              environmentIndex: envIdx,
              totalEnvironments: environmentIds.length,
              requestIndex: event.data.requestIndex,
              totalRequests: event.data.total,
              requestName,
              method,
              status,
              timing,
            },
          };
        }
      }
    }

    // Yield final matrix result
    yield {
      type: 'matrix_complete',
      data: {
        environments,
        requests: Array.from(matrixRequests.values()),
        totals,
      },
    };
  }
}
