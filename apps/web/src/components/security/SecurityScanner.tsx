import { useEffect, useRef } from 'react';
import { X, ShieldAlert, AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { useSecurityStore } from '@/stores/securityStore';
import { SecurityScore } from './SecurityScore';
import { SecurityReportCard } from './SecurityReportCard';
import styles from './SecurityScanner.module.css';

interface SecurityScannerProps {
  isOpen: boolean;
  collectionId: string;
  collectionName: string;
  onClose: () => void;
}

/**
 * SecurityScanner — slide-in drawer for OWASP API Security Top 10 scanning.
 *
 * Flow:
 * 1. User reads disclaimer → clicks "Start Scan"
 * 2. SSE streams progress + live findings
 * 3. Completion shows SecurityScore gauge + vulnerability list
 */
export const SecurityScanner = ({ isOpen, collectionId, collectionName, onClose }: SecurityScannerProps) => {
  const {
    state,
    progress,
    progressMessage,
    report,
    recentFindings,
    errorMessage,
    startScan,
    stopScan,
    reset,
  } = useSecurityStore();

  const feedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll live feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [recentFindings.length, progressMessage]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isScanning = state === 'scanning';
  const isDone = state === 'done';
  const criticalCount = report?.vulnerabilities.filter((v) => v.severity === 'critical').length ?? 0;

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <ShieldAlert size={20} className={styles.headerIcon} />
            <div>
              <h3 className={styles.headerTitle}>AI Security Scanner</h3>
              <div className={styles.headerSub}>OWASP API Security Top 10</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} type="button"><X size={16} /></button>
        </div>

        {/* Disclaimer */}
        <div className={styles.disclaimer}>
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>Active security testing</strong> — this tool sends real attack payloads to your API.
            Only scan APIs you own or have explicit permission to test.
            Do not use on production systems without authorization.
          </span>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className={styles.errorBanner}>
            <AlertTriangle size={13} />
            {errorMessage}
          </div>
        )}

        {/* Scan controls */}
        <div className={styles.controls}>
          <button
            className={styles.scanBtn}
            onClick={() => startScan(collectionId, collectionName)}
            disabled={isScanning}
            type="button"
          >
            {isScanning
              ? <><span className="spinner-sm" />Scanning…</>
              : <><ShieldAlert size={14} /> {isDone ? 'Re-scan' : 'Start Scan'}</>
            }
          </button>

          {isScanning && (
            <button className={styles.stopBtn} onClick={stopScan} type="button">
              Stop
            </button>
          )}

          <span className={styles.collectionInfo}>
            Collection: <strong>{collectionName}</strong>
          </span>
        </div>

        {/* Progress */}
        {isScanning && (
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

        {/* Live findings feed */}
        {(isScanning || recentFindings.length > 0) && (
          <div className={styles.feedWrap} ref={feedRef}>
            {recentFindings.map((f, i) => (
              <div key={i} className={styles.feedItem}>⚠ {f.title} — {f.endpoint}</div>
            ))}
            {isScanning && <div className={styles.feedItem} style={{ color: 'var(--color-text-tertiary)' }}>▶ {progressMessage}</div>}
          </div>
        )}

        {/* Idle state */}
        {state === 'idle' && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔒</div>
            <p className={styles.emptyTitle}>Ready to scan {collectionName}</p>
            <p className={styles.emptyHint}>
              AI will test for OWASP API Security Top 10 vulnerabilities including broken auth, BOLA, mass assignment, rate limiting, and more.
            </p>
          </div>
        )}

        {/* Results */}
        {isDone && report && (
          <div className={styles.content}>
            {/* Score + summary */}
            <div className={styles.scoreAndSummary}>
              <SecurityScore report={report} />
              <div>
                <p className={styles.summary}>{report.summary}</p>
                {report.recommendations && report.recommendations.length > 0 && (
                  <ul className={styles.recommendations}>
                    {report.recommendations.map((rec, i) => (
                      <li key={i} className={styles.recommendationItem}>
                        <CheckCircle size={11} className={styles.recommendationDot} />
                        {rec}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Vulnerability list */}
            {report.vulnerabilities.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🎉</div>
                <p className={styles.emptyTitle}>No vulnerabilities found!</p>
                <p className={styles.emptyHint}>All OWASP checks passed for this collection.</p>
              </div>
            ) : (
              <div>
                <h4 className={styles.sectionTitle}>
                  <Shield size={15} />
                  Vulnerabilities Found
                  <span className={styles.vulnCount}>{report.vulnerabilities.length}</span>
                  {criticalCount > 0 && (
                    <span style={{ fontSize: 10, color: 'hsl(0,84%,60%)', marginLeft: 4 }}>
                      {criticalCount} critical
                    </span>
                  )}
                </h4>
                <div className={styles.vulnList}>
                  {/* Sort: critical first */}
                  {[...report.vulnerabilities]
                    .sort((a, b) => {
                      const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
                      return (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
                    })
                    .map((vuln, i) => (
                      <SecurityReportCard
                        key={`${vuln.owaspCategory}-${i}`}
                        vulnerability={vuln}
                        defaultOpen={i === 0 && vuln.severity === 'critical'}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
