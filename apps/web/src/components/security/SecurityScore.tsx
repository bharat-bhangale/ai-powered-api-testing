import type { SecurityReport, OwaspCategory } from '@/types/security';
import styles from './SecurityScore.module.css';

const CATEGORY_LABELS: Record<OwaspCategory, string> = {
  API1: 'BOLA',
  API2: 'Auth',
  API3: 'Mass Assign',
  API4: 'Rate Limit',
  API5: 'Func Auth',
  API7: 'Config',
};

const ALL_CATEGORIES: OwaspCategory[] = ['API1', 'API2', 'API3', 'API4', 'API5', 'API7'];

function getScoreColor(score: number): string {
  if (score >= 80) return 'hsl(142,70%,45%)';
  if (score >= 60) return 'hsl(84,70%,45%)';
  if (score >= 40) return 'hsl(38,92%,50%)';
  return 'hsl(0,84%,60%)';
}

interface SecurityScoreProps {
  report: SecurityReport;
}

/**
 * SecurityScore — SVG gauge ring showing the security score
 * and an OWASP category breakdown grid.
 */
export const SecurityScore = ({ report }: SecurityScoreProps) => {
  const score = report.securityScore ?? 0;
  const color = getScoreColor(score);

  // SVG ring params
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  // Map which categories have vulns
  const vulnCategories = new Set(report.vulnerabilities.map((v) => v.owaspCategory));

  return (
    <div className={styles.scoreWrap}>
      {/* Gauge */}
      <div className={styles.gauge}>
        <svg width={size} height={size}>
          {/* Background ring */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke="var(--color-bg-hover)"
            strokeWidth={strokeWidth}
          />
          {/* Score arc */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div className={styles.gaugeLabel}>
          <span className={styles.gaugeScore} style={{ color }}>{score}</span>
          <span className={styles.gaugeText}>/ 100</span>
        </div>
      </div>

      {/* OWASP category breakdown */}
      <div className={styles.categories}>
        {ALL_CATEGORIES.map((cat) => {
          const hasVuln = vulnCategories.has(cat);
          return (
            <div key={cat} className={styles.categoryItem}>
              <span className={styles.categoryLabel}>{cat}</span>
              <div className={`${styles.categoryDot} ${hasVuln ? styles.dotVuln : styles.dotSafe}`} />
              <span className={styles.categoryName}>{CATEGORY_LABELS[cat]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
