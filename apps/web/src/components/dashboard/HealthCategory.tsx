import styles from './HealthCategory.module.css';

export interface CategoryScore {
  score: number | null;
  issues: string[];
}

interface HealthCategoryProps {
  name: string;
  weight: string;
  data: CategoryScore;
  icon: string;
}

function getScoreCls(score: number | null, prefix: 'score' | 'fill'): string {
  if (score === null) return prefix === 'score' ? (styles['scoreNa'] as string) : (styles['fillNa'] as string);
  if (score >= 75) return prefix === 'score' ? (styles['scoreGood'] as string) : (styles['fillGood'] as string);
  if (score >= 50) return prefix === 'score' ? (styles['scoreMed'] as string) : (styles['fillMed'] as string);
  return prefix === 'score' ? (styles['scorePoor'] as string) : (styles['fillPoor'] as string);
}

/**
 * HealthCategory — one row in the health score breakdown.
 * Shows: icon + name + weight | animated score bar | score value
 * Issues listed below the bar.
 */
export const HealthCategory = ({ name, weight, data, icon }: HealthCategoryProps) => (
  <div className={styles.category}>
    <div className={styles.topRow}>
      <div className={styles.nameWrap}>
        <span>{icon}</span>
        <span className={styles.name}>{name}</span>
        <span className={styles.weight}>{weight}</span>
      </div>
      <span className={`${styles.score} ${getScoreCls(data.score, 'score')}`}>
        {data.score !== null ? `${data.score}` : 'N/A'}
      </span>
    </div>

    <div className={styles.track}>
      <div
        className={`${styles.fill} ${getScoreCls(data.score, 'fill')}`}
        style={{ width: data.score !== null ? `${data.score}%` : '0%' }}
      />
    </div>

    {data.issues.length > 0 && (
      <div className={styles.issues}>
        {data.issues.slice(0, 2).map((issue, i) => (
          <div key={i} className={styles.issue}>
            <div className={styles.issueDot} />
            {issue}
          </div>
        ))}
      </div>
    )}
  </div>
);
