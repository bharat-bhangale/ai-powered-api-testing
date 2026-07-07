import { dbProvider } from '../../data/database-provider';
import type { TestRunRecord } from '@atx/db';
import type { IRequestRunResult } from './TestRun.model';

// ===== Types =====

export interface FlakyTest {
  testName: string;
  requestName: string;
  method: string;
  url: string;
  flakinessRate: number; // 0-100, higher = more flaky
  passCount: number;
  failCount: number;
  totalRuns: number;
  lastSeen: string;
}

export interface RegressionAlert {
  testName: string;
  requestName: string;
  method: string;
  url: string;
  failedAt: string;
  previousPassStreak: number; // days passing before failure
  severity: 'critical' | 'warning';
}

export interface PerformanceDegradation {
  requestName: string;
  method: string;
  url: string;
  baselineTiming: number;
  currentTiming: number;
  increasePercent: number;
  detectedAt: string;
}

export interface TestTrendPoint {
  date: string;
  totalRuns: number;
  passed: number;
  failed: number;
  passRate: number;
  avgDuration: number;
}

export interface RunHistoryEntry {
  id: string;
  collectionName: string;
  trigger: string;
  status: string;
  totalPassed: number;
  totalFailed: number;
  totalDuration: number;
  startedAt: string;
  completedAt: string | null;
}

export interface TrendAnalysis {
  history: RunHistoryEntry[];
  trend: TestTrendPoint[];
  flakyTests: FlakyTest[];
  regressions: RegressionAlert[];
  performanceDegradations: PerformanceDegradation[];
}

// ===== Constants =====

const FLAKINESS_THRESHOLD = 0.2; // 20%+ alternation = flaky
const REGRESSION_PASS_STREAK_DAYS = 7;
const PERFORMANCE_THRESHOLD = 0.5; // 50%+ increase
const MAX_RUNS_ANALYZED = 100;

// ===== Service =====

/**
 * Test Trend Service — analyzes historical test runs for patterns:
 * flaky tests, regressions, and performance degradation.
 */
export class TestTrendService {
  /**
   * Full trend analysis for a user.
   */
  async analyze(userId: string, collectionId?: string): Promise<TrendAnalysis> {
    const allRuns = await dbProvider.testRuns.listByUser({ userId, limit: 500 });
    let runs = allRuns.filter(r => r.status === 'completed' || r.status === 'failed');
    if (collectionId) {
      runs = runs.filter(r => r.collectionId === collectionId);
    }
    runs = runs.slice(0, MAX_RUNS_ANALYZED);

    const history = runs.map((r) => this.toHistoryEntry(r));
    const trend = this.buildTrend(runs);
    const flakyTests = this.detectFlakyTests(runs);
    const regressions = this.detectRegressions(runs);
    const performanceDegradations = this.detectPerformanceDegradation(runs);

    return { history, trend, flakyTests, regressions, performanceDegradations };
  }

  /**
   * Get run history for a user/collection with pagination.
   */
  async getHistory(
    userId: string,
    collectionId?: string,
    page = 1,
    limit = 20,
  ): Promise<{ runs: RunHistoryEntry[]; total: number }> {
    const allRuns = await dbProvider.testRuns.listByUser({ userId, limit: 1000 });
    let runs = allRuns;
    if (collectionId) {
      runs = runs.filter(r => r.collectionId === collectionId);
    }

    const total = runs.length;
    runs = runs.slice((page - 1) * limit, page * limit);

    return {
      runs: runs.map((r) => this.toHistoryEntry(r)),
      total,
    };
  }

  // ===== Private Methods =====

  private toHistoryEntry(run: TestRunRecord): RunHistoryEntry {
    return {
      id: run.id,
      collectionName: run.collectionName,
      trigger: run.trigger,
      status: run.status,
      totalPassed: run.totalTestsPassed || 0,
      totalFailed: run.totalTestsFailed || 0,
      totalDuration: run.totalDuration || 0,
      startedAt: run.startedAt,
      completedAt: run.completedAt || null,
    };
  }

