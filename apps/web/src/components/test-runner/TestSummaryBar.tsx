import { CheckCircle, XCircle } from 'lucide-react';
import styles from './TestSummaryBar.module.css';

interface TestSummaryBarProps {
  totalPassed: number;
  totalFailed: number;
  duration: number;
}

/**
 * Compact single-line bar: "Tests  ✅ 4 passed · ❌ 1 failed    12ms"
 */
export const TestSummaryBar = ({ totalPassed, totalFailed, duration }: TestSummaryBarProps) => {
  return (
    <div className={styles.summaryBar}>
      <span className={styles.summaryLabel}>Tests</span>

      <span className={styles.passedCount}>
        <CheckCircle size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
        {totalPassed} passed
      </span>

      {totalFailed > 0 && (
        <span className={styles.failedCount}>
          <XCircle size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
          {totalFailed} failed
        </span>
      )}

      <span className={styles.durationText}>{duration}ms</span>
    </div>
  );
};
