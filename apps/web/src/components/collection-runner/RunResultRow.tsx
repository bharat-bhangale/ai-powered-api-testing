import { CheckCircle, XCircle, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import type { RunProgressData } from '@/services/collectionRunner.service';
import styles from './RunResultRow.module.css';

interface RunResultRowProps {
  result: RunProgressData;
}

function getMethodColor(method: string): string {
  const m = method.toUpperCase();
  if (m === 'GET') return 'var(--color-method-get)';
  if (m === 'POST') return 'var(--color-method-post)';
  if (m === 'PUT') return 'var(--color-method-put)';
  if (m === 'DELETE') return 'var(--color-method-delete)';
  if (m === 'PATCH') return 'var(--color-method-patch)';
  return 'var(--color-text-secondary)';
}

export const RunResultRow = ({ result }: RunResultRowProps) => {
  const [expanded, setExpanded] = useState(false);

  const hasTests = result.testResults.length > 0;
  const isFailed = result.status >= 400 || result.error || (hasTests && result.totalFailed > 0);
  const canExpand = hasTests || !!result.error;

  return (
    <div className={styles.container}>
      <div 
        className={styles.row}
        onClick={() => canExpand && setExpanded(!expanded)}
        role={canExpand ? 'button' : undefined}
      >
        <div className={styles.statusIcon}>
          {isFailed ? (
            <XCircle size={16} className={styles.iconFailed} />
          ) : (
            <CheckCircle size={16} className={styles.iconPassed} />
          )}
        </div>

        <div className={styles.method} style={{ color: getMethodColor(result.method) }}>
          {result.method}
        </div>
        
        <div className={styles.requestInfo}>
          <span className={styles.name}>{result.requestName}</span>
          <span className={styles.url}>{result.url}</span>
        </div>

        <div className={styles.metrics}>
          {result.status > 0 ? (
            <span className={`${styles.status} ${result.status >= 400 ? styles.statusError : styles.statusSuccess}`}>
              {result.status} {result.statusText}
            </span>
          ) : (
            <span className={styles.statusError}>Network Error</span>
          )}
          <span className={styles.timing}>{result.timing}ms</span>
          
          {hasTests && (
            <span className={styles.testBadge}>
              {result.totalPassed}/{result.totalPassed + result.totalFailed} passing
            </span>
          )}
        </div>

        {canExpand && (
          <div className={styles.expandIcon}>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        )}
      </div>

      {expanded && (
        <div className={styles.details}>
          {result.error && (
            <div className={styles.networkError}>
              <AlertTriangle size={14} />
              {result.error}
            </div>
          )}

          {result.testResults.map((test, i) => (
            <div key={i} className={styles.testItem}>
              {test.passed ? (
                <CheckCircle size={14} className={styles.iconPassed} />
              ) : (
                <XCircle size={14} className={styles.iconFailed} />
              )}
              <span className={styles.testName}>{test.name}</span>
              <span className={styles.testDuration}>{test.duration}ms</span>
              {test.error && <div className={styles.testError}>{test.error}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
