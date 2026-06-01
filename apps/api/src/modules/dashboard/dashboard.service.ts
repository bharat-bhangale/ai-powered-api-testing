import { TestRun } from '../test-runs/TestRun.model';
import { Collection } from '../../models/Collection.model';

// ===== Types =====

export interface PassRateGauge {
  passRate: number;
  totalTests: number;
  passed: number;
  failed: number;
}

export interface TrendPoint {
  date: string;
  passed: number;
  failed: number;
  total: number;
}

export interface SlowestEndpoint {
  method: string;
  url: string;
  avgTiming: number;
  requestCount: number;
}

export interface RecentFailure {
  runId: string;
  collectionName: string;
  requestName: string;
  testName: string;
  error: string;
  failedAt: string;
}

export interface CollectionHealth {
  collectionId: string;
  collectionName: string;
  passRate: number;
  totalTests: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

export interface DashboardData {
  passRate: PassRateGauge;
  trend: TrendPoint[];
  slowestEndpoints: SlowestEndpoint[];
  recentFailures: RecentFailure[];
  collectionHealth: CollectionHealth[];
}

// ===== Service =====

/**
 * Dashboard Service — aggregates test run data into dashboard widgets.
 * Business logic only — no req/res access.
 */
export class DashboardService {
  /**
   * Get full dashboard data for a user.
   */
  async getDashboard(userId: string): Promise<DashboardData> {
    const [passRate, trend, slowestEndpoints, recentFailures, collectionHealth] =
      await Promise.all([
        this.getPassRate(userId),
        this.getTrend(userId),
        this.getSlowestEndpoints(userId),
        this.getRecentFailures(userId),
        this.getCollectionHealth(userId),
      ]);

    return { passRate, trend, slowestEndpoints, recentFailures, collectionHealth };
  }

  /**
   * Overall pass rate across all test runs.
   */
  private async getPassRate(userId: string): Promise<PassRateGauge> {
    const runs = await TestRun.find({ userId, status: { $in: ['completed', 'failed'] } })
      .select('summary')
      .lean();

    let totalPassed = 0;
    let totalFailed = 0;

    for (const run of runs) {
      totalPassed += run.summary?.totalTestsPassed || 0;
      totalFailed += run.summary?.totalTestsFailed || 0;
    }

    const total = totalPassed + totalFailed;
    return {
      passRate: total > 0 ? Math.round((totalPassed / total) * 100) : 0,
      totalTests: total,
      passed: totalPassed,
      failed: totalFailed,
    };
  }

  /**
   * Pass/fail trend over the last 30 days.
   */
  private async getTrend(userId: string): Promise<TrendPoint[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const runs = await TestRun.find({
      userId,
      status: { $in: ['completed', 'failed'] },
      createdAt: { $gte: thirtyDaysAgo },
    })
      .select('summary createdAt')
      .sort({ createdAt: 1 })
      .lean();

    // Group by date
    const dayMap = new Map<string, { passed: number; failed: number }>();

    for (const run of runs) {
      const date = new Date(run.createdAt).toISOString().split('T')[0]!;
      const existing = dayMap.get(date) || { passed: 0, failed: 0 };
      existing.passed += run.summary?.totalTestsPassed || 0;
      existing.failed += run.summary?.totalTestsFailed || 0;
      dayMap.set(date, existing);
    }

    // Fill in missing days
    const result: TrendPoint[] = [];
    const cursor = new Date(thirtyDaysAgo);
    const today = new Date();

    while (cursor <= today) {
      const date = cursor.toISOString().split('T')[0]!;
      const data = dayMap.get(date) || { passed: 0, failed: 0 };
      result.push({
        date,
        passed: data.passed,
        failed: data.failed,
        total: data.passed + data.failed,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return result;
  }

  /**
   * Top 5 slowest endpoints by average response time.
   */
  private async getSlowestEndpoints(userId: string): Promise<SlowestEndpoint[]> {
    const runs = await TestRun.find({
      userId,
      status: { $in: ['completed', 'failed'] },
    })
      .select('results')
      .sort({ createdAt: -1 })
      .limit(50) // Last 50 runs for performance
      .lean();

    // Aggregate timing per endpoint
    const endpointMap = new Map<string, { totalTiming: number; count: number; method: string; url: string }>();

    for (const run of runs) {
      for (const result of run.results || []) {
        const key = `${result.method} ${result.url}`;
        const existing = endpointMap.get(key) || {
          totalTiming: 0,
          count: 0,
          method: result.method,
          url: result.url,
        };
        existing.totalTiming += result.timing || 0;
        existing.count += 1;
        endpointMap.set(key, existing);
      }
    }

    return Array.from(endpointMap.values())
      .map((e) => ({
        method: e.method,
        url: e.url,
        avgTiming: Math.round(e.totalTiming / e.count),
        requestCount: e.count,
      }))
      .sort((a, b) => b.avgTiming - a.avgTiming)
      .slice(0, 5);
  }

  /**
   * Last 10 failed tests across all runs.
   */
  private async getRecentFailures(userId: string): Promise<RecentFailure[]> {
    const runs = await TestRun.find({
      userId,
      'summary.totalTestsFailed': { $gt: 0 },
    })
      .select('collectionName results createdAt')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const failures: RecentFailure[] = [];

    for (const run of runs) {
      for (const result of run.results || []) {
        for (const test of result.testResults || []) {
          if (!test.passed && failures.length < 10) {
            failures.push({
              runId: String(run._id),
              collectionName: run.collectionName,
              requestName: result.requestName,
              testName: test.name,
              error: test.error || 'Test failed',
              failedAt: new Date(run.createdAt).toISOString(),
            });
          }
        }
      }
      if (failures.length >= 10) break;
    }

    return failures;
  }

  /**
   * Collection health grid — pass rate and last run for each collection.
   */
  private async getCollectionHealth(userId: string): Promise<CollectionHealth[]> {
    const collections = await Collection.find({ userId })
      .select('name')
      .lean();

    const healthPromises = collections.map(async (col) => {
      const lastRun = await TestRun.findOne({
        userId,
        collectionId: col._id,
        status: { $in: ['completed', 'failed'] },
      })
        .sort({ createdAt: -1 })
        .select('summary status createdAt')
        .lean();

      const allRuns = await TestRun.find({
        userId,
        collectionId: col._id,
        status: { $in: ['completed', 'failed'] },
      })
        .select('summary')
        .lean();

      let totalPassed = 0;
      let totalFailed = 0;
      for (const run of allRuns) {
        totalPassed += run.summary?.totalTestsPassed || 0;
        totalFailed += run.summary?.totalTestsFailed || 0;
      }
      const total = totalPassed + totalFailed;

      return {
        collectionId: String(col._id),
        collectionName: col.name,
        passRate: total > 0 ? Math.round((totalPassed / total) * 100) : 0,
        totalTests: total,
        lastRunAt: lastRun ? new Date(lastRun.createdAt).toISOString() : null,
        lastRunStatus: lastRun?.status || null,
      };
    });

    return Promise.all(healthPromises);
  }
}
