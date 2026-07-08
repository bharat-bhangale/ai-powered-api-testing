import { useEffect } from 'react';
import {
  X,
  ArrowRight,
  AlertOctagon,
  AlertTriangle,
  Shuffle,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { useDiffStore } from '@/stores/diffStore';
import { DiffCategory } from './DiffCategory';
import { DiffItem } from './DiffItem';
import styles from './APIDiffPanel.module.css';

interface APIDiffPanelProps {
  isOpen: boolean;
  collectionId: string;
  collectionName: string;
  onClose: () => void;
}

/**
 * APIDiffPanel — slide-in drawer for AI API Diff & Breaking Change Detector.
 *
 * Flow:
 * 1. Open → loadDates() fetches available snapshot dates
 * 2. User picks baseline + current dates from dropdowns (only dates with data)
 * 3. "Run Diff" → analyze() runs structural comparison + AI categorization
 * 4. Results show 4 collapsible categories + optional migration guide modal
 */
export const APIDiffPanel = ({
  isOpen,
  collectionId,
  collectionName,
  onClose,
}: APIDiffPanelProps) => {
  const {
    state,
    availableDates,
    baselineDate,
    currentDate,
    result,
    errorMessage,
    showMigrationGuide,
    setBaselineDate,
    setCurrentDate,
    setShowMigrationGuide,
    loadDates,
    analyze,
    reset,
  } = useDiffStore();

  // Load available dates when opened
  useEffect(() => {
    if (isOpen && collectionId && state === 'idle') {
      loadDates(collectionId);
    }
    if (!isOpen) reset();
  }, [isOpen, collectionId, state, loadDates, reset]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isLoading = state === 'loading-dates' || state === 'analyzing';
  const hasDates = availableDates.length >= 2;
  const canAnalyze = hasDates && baselineDate && currentDate && baselineDate !== currentDate && !isLoading;

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Shuffle size={20} className={styles.headerIcon} />
            <div>
              <h3 className={styles.headerTitle}>API Diff & Change Detector</h3>
              <div className={styles.headerSub}>{collectionName}</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className={styles.errorBanner}>
            <AlertTriangle size={13} />
            {errorMessage}
          </div>
        )}

        {/* Date selector row */}
        <div className={styles.dateRow}>
          <div className={styles.dateGroup}>
            <label className={styles.dateLabel}>Baseline (earlier)</label>
            <select
              className={styles.dateSelect}
              value={baselineDate}
              onChange={(e) => setBaselineDate(e.target.value)}
              disabled={!hasDates || isLoading}
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <ArrowRight size={18} className={styles.arrowIcon} />

          <div className={styles.dateGroup}>
            <label className={styles.dateLabel}>Current (later)</label>
            <select
              className={styles.dateSelect}
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              disabled={!hasDates || isLoading}
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <button
            className={styles.analyzeBtn}
            onClick={() => analyze(collectionId)}
            disabled={!canAnalyze}
            type="button"
          >
            {state === 'analyzing' ? 'Analyzing…' : '🔍 Run Diff'}
          </button>
        </div>

        {/* Summary banner */}
        {result && (
          <div className={styles.summaryBanner}>
            <span className={styles.summaryText}>{result.summary}</span>
            {result.migrationGuide && (
              <button
                className={styles.migrationBtn}
                onClick={() => setShowMigrationGuide(true)}
                type="button"
              >
                <BookOpen size={11} />
                Migration Guide
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className={styles.emptyState}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>
              {state === 'loading-dates' ? 'Loading available dates…' : 'AI is analyzing changes…'}
            </p>
            {state === 'analyzing' && (
              <p className={styles.emptyHint}>
                Running structural diff across {availableDates.length} snapshots
              </p>
            )}
          </div>
        )}

        {/* Ready — no analysis yet */}
        {(state === 'ready-dates' || state === 'idle') && !result && !isLoading && (
          <div className={styles.emptyState}>
            {!hasDates ? (
              <>
                <div className={styles.emptyIcon}>📭</div>
                <p className={styles.emptyTitle}>Not enough history data</p>
                <p className={styles.emptyHint}>
                  Run requests on at least two different days to enable diff analysis.
                </p>
              </>
            ) : (
              <>
                <div className={styles.emptyIcon}>🔬</div>
                <p className={styles.emptyTitle}>Select dates and run the diff</p>
                <p className={styles.emptyHint}>
                  Choose a baseline and current date above, then click "Run Diff" to detect breaking changes.
                </p>
              </>
            )}
          </div>
        )}

        {/* Results */}
        {result && !isLoading && (
          <div className={styles.content}>
            <DiffCategory
              type="breaking"
              title="Breaking Changes"
              icon={<AlertOctagon size={15} color="hsl(0,84%,60%)" />}
              count={result.breakingChanges.length}
              defaultOpen
            >
              {result.breakingChanges.map((item, i) => (
                <DiffItem key={`breaking-${i}`} kind="breaking" item={item} />
              ))}
            </DiffCategory>

            <DiffCategory
              type="deprecation"
              title="Deprecations"
              icon={<AlertTriangle size={15} color="hsl(38,92%,50%)" />}
              count={result.deprecations.length}
            >
              {result.deprecations.map((item, i) => (
                <DiffItem key={`deprecation-${i}`} kind="deprecation" item={item} />
              ))}
            </DiffCategory>

            <DiffCategory
              type="drift"
              title="Schema Drift"
              icon={<Shuffle size={15} color="hsl(271,76%,65%)" />}
              count={result.drifts.length}
            >
              {result.drifts.map((item, i) => (
                <DiffItem key={`drift-${i}`} kind="drift" item={item} />
              ))}
            </DiffCategory>

            <DiffCategory
              type="enhancement"
              title="Enhancements"
              icon={<Sparkles size={15} color="hsl(142,70%,45%)" />}
              count={result.enhancements.length}
            >
              {result.enhancements.map((item, i) => (
                <DiffItem key={`enhancement-${i}`} kind="enhancement" item={item} />
              ))}
            </DiffCategory>
          </div>
        )}

        {/* Migration Guide Modal */}
        {showMigrationGuide && result?.migrationGuide && (
          <div className={styles.migrationOverlay} onClick={() => setShowMigrationGuide(false)}>
            <div className={styles.migrationModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.migrationModalHeader}>
                <h4 className={styles.migrationModalTitle}>
                  📋 Migration Guide
                </h4>
                <button className={styles.closeBtn} onClick={() => setShowMigrationGuide(false)} type="button">
                  <X size={14} />
                </button>
              </div>
              <pre className={styles.migrationGuideBody}>{result.migrationGuide}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
