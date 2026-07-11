import type { FuzzResult, FuzzVerdict } from '@/stores/fuzzStore';
import styles from './FuzzResultRow.module.css';

type Severity = FuzzVerdict;

const VERDICT_ROW: Record<Severity, string> = {
  pass:    styles['pass'] as string,
  fail:    styles['fail'] as string,
  crash:   styles['crash'] as string,
  timeout: styles['timeout'] as string,
  leak:    styles['leak'] as string,
};

const VERDICT_BADGE: Record<Severity, string> = {
  pass:    styles['verdictPass'] as string,
  fail:    styles['verdictFail'] as string,
  crash:   styles['verdictCrash'] as string,
  timeout: styles['verdictTimeout'] as string,
  leak:    styles['verdictLeak'] as string,
};

interface FuzzResultRowProps {
  result: FuzzResult;
}

/**
 * FuzzResultRow — compact single-line result row.
 * Shows: verdict badge | category | payload preview | HTTP status | duration
 */
export const FuzzResultRow = ({ result }: FuzzResultRowProps) => {
  const statusCls = result.verdict === 'crash' ? styles.statusCrash
    : result.verdict === 'pass' ? styles.statusPass
    : styles.status;

  return (
    <div
      className={`${styles.row} ${VERDICT_ROW[result.verdict] ?? ''}`}
      title={`${result.payloadLabel}\n\nResponse: ${result.responsePreview}`}
    >
      <span className={`${styles.verdictBadge} ${VERDICT_BADGE[result.verdict] ?? ''}`}>
        {result.verdict}
      </span>

      <span className={styles.catBadge}>{result.category}</span>

      <span className={styles.payload}>{result.payloadPreview}</span>

      <span className={`${styles.status} ${statusCls}`}>
        {result.statusCode ?? '—'}
      </span>

      <span className={styles.ms}>{result.durationMs}ms</span>
    </div>
  );
};
