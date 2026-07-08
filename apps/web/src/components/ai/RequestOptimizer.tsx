import { useState, useEffect } from 'react';
import { X, Lightbulb, AlertTriangle } from 'lucide-react';
import { useOptimizerStore, type OptimizationCategory, type Optimization } from '@/stores/optimizerStore';
import { useRequestStore } from '@/stores/requestStore';
import { OptimizationCard } from './OptimizationCard';
import styles from './RequestOptimizer.module.css';

type FilterTab = 'all' | OptimizationCategory;

const SCORE_CLS = (score: number): string => {
  if (score >= 85) return styles['scoreExcellent'] as string;
  if (score >= 65) return styles['scoreGood'] as string;
  if (score >= 40) return styles['scoreFair'] as string;
  return styles['scoreBad'] as string;
};

const SCORE_COLOR = (score: number): string => {
  if (score >= 85) return 'hsl(142,70%,55%)';
  if (score >= 65) return 'hsl(142,70%,45%)';
  if (score >= 40) return 'hsl(38,92%,50%)';
  return 'hsl(0,84%,60%)';
};

const CATEGORY_LABELS: Record<OptimizationCategory, string> = {
  security:      '🔒 Security',
  performance:   '⚡ Performance',
  headers:       '🔧 Headers',
  best_practices:'📖 Best Practices',
  correctness:   '✅ Correctness',
};

interface RequestOptimizerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * RequestOptimizer — slide-in panel showing AI-generated request improvement suggestions.
 * - Score circle with color-coded ring (0-100)
 * - Filter tabs by category
 * - OptimizationCards with Apply button for auto-fixable suggestions
 */
export const RequestOptimizer = ({ isOpen, onClose }: RequestOptimizerProps) => {
  const { state, result, errorMessage, markApplied } = useOptimizerStore();
  const { updateHeaders, updateMethod, updateParams } = useRequestStore();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // Reset filter when new results come in
  useEffect(() => {
    if (state === 'ready') setActiveFilter('all');
  }, [state]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const score = result?.score ?? 0;
  const optimizations = result?.optimizations ?? [];

  // Unique categories present in results
  const presentCategories = [...new Set(optimizations.map((o) => o.category))];

  // Filtered list
  const filtered = activeFilter === 'all'
    ? optimizations
    : optimizations.filter((o) => o.category === activeFilter);

  // Count per category
  const countFor = (cat: OptimizationCategory) =>
    optimizations.filter((o) => o.category === cat).length;

  // Apply a fix to the current request
  const handleApply = (index: number, fix: Optimization['fix']) => {
    if (!fix) return;

    const store = useRequestStore.getState();
    const activeTab = store.tabs.find((t) => t.id === store.activeTabId);
    if (!activeTab) return;

    switch (fix.type) {
      case 'add_header': {
        if (!fix.key) break;
        const existingHeaders = activeTab.headers.filter((h) => h.key);
        const alreadyExists = existingHeaders.some(
          (h) => h.key.toLowerCase() === fix.key!.toLowerCase(),
        );
        if (!alreadyExists) {
          updateHeaders([
            ...activeTab.headers,
            { id: crypto.randomUUID(), key: fix.key, value: fix.value ?? '', description: '', enabled: true },
          ]);
        }
        break;
      }
      case 'add_param': {
        if (!fix.key) break;
        updateParams([
          ...activeTab.params,
          { id: crypto.randomUUID(), key: fix.key, value: fix.value ?? '', description: '', enabled: true },
        ]);
        break;
      }
      case 'change_method': {
        if (fix.value) {
          updateMethod(fix.value as Parameters<typeof updateMethod>[0]);
        }
        break;
      }
    }

    markApplied(index);
  };

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Lightbulb size={18} className={styles.headerIcon} />
            <div>
              <h3 className={styles.headerTitle}>Request Optimizer</h3>
              <div className={styles.headerSub}>AI-powered request quality analysis</div>
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
        {state === 'analyzing' && (
          <div className={styles.emptyState}>
            <div className={styles.spinner} />
            <p className={styles.emptyTitle}>AI is analyzing your request…</p>
            <p className={styles.emptyHint}>Checking headers, security, performance, and best practices</p>
          </div>
        )}

        {/* Score bar + results */}
        {state === 'ready' && result && (
          <>
            {/* Score circle + track */}
            <div className={styles.scoreBar}>
              <div className={`${styles.scoreCircle} ${SCORE_CLS(score)}`}>
                {score}
              </div>
              <div className={styles.scoreInfo}>
                <div className={styles.scoreTitle}>
                  {score >= 85 ? 'Excellent Request' :
                   score >= 65 ? 'Good Request' :
                   score >= 40 ? 'Needs Improvement' :
                   'Critical Issues Found'}
                </div>
                <div className={styles.scoreHint}>
                  {optimizations.length === 0
                    ? 'No improvements needed'
                    : `${optimizations.length} suggestion${optimizations.length !== 1 ? 's' : ''} found`}
                </div>
                <div className={styles.scoreTrack}>
                  <div
                    className={styles.scoreFill}
                    style={{ width: `${score}%`, background: SCORE_COLOR(score) }}
                  />
                </div>
              </div>
            </div>

            {/* All-good state */}
            {optimizations.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.allGoodIcon}>🎉</div>
                <p className={styles.emptyTitle}>Request looks great!</p>
                <p className={styles.emptyHint}>
                  No improvements needed. Your request follows best practices.
                </p>
              </div>
            ) : (
              <>
                {/* Category filter tabs */}
                <div className={styles.filterBar}>
                  <button
                    className={`${styles.filterBtn} ${activeFilter === 'all' ? styles.filterActive : ''}`}
                    onClick={() => setActiveFilter('all')}
                    type="button"
                  >
                    All
                    <span className={styles.filterCount}>{optimizations.length}</span>
                  </button>
                  {presentCategories.map((cat) => (
                    <button
                      key={cat}
                      className={`${styles.filterBtn} ${activeFilter === cat ? styles.filterActive : ''}`}
                      onClick={() => setActiveFilter(cat)}
                      type="button"
                    >
                      {CATEGORY_LABELS[cat]}
                      <span className={styles.filterCount}>{countFor(cat)}</span>
                    </button>
                  ))}
                </div>

                {/* Cards */}
                <div className={styles.content}>
                  {filtered.map((opt, i) => {
                    // Find the real index in the unfiltered list for markApplied
                    const realIndex = optimizations.indexOf(opt);
                    return (
                      <OptimizationCard
                        key={`${opt.category}-${i}`}
                        optimization={opt}
                        index={realIndex}
                        onApply={handleApply}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* Idle (opened before analysis complete) */}
        {state === 'idle' && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💡</div>
            <p className={styles.emptyTitle}>No analysis yet</p>
            <p className={styles.emptyHint}>
              Send a request first, then click the 💡 button to analyze it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
