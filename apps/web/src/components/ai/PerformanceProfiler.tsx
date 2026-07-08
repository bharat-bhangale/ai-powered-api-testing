import { useState, useEffect } from 'react';
import { X, BarChart3, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { usePerformanceStore, type Trend, type Optimization } from '@/stores/performanceStore';
import { PerformanceGauge } from './PerformanceGauge';
import { BottleneckCard } from './BottleneckCard';
import styles from './PerformanceProfiler.module.css';

type ProfilerTab = 'bottlenecks' | 'optimizations' | 'trends';

interface PerformanceProfilerProps {
  isOpen: boolean;
  collectionId: string;
  collectionName: string;
  onClose: () => void;
}

/**
 * PerformanceProfiler — slide-in panel showing:
 * - Circular performance score gauge (0–100)
 * - Bottlenecks tab: severity-sorted cards with issue + AI suggestion
 * - Optimizations tab: caching, pagination, compression opportunities
 * - Trends tab: improving/degrading endpoint patterns
 *
 * Opened from the collection context menu → "Performance Profile".
 */
export const PerformanceProfiler = ({ isOpen, collectionId, collectionName, onClose }: PerformanceProfilerProps) => {
  const { state, profile, errorMessage, runProfile } = usePerformanceStore();
  const [activeTab, setActiveTab] = useState<ProfilerTab>('bottlenecks');

  // Start profiling when opened
  useEffect(() => {
    if (isOpen && collectionId && state === 'idle') {
      runProfile(collectionId);
    }
    if (!isOpen) {
      usePerformanceStore.getState().reset();
    }
  }, [isOpen, collectionId, state, runProfile]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const criticalCount = profile?.bottlenecks.filter((b) => b.severity === 'critical').length ?? 0;
  const highCount = profile?.bottlenecks.filter((b) => b.severity === 'high').length ?? 0;

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <BarChart3 size={20} className={styles.headerGradient} />
            <div>
              <h3 className={styles.headerTitle}>Performance Profile</h3>
              <div className={styles.headerSub}>{collectionName}</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className={styles.errorBanner}>
            <AlertTriangle size={13} />
            {errorMessage}
          </div>
        )}

        {/* Loading */}
        {state === 'loading' && (
          <div className={styles.emptyState}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>AI is analyzing performance data…</p>
            <p className={styles.emptyHint}>Aggregating timing distributions across all endpoints</p>
          </div>
        )}

        {/* Ready state */}
        {state === 'ready' && profile && (
          <>
            {/* Overview: gauge + stats */}
            <div className={styles.overview}>
              <PerformanceGauge score={profile.performanceScore} size={130} />
              <div className={styles.stats}>
                <div className={styles.statRow}>
                  <div className={styles.stat}>
                    <span className={styles.statValue} style={{ color: 'hsl(0,84%,60%)' }}>{criticalCount}</span>
                    <span className={styles.statLabel}>Critical</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue} style={{ color: 'hsl(25,95%,55%)' }}>{highCount}</span>
                    <span className={styles.statLabel}>High</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{profile.bottlenecks.length}</span>
                    <span className={styles.statLabel}>Bottlenecks</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{profile.optimizations.length}</span>
                    <span className={styles.statLabel}>Optimizations</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab bar */}
            <div className={styles.tabBar}>
              {([
                { key: 'bottlenecks', label: 'Bottlenecks', icon: <AlertTriangle size={13} />, count: profile.bottlenecks.length },
                { key: 'optimizations', label: 'Optimizations', icon: <Zap size={13} />, count: profile.optimizations.length },
                { key: 'trends', label: 'Trends', icon: <TrendingUp size={13} />, count: profile.trends.length },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                  type="button"
                >
                  {tab.icon}
                  {tab.label}
                  {tab.count > 0 && <span className={styles.tabCount}>{tab.count}</span>}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className={styles.content}>
              {activeTab === 'bottlenecks' && (
                profile.bottlenecks.length > 0
                  ? profile.bottlenecks.map((b, i) => <BottleneckCard key={`${b.endpoint}-${i}`} bottleneck={b} />)
                  : <EmptyTab icon="✅" title="No bottlenecks detected" hint="All endpoints are performing within acceptable ranges." />
              )}

              {activeTab === 'optimizations' && (
                profile.optimizations.length > 0
                  ? profile.optimizations.map((o, i) => <OptimizationCard key={`${o.endpoint}-${i}`} opt={o} />)
                  : <EmptyTab icon="🎉" title="No optimizations needed" hint="The API is well-optimized based on the analyzed data." />
              )}

              {activeTab === 'trends' && (
                profile.trends.length > 0
                  ? profile.trends.map((t, i) => <TrendRow key={`${t.endpoint}-${i}`} trend={t} />)
                  : <EmptyTab icon="📊" title="Not enough data for trends" hint="Run more requests over time to see performance trends." />
              )}
            </div>
          </>
        )}

        {/* Idle / Error with no data */}
        {state === 'idle' && (
          <div className={styles.emptyState}>
            <BarChart3 size={48} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>Loading performance data…</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────

const TREND_BADGE: Record<string, string> = {
  improving: styles['trendImproving'] as string,
  degrading:  styles['trendDegrading'] as string,
  stable:     styles['trendStable'] as string,
};

const TrendRow = ({ trend }: { trend: Trend }) => {
  const badgeCls = TREND_BADGE[trend.trend] ?? '';
  const sign = trend.changePercent > 0 ? '+' : '';
  return (
    <div className={styles.trendRow}>
      <span className={styles.trendEndpoint}>{trend.endpoint}</span>
      <span className={`${styles.trendBadge} ${badgeCls}`}>{trend.trend}</span>
      <span className={styles.trendChange}>{sign}{trend.changePercent.toFixed(0)}%</span>
    </div>
  );
};

const OptimizationCard = ({ opt }: { opt: Optimization }) => (
  <div className={styles.optCard}>
    <div className={styles.optHeader}>
      <span className={styles.optType}>{opt.type}</span>
      <span className={styles.optEndpoint}>{opt.endpoint}</span>
    </div>
    <p className={styles.optObservation}>{opt.observation}</p>
    <p className={styles.optSuggestion}>💡 {opt.suggestion}</p>
  </div>
);

const EmptyTab = ({ icon, title, hint }: { icon: string; title: string; hint: string }) => (
  <div className={styles.emptyState}>
    <div style={{ fontSize: 36 }}>{icon}</div>
    <p className={styles.emptyTitle}>{title}</p>
    <p className={styles.emptyHint}>{hint}</p>
  </div>
);
