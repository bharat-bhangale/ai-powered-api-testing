import { useState, useEffect } from 'react';
import { X, Zap, AlertTriangle } from 'lucide-react';
import { useFuzzStore, type FuzzVerdict } from '@/stores/fuzzStore';
import { FuzzCategorySelector } from './FuzzCategorySelector';
import { FuzzResultRow } from './FuzzResultRow';
import styles from './FuzzTestRunner.module.css';

interface FuzzTestRunnerProps {
  isOpen: boolean;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  onClose: () => void;
}

type VerdictFilter = 'all' | FuzzVerdict;

const FILTER_LABELS: Record<VerdictFilter, string> = {
  all:     'All',
  crash:   '💥 Crashes',
  fail:    '⚠ Failures',
  leak:    '🔍 Leaks',
  timeout: '⏱ Timeouts',
  pass:    '✅ Passed',
};

/**
 * FuzzTestRunner — slide-in drawer for AI Chaos / Fuzz Testing.
 * User selects categories → clicks Run → live SSE result rows stream in.
 */
export const FuzzTestRunner = ({ isOpen, method, url, headers, body, onClose }: FuzzTestRunnerProps) => {
  const {
    state,
    progress,
    progressMessage,
    results,
    report,
    errorMessage,
    startFuzz,
    stopFuzz,
    reset,
  } = useFuzzStore();

  const [filter, setFilter] = useState<VerdictFilter>('all');

  // Reset on close
  useEffect(() => { if (!isOpen) reset(); }, [isOpen, reset]);

  // Escape to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isRunning = state === 'running';
  const isDone = state === 'done';

  const filteredResults = filter === 'all'
    ? results
    : results.filter((r) => r.verdict === filter);

  const r = report;

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Zap size={20} className={styles.headerIcon} />
            <div>
              <h3 className={styles.headerTitle}>AI Chaos / Fuzz Tester</h3>
              <div className={styles.headerSub}>Adversarial payload injection</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} type="button"><X size={16} /></button>
        </div>

        {/* Disclaimer */}
        <div className={styles.disclaimer}>
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>Fuzz testing sends malicious payloads.</strong> Only test APIs you own or have permission to test.
          </span>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className={styles.errorBanner}><AlertTriangle size={12} />{errorMessage}</div>
        )}

        {/* Category selector + controls */}
        <div className={styles.body} style={{ flex: 'none', overflowY: 'visible' }}>
          <div className={styles.sidebar}>
            <FuzzCategorySelector />
          </div>

          <div className={styles.controls}>
            <button
              className={styles.runBtn}
              onClick={() => startFuzz(method, url, headers, body)}
              disabled={isRunning || !url}
              type="button"
            >
              {isRunning
                ? <><span />Running…</>
                : <><Zap size={14} />{isDone ? 'Re-run' : 'Run Fuzz Test'}</>
              }
            </button>
            {isRunning && (
              <button className={styles.stopBtn} onClick={stopFuzz} type="button">Stop</button>
            )}
          </div>
        </div>

        {/* Progress */}
        {isRunning && (
          <div className={styles.progressWrap}>
            <div className={styles.progressLabel}>
              <span>{progressMessage}</span>
              <span className={styles.progressPct}>{progress}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Summary bar */}
        {(isDone || results.length > 0) && r && (
          <div className={styles.summaryBar}>
            <div className={styles.stat}>
              <span className={`${styles.statValue} ${styles.crash}`}>{r.crashed}</span>
              <span className={styles.statLabel}>Crashes</span>
            </div>
            <div className={styles.stat}>
              <span className={`${styles.statValue} ${styles.fail}`}>{r.failed}</span>
              <span className={styles.statLabel}>Failures</span>
            </div>
            <div className={styles.stat}>
              <span className={`${styles.statValue} ${styles.leaked}`}>{r.leaked}</span>
              <span className={styles.statLabel}>Leaks</span>
            </div>
            <div className={styles.stat}>
              <span className={`${styles.statValue}`}>{r.timedOut}</span>
              <span className={styles.statLabel}>Timeouts</span>
            </div>
            <div className={styles.stat}>
              <span className={`${styles.statValue} ${styles.passed}`}>{r.passed}</span>
              <span className={styles.statLabel}>Passed</span>
            </div>
            <div className={styles.stat}>
              <span className={`${styles.statValue}`}>{r.totalPayloads}</span>
              <span className={styles.statLabel}>Total</span>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        {results.length > 0 && (
          <div className={styles.filterRow}>
            {(Object.keys(FILTER_LABELS) as VerdictFilter[]).map((v) => (
              <button
                key={v}
                className={`${styles.filterBtn} ${filter === v ? styles.filterActive : ''}`}
                onClick={() => setFilter(v)}
                type="button"
              >
                {FILTER_LABELS[v]}
                {v !== 'all' && ` (${results.filter((r2) => r2.verdict === v).length})`}
              </button>
            ))}
          </div>
        )}

        {/* Results list */}
        <div className={styles.body} style={{ flex: 1 }}>
          {results.length === 0 && state === 'idle' && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>⚡</div>
              <p className={styles.emptyTitle}>Ready to fuzz</p>
              <p className={styles.emptyHint}>
                Select categories above and run the fuzz test to send adversarial payloads to{' '}
                <code>{method} {url || 'this endpoint'}</code>.
              </p>
            </div>
          )}

          {filteredResults.length > 0 && (
            <>
              <div className={styles.colHeader}>
                <span style={{ width: 48 }}>Verdict</span>
                <span style={{ width: 70 }}>Category</span>
                <span style={{ flex: 1 }}>Payload</span>
                <span style={{ width: 38, textAlign: 'right' }}>Status</span>
                <span style={{ width: 45, textAlign: 'right' }}>Time</span>
              </div>
              <div className={styles.resultsList}>
                {filteredResults.map((result) => (
                  <FuzzResultRow key={result.id} result={result} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
