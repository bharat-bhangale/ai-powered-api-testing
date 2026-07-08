import styles from './PerformanceGauge.module.css';

interface PerformanceGaugeProps {
  score: number; // 0-100
  size?: number;
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'hsl(142,70%,45%)';
  if (score >= 70) return 'hsl(142,70%,55%)';
  if (score >= 50) return 'hsl(38,92%,50%)';
  if (score >= 30) return 'hsl(25,95%,55%)';
  return 'hsl(0,84%,60%)';
}

function getGrade(score: number): { label: string; cls: string } {
  if (score >= 90) return { label: 'Excellent', cls: styles['gradeExcellent'] as string };
  if (score >= 70) return { label: 'Good', cls: styles['gradeGood'] as string };
  if (score >= 50) return { label: 'Fair', cls: styles['gradeFair'] as string };
  if (score >= 30) return { label: 'Poor', cls: styles['gradePoor'] as string };
  return { label: 'Critical', cls: styles['gradeCritical'] as string };
}

/**
 * PerformanceGauge — SVG circular arc gauge displaying the AI performance score (0-100).
 * Arc fills from bottom-left to bottom-right (270° sweep), color-coded by score range.
 */
export const PerformanceGauge = ({ score, size = 140 }: PerformanceGaugeProps) => {
  const center = size / 2;
  const radius = size * 0.38;
  const strokeWidth = size * 0.09;
  const clampedScore = Math.max(0, Math.min(100, score));

  // Arc: 270° sweep starting from 135° (bottom-left)
  const totalAngle = 270;
  const startAngle = 135;
  const endAngle = startAngle + totalAngle * (clampedScore / 100);

  const polarToCartesian = (angle: number): { x: number; y: number } => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  const describeArc = (fromAngle: number, toAngle: number): string => {
    const from = polarToCartesian(fromAngle);
    const to = polarToCartesian(toAngle);
    const largeArc = toAngle - fromAngle > 180 ? 1 : 0;
    return `M ${from.x} ${from.y} A ${radius} ${radius} 0 ${largeArc} 1 ${to.x} ${to.y}`;
  };

  const trackPath = describeArc(startAngle, startAngle + totalAngle);
  const fillPath = clampedScore > 0 ? describeArc(startAngle, endAngle) : '';
  const color = getScoreColor(clampedScore);
  const grade = getGrade(clampedScore);

  return (
    <div className={styles.gaugeContainer}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={styles.gaugeSvg}
        aria-label={`Performance score: ${clampedScore}`}
      >
        {/* Track */}
        <path
          d={trackPath}
          fill="none"
          stroke="var(--color-bg-hover)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Fill */}
        {fillPath && (
          <path
            d={fillPath}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 ${strokeWidth * 0.4}px ${color}60)`,
              transition: 'd 800ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        )}
        {/* Score text */}
        <text x={center} y={center - 6} className={styles.scoreText} fill={color}>
          {clampedScore}
        </text>
        {/* /100 label */}
        <text x={center} y={center + 16} className={styles.scoreLabel}>
          / 100
        </text>
      </svg>
      <span className={`${styles.grade} ${grade.cls}`}>{grade.label}</span>
    </div>
  );
};