  /**
   * Build daily trend data from runs.
   */
  private buildTrend(runs: TestRunRecord[]): TestTrendPoint[] {
    if (runs.length === 0) return [];

    const dayMap = new Map<string, {
      totalRuns: number;
      passed: number;
      failed: number;
      durations: number[];
    }>();

    for (const run of runs) {
      const date = new Date(run.createdAt).toISOString().split('T')[0]!;
      const existing = dayMap.get(date) || { totalRuns: 0, passed: 0, failed: 0, durations: [] };
      existing.totalRuns += 1;
      existing.passed += run.totalTestsPassed || 0;
      existing.failed += run.totalTestsFailed || 0;
      existing.durations.push(run.totalDuration || 0);
      dayMap.set(date, existing);
    }

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        const total = data.passed + data.failed;
        return {
          date,
          totalRuns: data.totalRuns,
          passed: data.passed,
          failed: data.failed,
          passRate: total > 0 ? Math.round((data.passed / total) * 100) : 0,
          avgDuration: data.durations.length > 0
            ? Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length)
            : 0,
        };
      });
  }

  /**
   * Detect flaky tests — tests that alternate between pass/fail.
   */
  private detectFlakyTests(runs: TestRunRecord[]): FlakyTest[] {
    // Build per-test history: testKey => [passed, failed, passed, ...]
    const testHistory = new Map<string, {
      requestName: string;
      method: string;
      url: string;
      outcomes: boolean[];
      lastSeen: string;
    }>();

    // Process runs oldest→newest
    const chronological = [...runs].reverse();

    for (const run of chronological) {
      for (const result of (run.results as IRequestRunResult[]) || []) {
        for (const test of result.testResults || []) {
          const key = `${result.requestName}::${test.name}`;
          const existing = testHistory.get(key) || {
            requestName: result.requestName,
            method: result.method,
            url: result.url,
            outcomes: [],
            lastSeen: new Date(run.createdAt).toISOString(),
          };
          existing.outcomes.push(test.passed);
          existing.lastSeen = new Date(run.createdAt).toISOString();
          testHistory.set(key, existing);
        }
      }
    }

    const flakyTests: FlakyTest[] = [];

    for (const [, data] of testHistory) {
      if (data.outcomes.length < 3) continue; // Need enough history

      // Count alternations
      let alternations = 0;
      for (let i = 1; i < data.outcomes.length; i++) {
        if (data.outcomes[i] !== data.outcomes[i - 1]) alternations++;
      }

      const flakinessRate = alternations / (data.outcomes.length - 1);
      if (flakinessRate >= FLAKINESS_THRESHOLD) {
        const passCount = data.outcomes.filter(Boolean).length;
        flakyTests.push({
          testName: data.requestName,
          requestName: data.requestName,
          method: data.method,
          url: data.url,
          flakinessRate: Math.round(flakinessRate * 100),
          passCount,
          failCount: data.outcomes.length - passCount,
          totalRuns: data.outcomes.length,
          lastSeen: data.lastSeen,
        });
      }
    }

    return flakyTests
      .sort((a, b) => b.flakinessRate - a.flakinessRate)
      .slice(0, 10);
  }

  /**
   * Detect regressions — tests that were passing for N days then suddenly fail.
   */
  private detectRegressions(runs: TestRunRecord[]): RegressionAlert[] {
    const testHistory = new Map<string, {
      requestName: string;
      method: string;
      url: string;
      results: Array<{ passed: boolean; date: string }>;
    }>();

    // Process oldest→newest
    const chronological = [...runs].reverse();

    for (const run of chronological) {
      const dateStr = new Date(run.createdAt).toISOString();
      for (const result of (run.results as IRequestRunResult[]) || []) {
        for (const test of result.testResults || []) {
          const key = `${result.requestName}::${test.name}`;
          const existing = testHistory.get(key) || {
            requestName: result.requestName,
            method: result.method,
            url: result.url,
            results: [],
          };
          existing.results.push({ passed: test.passed, date: dateStr });
          testHistory.set(key, existing);
        }
      }
    }

    const regressions: RegressionAlert[] = [];

    for (const [testName, data] of testHistory) {
      const results = data.results;
      if (results.length < 3) continue;

      // Check if the last result is a failure
      const last = results[results.length - 1]!;
      if (last.passed) continue;

      // Count consecutive passes before this failure
      let passStreak = 0;
      for (let i = results.length - 2; i >= 0; i--) {
        if (results[i]!.passed) passStreak++;
        else break;
      }

      // Calculate streak in days
      if (passStreak >= 2) {
        const firstPassDate = new Date(results[results.length - 1 - passStreak]!.date);
        const lastPassDate = new Date(results[results.length - 2]!.date);
        const streakDays = Math.ceil(
          (lastPassDate.getTime() - firstPassDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (streakDays >= REGRESSION_PASS_STREAK_DAYS || passStreak >= 5) {
          regressions.push({
            testName: testName.split('::')[1] || testName,
            requestName: data.requestName,
            method: data.method,
            url: data.url,
            failedAt: last.date,
            previousPassStreak: streakDays,
            severity: streakDays >= 14 ? 'critical' : 'warning',
          });
        }
      }
    }

    return regressions.sort((a, b) => b.previousPassStreak - a.previousPassStreak);
  }

  /**
   * Detect performance degradation — response times increased >50% from baseline.
   */
  private detectPerformanceDegradation(runs: TestRunRecord[]): PerformanceDegradation[] {
    const endpointTimings = new Map<string, {
      requestName: string;
      method: string;
      url: string;
      timings: Array<{ timing: number; date: string }>;
    }>();

    // Process oldest→newest
    const chronological = [...runs].reverse();

    for (const run of chronological) {
      const dateStr = new Date(run.createdAt).toISOString();
      for (const result of (run.results as IRequestRunResult[]) || []) {
        const key = `${result.method} ${result.url}`;
        const existing = endpointTimings.get(key) || {
          requestName: result.requestName,
          method: result.method,
          url: result.url,
          timings: [],
        };
        existing.timings.push({ timing: result.timing, date: dateStr });
        endpointTimings.set(key, existing);
      }
    }

    const degradations: PerformanceDegradation[] = [];

    for (const [, data] of endpointTimings) {
      if (data.timings.length < 5) continue; // Need enough data

      // Baseline: average of first 50% of data points
      const halfIdx = Math.floor(data.timings.length / 2);
      const baselineTimings = data.timings.slice(0, halfIdx);
      const recentTimings = data.timings.slice(halfIdx);

      const baseline = baselineTimings.reduce((s, t) => s + t.timing, 0) / baselineTimings.length;
      const current = recentTimings.reduce((s, t) => s + t.timing, 0) / recentTimings.length;

      if (baseline > 0) {
        const increase = (current - baseline) / baseline;
        if (increase >= PERFORMANCE_THRESHOLD) {
          degradations.push({
            requestName: data.requestName,
            method: data.method,
            url: data.url,
            baselineTiming: Math.round(baseline),
            currentTiming: Math.round(current),
            increasePercent: Math.round(increase * 100),
            detectedAt: data.timings[data.timings.length - 1]!.date,
          });
        }
      }
    }

    return degradations.sort((a, b) => b.increasePercent - a.increasePercent);
  }
}
