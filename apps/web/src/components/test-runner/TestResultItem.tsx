import { useState } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import type { TestResult } from '@/stores/testRunnerStore';
import styles from './TestResultItem.module.css';

interface TestResultItemProps {
  result: TestResult;
  isAIGenerated?: boolean;
}

function stringify(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  return JSON.stringify(value);
}

/**
 * Single test result row.
 * ✅ / ❌ + test name + duration.
 * Failed tests expand on click to show error details + expected/actual.
 */
export const TestResultItem = ({ result, isAIGenerated }: TestResultItemProps) => {
  const [expanded, setExpanded] = useState(!result.passed);

  const canExpand = !result.passed && result.error;

  return (
    <div className={styles.item}>
      <div
        className={styles.row}
        onClick={() => canExpand && setExpanded(!expanded)}
        role={canExpand ? 'button' : undefined}
        tabIndex={canExpand ? 0 : undefined}
        onKeyDown={(e) => {
          if (canExpand && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        {result.passed ? (
          <CheckCircle size={15} className={styles.iconPassed} />
        ) : (
          <>
            {canExpand && (expanded ? <ChevronDown size={15} className={styles.iconFailed} /> : <ChevronRight size={15} className={styles.iconFailed} />)}
            {!canExpand && <XCircle size={15} className={styles.iconFailed} />}
          </>
        )}

        <span className={styles.testName}>
          {result.name}
          {isAIGenerated && <span className={styles.aiBadge}>🤖</span>}
        </span>
        <span className={styles.duration}>{result.duration}ms</span>
      </div>

      {canExpand && expanded && (
        <div className={styles.errorDetails}>
          {result.error}
          {(result.expected !== undefined || result.actual !== undefined) && (
            <div className={styles.expectedActual}>
              <span>
                <span className={styles.expectedLabel}>Expected: </span>
                <span className={styles.expectedValue}>{stringify(result.expected)}</span>
              </span>
              <span>
                <span className={styles.expectedLabel}>Actual:   </span>
                <span className={styles.actualValue}>{stringify(result.actual)}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
