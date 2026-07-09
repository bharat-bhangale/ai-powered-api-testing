import styles from './HealthTrend.module.css';

interface HistoricalScore {
  date: string;
  score: number;
}

interface HealthTrendProps {
  scores: HistoricalScore[];
  height?: number;
}

/**
 * HealthTrend — SVG polyline chart of daily health scores.
 * Animates the line drawing on mount. Shows last 30 data points.
 */
export const HealthTrend = ({ scores, height = 120 }: HealthTrendProps) => {
  if (scores.length < 2) {
    return (
      <div className={styles.noData}>
        Not enough data yet — run health score checks over multiple days to see trend.
      </div>
    );
  }

  const W = 520;
  const H = height;
  const PAD = { top: 12, right: 10, bottom: 24, left: 30 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const data = scores.slice(-30);
  const minScore = Math.max(0,  Math.min(...data.map((d) => d.score)) - 5);
  const maxScore = Math.min(100, Math.max(...data.map((d) => d.score)) + 5);
  const scoreRange = maxScore - minScore || 1;

  const px = (i: number) => PAD.left + (i / (data.length - 1)) * plotW;
  const py = (s: number) => PAD.top + (1 - (s - minScore) / scoreRange) * plotH;

  const points = data.map((d, i) => `${px(i)},${py(d.score)}`).join(' ');
  const areaPoints = [
    `${PAD.left},${PAD.top + plotH}`,
    ...data.map((d, i) => `${px(i)},${py(d.score)}`),
    `${PAD.left + plotW},${PAD.top + plotH}`,
  ].join(' ');

  // Y grid lines at 25, 50, 75, 100
  const gridLines = [25, 50, 75, 100].filter((v) => v >= minScore && v <= maxScore);

  return (
    <div className={styles.wrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label="Health score trend">
        <defs>
          <linearGradient id="trendGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="hsl(262,80%,60%)" />
            <stop offset="100%" stopColor="hsl(200,80%,60%)" />
          </linearGradient>
          <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="hsl(262,80%,60%)" />
            <stop offset="100%" stopColor="hsl(262,80%,60%)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map((v) => (
          <g key={v}>
            <line
              className={styles.gridLine}
              x1={PAD.left} y1={py(v)}
              x2={PAD.left + plotW} y2={py(v)}
            />
            <text className={styles.scoreLabel} x={PAD.left - 4} y={py(v) + 3} textAnchor="end">
              {v}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <polygon className={styles.area} points={areaPoints} fill="url(#areaGrad)" />

        {/* Trend line */}
        <polyline className={styles.trendLine} points={points} />

        {/* Data dots + date labels */}
        {data.map((d, i) => (
          <g key={i}>
            <circle className={styles.dot} cx={px(i)} cy={py(d.score)} r={3}>
              <title>{d.date}: {d.score}</title>
            </circle>
            {/* Show every 5th date label */}
            {(i === 0 || i === data.length - 1 || i % 5 === 0) && (
              <text
                className={styles.axisLabel}
                x={px(i)}
                y={PAD.top + plotH + 14}
                textAnchor="middle"
              >
                {d.date.slice(5)} {/* MM-DD */}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};
