import { Lightbulb } from 'lucide-react';
import type { PerfProfile } from '@/stores/performanceStore';
import styles from './BottleneckCard.module.css';

type Bottleneck = PerfProfile['bottlenecks'][number];

const SEVERITY_CARD: Record<string, string> = {
  critical: styles['cardCritical'] as string,
  high:     styles['cardHigh'] as string,
  medium:   styles['cardMedium'] as string,
  low:      styles['cardLow'] as string,
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: styles['critical'] as string,
  high:     styles['high'] as string,
  medium:   styles['medium'] as string,
  low:      styles['low'] as string,
};

interface BottleneckCardProps {
  bottleneck: Bottleneck;
}

/**
 * BottleneckCard — displays a single performance bottleneck with:
 * severity-coded left border, endpoint name, avg timing, issue description,
 * and AI-suggested fix.
 */
export const BottleneckCard = ({ bottleneck }: BottleneckCardProps) => {
  const cardCls = SEVERITY_CARD[bottleneck.severity] ?? '';
  const badgeCls = SEVERITY_BADGE[bottleneck.severity] ?? '';

  return (
    <div className={`${styles.card} ${cardCls}`}>
      <div className={styles.cardHeader}>
        <span className={styles.endpoint}>{bottleneck.endpoint}</span>
        <div className={styles.badges}>
          <span className={styles.timingBadge}>{bottleneck.avgTime.toFixed(0)}ms</span>
          <span className={`${styles.severityBadge} ${badgeCls}`}>
            {bottleneck.severity}
          </span>
        </div>
      </div>

      <p className={styles.issue}>{bottleneck.issue}</p>

      <div className={styles.suggestion}>
        <Lightbulb size={12} className={styles.suggestionIcon} />
        <span>{bottleneck.suggestion}</span>
      </div>
    </div>
  );
};
