import { AlertTriangle, AlertOctagon, ChevronDown, BookOpen } from 'lucide-react';
import { useAnomalyStore } from '@/stores/anomalyStore';
import styles from './AnomalyBanner.module.css';

/**
 * AnomalyBanner — top-of-response-body alert bar.
 * Shows "N anomalies detected" and toggles the detail panel on click.
 * Also shows a "learning" note when baseline is still building.
 */
export const AnomalyBanner = () => {
  const current = useAnomalyStore((s) => s.current);
  const isPanelOpen = useAnomalyStore((s) => s.isPanelOpen);
  const togglePanel = useAnomalyStore((s) => s.togglePanel);

  // Show "still learning" note when baseline has samples but < threshold
  if (current && !current.baselineActive && current.sampleCount > 0) {
    return (
      <div className={styles.learningNote}>
        <BookOpen size={11} />
        Learning baseline… ({current.sampleCount}/5 samples collected for this endpoint)
      </div>
    );
  }

  if (!current || current.anomalies.length === 0) return null;

  const hasCritical = current.anomalies.some((a) => a.severity === 'critical');
  const Icon = hasCritical ? AlertOctagon : AlertTriangle;
  const cls = hasCritical ? styles.critical : styles.warning;
  const criticalCount = current.anomalies.filter((a) => a.severity === 'critical').length;
  const warnCount = current.anomalies.filter((a) => a.severity === 'warning').length;

  const subtitle = [
    criticalCount > 0 ? `${criticalCount} critical` : '',
    warnCount > 0 ? `${warnCount} warning${warnCount !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(', ');

  return (
    <button className={`${styles.banner} ${cls}`} onClick={togglePanel} type="button">
      <Icon size={15} className={styles.icon} />
      <div className={styles.text}>
        <div className={styles.title}>
          {current.anomalies.length} anomal{current.anomalies.length !== 1 ? 'ies' : 'y'} detected
        </div>
        <div className={styles.subtitle}>{subtitle} — click to view details</div>
      </div>
      <ChevronDown
        size={14}
        className={`${styles.chevron} ${isPanelOpen ? styles.chevronOpen : ''}`}
      />
    </button>
  );
};
