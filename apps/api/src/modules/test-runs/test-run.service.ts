import { dbProvider } from '../../data/database-provider';
import type { TestRunRecord } from '@atx/db';
import crypto from 'crypto';

// ===== Types =====

export interface ITestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export interface IRequestRunResult {
  requestId: string;
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
}

interface CreateTestRunParams {
  userId: string;
  collectionId: string;
  collectionName: string;
  environmentId?: string;
  trigger?: 'manual' | 'scheduled' | 'ci';
}

// ===== Service =====

/**
 * TestRun Service — CRUD for test run records.
 * Services never access req/res directly.
 */
export class TestRunService {
  /**
   * Create a new test run record (status: running).
   */
  async create(params: CreateTestRunParams): Promise<TestRunRecord> {
    return dbProvider.testRuns.create({
      id: crypto.randomUUID(),
      userId: params.userId,
      collectionId: params.collectionId,
      collectionName: params.collectionName,
      environmentId: params.environmentId,
      trigger: params.trigger || 'manual',
    });
  }

  /**
   * Append a request result to an existing run and update the summary.
   */
  async addResult(userId: string, runId: string, result: IRequestRunResult): Promise<void> {
    const run = await dbProvider.testRuns.getById({ id: runId, userId });
    if (!run) return;

    const newResults = [...run.results, result];
    await dbProvider.testRuns.update({
      id: runId,
      userId,
      results: newResults,
      completedRequests: run.completedRequests + 1,
      totalTestsPassed: run.totalTestsPassed + result.totalPassed,
      totalTestsFailed: run.totalTestsFailed + result.totalFailed,
      totalDuration: run.totalDuration + result.timing,
    });
  }

  /**
   * Mark a run as completed.
   */
  async complete(
    userId: string,
    runId: string,
    status: 'completed' | 'failed' | 'cancelled',
    totalRequests: number,
  ): Promise<void> {
    await dbProvider.testRuns.update({
      id: runId,
      userId,
      status,
      totalRequests,
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Get a single run by ID.
   */
  async getById(userId: string, runId: string): Promise<TestRunRecord | null> {
    return dbProvider.testRuns.getById({ id: runId, userId });
  }

  /**
   * List runs for a collection (most recent first).
   */
  async listByCollection(
    userId: string,
    collectionId: string,
    limit = 20,
  ): Promise<TestRunRecord[]> {
    const allRuns = await dbProvider.testRuns.listByUser({ userId, limit: 1000 });
    return allRuns.filter(r => r.collectionId === collectionId).slice(0, limit);
  }

  /**
   * List all runs for a user (most recent first).
   */
  async listByUser(userId: string, limit = 50): Promise<TestRunRecord[]> {
    return dbProvider.testRuns.listByUser({ userId, limit });
  }
}
