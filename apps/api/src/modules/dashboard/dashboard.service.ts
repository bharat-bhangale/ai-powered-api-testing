import { dbProvider } from '../../data/database-provider';
import type { TestRunRecord } from '@atx/db';
import type { IRequestRunResult } from '../test-runs/TestRun.model';

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
    const allRuns = await dbProvider.testRuns.listByUser({ userId, limit: 1000 });
    const completedRuns = allRuns.filter((r) => r.status === 'completed' || r.status === 'failed');

    const [passRate, trend, slowestEndpoints, recentFailures, collectionHealth] =
      await Promise.all([
        this.getPassRate(completedRuns),
        this.getTrend(completedRuns),
        this.getSlowestEndpoints(completedRuns),
        this.getRecentFailures(completedRuns),
        this.getCollectionHealth(userId, completedRuns),
      ]);

    return { passRate, trend, slowestEndpoints, recentFailures, collectionHealth };
  }

  /**
   * Overall pass rate across all test runs.
   */
  private async getPassRate(runs: TestRunRecord[]): Promise<PassRateGauge> {
    let totalPassed = 0;
    let totalFailed = 0;

    for (const run of runs) {
      totalPassed += run.totalTestsPassed || 0;
      totalFailed += run.totalTestsFailed || 0;
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
  private async getTrend(runs: TestRunRecord[]): Promise<TrendPoint[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    const recentRuns = runs.filter((r) => r.createdAt >= cutoffDate).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    // Group by date
    const dayMap = new Map<string, { passed: number; failed: number }>();

    for (const run of recentRuns) {
      const date = run.createdAt.split('T')[0]!;
      const existing = dayMap.get(date) || { passed: 0, failed: 0 };
      existing.passed += run.totalTestsPassed || 0;
      existing.failed += run.totalTestsFailed || 0;
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
  private async getSlowestEndpoints(runs: TestRunRecord[]): Promise<SlowestEndpoint[]> {
    // runs are already sorted desc by createdAt
    const recentRuns = runs.slice(0, 50);

    // Aggregate timing per endpoint
    const endpointMap = new Map<string, { totalTiming: number; count: number; method: string; url: string }>();

    for (const run of recentRuns) {
      for (const result of (run.results as IRequestRunResult[]) || []) {
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
  private async getRecentFailures(runs: TestRunRecord[]): Promise<RecentFailure[]> {
    const failedRuns = runs.filter((r) => (r.totalTestsFailed || 0) > 0);

    const failures: RecentFailure[] = [];

    for (const run of failedRuns) {
      for (const result of (run.results as IRequestRunResult[]) || []) {
        for (const test of result.testResults || []) {
          if (!test.passed && failures.length < 10) {
            failures.push({
              runId: run.id,
              collectionName: run.collectionName,
              requestName: result.requestName,
              testName: test.name,
              error: test.error || 'Test failed',
              failedAt: run.createdAt,
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
  private async getCollectionHealth(userId: string, runs: TestRunRecord[]): Promise<CollectionHealth[]> {
    const collections = await dbProvider.collections.listByUser(userId);

    return collections.map((col) => {
      const colRuns = runs.filter((r) => r.collectionId === col.id);
      const lastRun = colRuns[0]; // runs are sorted by descending date already

      let totalPassed = 0;
      let totalFailed = 0;
      for (const run of colRuns) {
        totalPassed += run.totalTestsPassed || 0;
        totalFailed += run.totalTestsFailed || 0;
      }
      const total = totalPassed + totalFailed;

      return {
        collectionId: col.id,
        collectionName: col.name,
        passRate: total > 0 ? Math.round((totalPassed / total) * 100) : 0,
        totalTests: total,
        lastRunAt: lastRun ? lastRun.createdAt : null,
        lastRunStatus: lastRun?.status || null,
      };
    });
  }
}
