import { useEffect, useState, useCallback } from 'react';
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Activity,
  Zap,
  Clock,
} from 'lucide-react';
import {
  fetchDashboard,
  type DashboardData,
  type SlowestEndpoint,
  type RecentFailure,
  type CollectionHealth,
} from '@/services/dashboard.service';
import styles from './DashboardPage.module.css';

// ===== Helpers =====

function getGaugeColor(rate: number): string {
  if (rate >= 80) return '#10b981';
  if (rate >= 50) return '#f59e0b';
  return '#ef4444';
}

function getRateClass(rate: number): string {
  if (rate >= 80) return styles.rateGood ?? '';
  if (rate >= 50) return styles.rateWarn ?? '';
  return styles.rateBad ?? '';
}

function methodClass(method: string): string {
  const key = `method${method.toUpperCase()}` as keyof typeof styles;
  return `${styles.methodBadge ?? ''} ${styles[key] ?? ''}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ===== Component =====

export const DashboardPage = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboard();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loadingState}>
          <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
          &nbsp;Loading dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.emptyState}>
          <AlertTriangle size={32} />
          <span>{error}</span>
          <button className={styles.refreshBtn} onClick={load}>Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { passRate, trend, slowestEndpoints, recentFailures, collectionHealth } = data;

  // Gauge math
  const circumference = 2 * Math.PI * 56;
  const offset = circumference - (passRate.passRate / 100) * circumference;

  // Trend max for scaling
  const trendMax = Math.max(1, ...trend.map((t) => t.total));

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          <BarChart3 size={24} />
          Test Dashboard
        </h1>
        <button className={styles.refreshBtn} onClick={load}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Top row: Gauge + Trend */}
      <div className={styles.widgetGrid}>
        {/* Pass Rate Gauge */}
        <div className={styles.widget}>
          <div className={styles.widgetTitle}>
            <Activity size={14} />
            Pass Rate
          </div>
          <div className={styles.gaugeContainer}>
            <div className={styles.gaugeRing}>
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle className={styles.gaugeTrack} cx="70" cy="70" r="56" />
                <circle
                  className={styles.gaugeFill}
                  cx="70"
                  cy="70"
                  r="56"
                  stroke={getGaugeColor(passRate.passRate)}
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className={styles.gaugeLabel}>
                <span className={styles.gaugePercent}>{passRate.passRate}%</span>
                <span className={styles.gaugeSubtext}>{passRate.totalTests} tests</span>
              </div>
            </div>
            <div className={styles.gaugeStats}>
              <span className={styles.statPassed}>✓ {passRate.passed} passed</span>
              <span className={styles.statFailed}>✗ {passRate.failed} failed</span>
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        <div className={styles.widget}>
          <div className={styles.widgetTitle}>
            <TrendingUp size={14} />
            Test Trend (30 days)
          </div>
          {trend.every((t) => t.total === 0) ? (
            <div className={styles.emptyState}>No test data yet</div>
          ) : (
            <div className={styles.trendChart}>
              {trend.map((day, i) => (
                <div
                  key={i}
                  className={styles.trendBar}
                  title={`${day.date}: ${day.passed} passed, ${day.failed} failed`}
                  style={{ height: '100%' }}
                >
                  <div style={{ flex: 1 }} />
                  {day.failed > 0 && (
                    <div
                      className={styles.trendFail}
                      style={{ height: `${(day.failed / trendMax) * 100}%` }}
                    />
                  )}
                  {day.passed > 0 && (
                    <div
                      className={styles.trendPass}
                      style={{ height: `${(day.passed / trendMax) * 100}%` }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Middle row: Slowest Endpoints + Recent Failures */}
      <div className={styles.bottomGrid}>
        {/* Slowest Endpoints */}
        <div className={styles.widget}>
          <div className={styles.widgetTitle}>
            <Zap size={14} />
            Slowest Endpoints
          </div>
          {slowestEndpoints.length === 0 ? (
            <div className={styles.emptyState}>No data yet</div>
          ) : (
            slowestEndpoints.map((ep: SlowestEndpoint, i: number) => {
              const maxTiming = Math.max(...slowestEndpoints.map((e) => e.avgTiming), 1);
              const pct = (ep.avgTiming / maxTiming) * 100;
              return (
                <div key={i} className={styles.barRow}>
                  <div className={styles.barLabel}>
                    <span className={methodClass(ep.method)}>{ep.method}</span>{' '}
                    {ep.url}
                  </div>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${pct}%` }}>
                      <span className={styles.barValue}>{ep.avgTiming}ms</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Recent Failures */}
        <div className={styles.widget}>
          <div className={styles.widgetTitle}>
            <AlertTriangle size={14} />
            Recent Failures
          </div>
          {recentFailures.length === 0 ? (
            <div className={styles.emptyState}>No failures — all tests passing! 🎉</div>
          ) : (
            recentFailures.map((f: RecentFailure, i: number) => (
              <div key={i} className={styles.failureRow}>
                <div className={styles.failureInfo}>
                  <div className={styles.failureTest}>{f.testName}</div>
                  <div className={styles.failureContext}>
                    {f.collectionName} → {f.requestName}
                  </div>
                  <div className={styles.failureError}>{f.error}</div>
                </div>
                <span className={styles.failureTime}>{timeAgo(f.failedAt)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom row: Collection Health */}
      <div className={`${styles.widget} ${styles.widgetFull}`}>
        <div className={styles.widgetTitle}>
          <Clock size={14} />
          Collection Health
        </div>
        {collectionHealth.length === 0 ? (
          <div className={styles.emptyState}>No collections yet</div>
        ) : (
          <div className={styles.healthGrid}>
            {collectionHealth.map((col: CollectionHealth) => (
              <div key={col.collectionId} className={styles.healthCard}>
                <div className={styles.healthName}>{col.collectionName}</div>
                <div className={`${styles.healthRate} ${getRateClass(col.passRate)}`}>
                  {col.passRate}%
                </div>
                <div className={styles.healthMeta}>
                  {col.totalTests} tests
                  {col.lastRunAt ? ` · Last run ${timeAgo(col.lastRunAt)}` : ' · Never run'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
