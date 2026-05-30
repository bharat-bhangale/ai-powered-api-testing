import { TestRun, type ITestRun, type IRequestRunResult } from './TestRun.model';

// ===== Types =====

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
  async create(params: CreateTestRunParams): Promise<ITestRun> {
    const run = new TestRun({
      userId: params.userId,
      collectionId: params.collectionId,
      collectionName: params.collectionName,
      environmentId: params.environmentId || undefined,
      trigger: params.trigger || 'manual',
      status: 'running',
      results: [],
      summary: {
        totalRequests: 0,
        completedRequests: 0,
        totalTestsPassed: 0,
        totalTestsFailed: 0,
        totalDuration: 0,
      },
      startedAt: new Date(),
    });
    return run.save();
  }

  /**
   * Append a request result to an existing run and update the summary.
   */
  async addResult(runId: string, result: IRequestRunResult): Promise<void> {
    await TestRun.updateOne(
      { _id: runId },
      {
        $push: { results: result },
        $inc: {
          'summary.completedRequests': 1,
          'summary.totalTestsPassed': result.totalPassed,
          'summary.totalTestsFailed': result.totalFailed,
          'summary.totalDuration': result.timing,
        },
      },
    );
  }

  /**
   * Mark a run as completed.
   */
  async complete(
    runId: string,
    status: 'completed' | 'failed' | 'cancelled',
    totalRequests: number,
  ): Promise<void> {
    await TestRun.updateOne(
      { _id: runId },
      {
        $set: {
          status,
          'summary.totalRequests': totalRequests,
          completedAt: new Date(),
        },
      },
    );
  }

  /**
   * Get a single run by ID.
   */
  async getById(userId: string, runId: string): Promise<ITestRun | null> {
    return TestRun.findOne({ _id: runId, userId });
  }

  /**
   * List runs for a collection (most recent first).
   */
  async listByCollection(
    userId: string,
    collectionId: string,
    limit = 20,
  ): Promise<ITestRun[]> {
    return TestRun.find({ userId, collectionId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean() as unknown as ITestRun[];
  }

  /**
   * List all runs for a user (most recent first).
   */
  async listByUser(userId: string, limit = 50): Promise<ITestRun[]> {
    return TestRun.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean() as unknown as ITestRun[];
  }
}
