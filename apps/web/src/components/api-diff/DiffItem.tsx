import { ArrowRight } from 'lucide-react';
import type {
  BreakingChange,
  Deprecation,
  Drift,
  Enhancement,
} from '@/stores/diffStore';
import styles from './DiffItem.module.css';

type DiffItemVariant =
  | { kind: 'breaking'; item: BreakingChange }
  | { kind: 'deprecation'; item: Deprecation }
  | { kind: 'drift'; item: Drift }
  | { kind: 'enhancement'; item: Enhancement };

/**
 * DiffItem — renders one change item in one of four variants.
 * Each variant shows: endpoint tag, change description, and variant-specific metadata.
 */
export const DiffItem = (props: DiffItemVariant) => {
  return (
    <div className={styles.item}>
      {props.kind === 'breaking' && <BreakingItem item={props.item} />}
      {props.kind === 'deprecation' && <DeprecationItem item={props.item} />}
      {props.kind === 'drift' && <DriftItem item={props.item} />}
      {props.kind === 'enhancement' && <EnhancementItem item={props.item} />}
    </div>
  );
};

// ── Variant implementations ───────────────────────────────────────────────

const BreakingItem = ({ item }: { item: BreakingChange }) => (
  <>
    <div className={styles.header}>
      <span className={styles.endpoint}>{item.endpoint}</span>
      <span className={styles.change}>{item.change}</span>
    </div>
    <div className={styles.metaRow}>
      <span className={styles.metaLabel}>Impact</span>
      <span className={styles.metaValue}>{item.impact}</span>
    </div>
    <div className={styles.migration}>
      <ArrowRight size={11} className={styles.migrationIcon} />
      <span>{item.migration}</span>
    </div>
  </>
);

const DeprecationItem = ({ item }: { item: Deprecation }) => (
  <>
    <div className={styles.header}>
      <span className={styles.endpoint}>{item.endpoint}</span>
      <span className={styles.change}>{item.signal}</span>
    </div>
    <div className={styles.metaRow}>
      <span className={styles.metaLabel}>Alternative</span>
      <span className={styles.metaValue}>{item.alternative}</span>
    </div>
    {item.deadline && (
      <div>
        <span className={styles.deadlineBadge}>Deadline: {item.deadline}</span>
      </div>
    )}
  </>
);

const RISK_CLS: Record<string, string> = {
  high:   styles['riskHigh'] as string,
  medium: styles['riskMedium'] as string,
  low:    styles['riskLow'] as string,
};

const DriftItem = ({ item }: { item: Drift }) => (
  <>
    <div className={styles.header}>
      <span className={styles.endpoint}>{item.endpoint}</span>
      <span className={styles.change}>{item.change}</span>
    </div>
    <span className={`${styles.riskBadge} ${RISK_CLS[item.risk] ?? ''}`}>
      {item.risk} risk
    </span>
  </>
);

const EnhancementItem = ({ item }: { item: Enhancement }) => (
  <div className={styles.header}>
    <span className={styles.endpoint}>{item.endpoint}</span>
    <span className={styles.change}>{item.change}</span>
  </div>
);
