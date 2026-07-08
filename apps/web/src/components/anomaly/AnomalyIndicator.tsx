import { AlertTriangle, AlertOctagon } from 'lucide-react';
import { useAnomalyStore } from '@/stores/anomalyStore';
import styles from './AnomalyIndicator.module.css';

/**
 * AnomalyIndicator — compact badge placed next to the response status.
 * Shows anomaly count and severity. Click to toggle the detail panel.
 */
export const AnomalyIndicator = () => {
  const current = useAnomalyStore((s) => s.current);
  const togglePanel = useAnomalyStore((s) => s.togglePanel);

  if (!current || current.anomalies.length === 0) return null;

  const hasCritical = current.anomalies.some((a) => a.severity === 'critical');
  const Icon = hasCritical ? AlertOctagon : AlertTriangle;
  const cls = hasCritical ? styles.critical : styles.warning;

  return (
    <button className={`${styles.indicator} ${cls}`} onClick={togglePanel} type="button" title="View anomalies">
      <Icon size={11} />
      {current.anomalies.length} anomal{current.anomalies.length === 1 ? 'y' : 'ies'}
    </button>
  );
};
