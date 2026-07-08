import { X, Sparkles } from 'lucide-react';
import { useAnomalyStore, type Anomaly, type AnomalyType } from '@/stores/anomalyStore';
import styles from './AnomalyDetailPanel.module.css';

const TYPE_LABELS: Record<AnomalyType, string> = {
  timing: 'Timing',
  size: 'Size',
  status: 'Status',
  field_missing: 'Missing Field',
  field_new: 'New Field',
  type_change: 'Type Change',
};

const TYPE_CLASS: Record<AnomalyType, string> = {
  timing: styles.typeTiming ?? '',
  size: styles.typeSize ?? '',
  status: styles.typeStatus ?? '',
  field_missing: styles['typeFieldMissing'] ?? '',
  field_new: styles['typeFieldNew'] ?? '',
  type_change: styles['typeTypeChange'] ?? '',
};

/**
 * AnomalyDetailPanel — expandable panel listing all detected anomalies
 * with dismiss, expected/actual details, and lazy AI explanation.
 */
export const AnomalyDetailPanel = () => {
  const current = useAnomalyStore((s) => s.current);
  const isPanelOpen = useAnomalyStore((s) => s.isPanelOpen);
  const loadingExplanationIndex = useAnomalyStore((s) => s.loadingExplanationIndex);
  const { dismissAnomaly, explainAnomaly, closePanel } = useAnomalyStore.getState();

  if (!isPanelOpen || !current || current.anomalies.length === 0) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>
          Anomaly Details — {current.endpointKey}
        </span>
        <button className={styles.closeBtn} onClick={closePanel} type="button">
          <X size={13} />
        </button>
      </div>

      <div className={styles.anomalyList}>
        {current.anomalies.map((anomaly, index) => (
          <AnomalyCard
            key={`${anomaly.type}-${index}`}
            anomaly={anomaly}
            index={index}
            isLoadingExplanation={loadingExplanationIndex === index}
            onDismiss={() => dismissAnomaly(index)}
            onExplain={() => explainAnomaly(index)}
          />
        ))}
      </div>
    </div>
  );
};

// ── Anomaly Card ──────────────────────────────────────────────────────────

interface AnomalyCardProps {
  anomaly: Anomaly;
  index: number;
  isLoadingExplanation: boolean;
  onDismiss: () => void;
  onExplain: () => void;
}

const AnomalyCard = ({ anomaly, isLoadingExplanation, onDismiss, onExplain }: AnomalyCardProps) => {
  const typeCls = TYPE_CLASS[anomaly.type] ?? '';
  const isCritical = anomaly.severity === 'critical';

  return (
    <div className={styles.anomalyCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardLeft}>
          <div className={`${styles.severityDot} ${isCritical ? styles.dotCritical : styles.dotWarning}`} />
          <span className={`${styles.typeBadge} ${typeCls}`}>
            {TYPE_LABELS[anomaly.type]}
          </span>
          <span className={styles.cardMessage}>{anomaly.message}</span>
        </div>
        <button className={styles.dismissBtn} onClick={onDismiss} type="button" title="Dismiss">
          <X size={12} />
        </button>
      </div>

      {/* Expected / Actual details */}
      <div className={styles.details}>
        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>Expected</div>
          <div className={styles.detailValue}>
            {String(anomaly.details.expected)}
          </div>
        </div>
        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>Actual</div>
          <div className={styles.detailValue}>
            {String(anomaly.details.actual)}
          </div>
        </div>
      </div>

      {/* AI Explanation */}
      <div className={styles.explainArea}>
        {anomaly.explanation ? (
          <div className={styles.explanation}>{anomaly.explanation}</div>
        ) : (
          <button
            className={styles.explainBtn}
            onClick={onExplain}
            disabled={isLoadingExplanation}
            type="button"
          >
            {isLoadingExplanation ? (
              <><div className={styles.spinner} /> Explaining…</>
            ) : (
              <><Sparkles size={10} /> Explain this anomaly</>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
