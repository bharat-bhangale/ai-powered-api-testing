import { TrendingUp } from 'lucide-react';
import styles from './HealthRecommendations.module.css';

export interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  category: string;
}

interface HealthRecommendationsProps {
  recommendations: Recommendation[];
  limit?: number;
}

const PRIORITY_CLS: Record<string, string> = {
  critical: styles['critical'] as string,
  high:     styles['high'] as string,
  medium:   styles['medium'] as string,
  low:      styles['low'] as string,
};
const BADGE_CLS: Record<string, string> = {
  critical: styles['badgeCritical'] as string,
  high:     styles['badgeHigh'] as string,
  medium:   styles['badgeMedium'] as string,
  low:      styles['badgeLow'] as string,
};

const EFFORT_LABEL = { low: '⚡ Low effort', medium: '⚙️ Medium effort', high: '🏗️ High effort' };

/**
 * HealthRecommendations — prioritized, actionable recommendation list.
 */
export const HealthRecommendations = ({ recommendations, limit = 8 }: HealthRecommendationsProps) => {
  const shown = recommendations.slice(0, limit);
  if (shown.length === 0) return (
    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: 'var(--space-3)' }}>
      No recommendations — your API looks healthy! 🎉
    </div>
  );

  return (
    <div className={styles.list}>
      {shown.map((rec, i) => (
        <div key={i} className={`${styles.item} ${PRIORITY_CLS[rec.priority] ?? ''}`}>
          <span className={`${styles.badge} ${BADGE_CLS[rec.priority] ?? ''}`}>
            {rec.priority}
          </span>
          <div className={styles.body}>
            <div className={styles.title}>{rec.title}</div>
            <div className={styles.desc}>{rec.description}</div>
            <div className={styles.meta}>
              <span className={styles.impact}><TrendingUp size={10} />{rec.impact}</span>
              <span className={styles.effort}>{EFFORT_LABEL[rec.effort]}</span>
              <span className={styles.cat}>{rec.category}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
