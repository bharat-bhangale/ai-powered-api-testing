import { useState, useEffect, useCallback } from 'react';
import { X, Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';
import { HealthCategory } from './HealthCategory';
import { HealthRecommendations } from './HealthRecommendations';
import { HealthTrend } from './HealthTrend';
import styles from './HealthScore.module.css';
import type { CategoryScore } from './HealthCategory';
import type { Recommendation } from './HealthRecommendations';

// ===== Types =====

interface HealthOutput {
  overallScore: number | null;
  categoryScores: {
    performance:   CategoryScore;
    security:      CategoryScore;
    reliability:   CategoryScore;
    coverage:      CategoryScore;
    documentation: CategoryScore;
  };
  recommendations: Recommendation[];
  trend: 'improving' | 'stable' | 'declining';
  summary: string;
}

interface HistoricalScore { date: string; score: number; }

interface HealthScoreProps {
  isOpen: boolean;
  collectionId: string;
  collectionName: string;
  onClose: () => void;
}

type State = 'idle' | 'loading' | 'done' | 'error';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

const CATEGORY_META: Array<{
  key: keyof HealthOutput['categoryScores'];
  label: string;
  weight: string;
  icon: string;
}> = [
  { key: 'performance',   label: 'Performance',   weight: '25%', icon: '⚡' },
  { key: 'security',      label: 'Security',       weight: '30%', icon: '🔒' },
  { key: 'reliability',   label: 'Reliability',    weight: '20%', icon: '✅' },
  { key: 'coverage',      label: 'Test Coverage',  weight: '15%', icon: '🧪' },
  { key: 'documentation', label: 'Documentation',  weight: '10%', icon: '📖' },
];

// SVG gauge helper
function GaugeRing({ score }: { score: number | null }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const progress = score !== null ? (score / 100) * circumference : 0;
  const color = score === null ? 'hsl(0,0%,30%)' :
    score >= 75 ? 'hsl(142,70%,45%)' :
    score >= 50 ? 'hsl(38,92%,50%)' :
                  'hsl(0,84%,60%)';

  return (
    <svg width={130} height={130} viewBox="0 0 130 130">
      {/* Background ring */}
      <circle cx={65} cy={65} r={r} fill="none" stroke="hsl(0,0%,15%)" strokeWidth={10} />
      {/* Progress ring */}
      <circle
        cx={65} cy={65} r={r}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
        strokeDashoffset={circumference * 0.25}
        style={{ transition: 'stroke-dasharray 800ms cubic-bezier(0.16,1,0.3,1)' }}
      />
      {/* Score text */}
      <text x={65} y={60} textAnchor="middle" fontSize={28} fontWeight={700} fill={color} fontFamily="monospace">
        {score !== null ? score : '—'}
      </text>
      <text x={65} y={78} textAnchor="middle" fontSize={11} fill="hsl(0,0%,55%)" fontFamily="sans-serif">
        / 100
      </text>
    </svg>
  );
}

const TREND_CLS = {
  improving: styles['trendImproving'] as string,
  stable:    styles['trendStable'] as string,
  declining: styles['trendDeclining'] as string,
};
const TREND_EMOJI = { improving: '📈', stable: '➡️', declining: '📉' };

/**
 * HealthScore — full-panel health score dashboard for one collection.
 * Shows: SVG gauge, summary, 5 category bars, prioritized recommendations, 30-day trend chart.
 */
export const HealthScore = ({ isOpen, collectionId, collectionName, onClose }: HealthScoreProps) => {
  const [state, setState] = useState<State>('idle');
  const [data, setData] = useState<HealthOutput | null>(null);
  const [history, setHistory] = useState<HistoricalScore[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchScore = useCallback(async () => {
    setState('loading');
    setErrorMsg('');
    try {
      const [scoreRes, histRes] = await Promise.all([
        apiClient.post('/api/ai/health-score', { collectionId }),
        apiClient.get(`/api/ai/health-score/history?collectionId=${collectionId}`),
      ]);
      setData(scoreRes.data.data as HealthOutput);
      setHistory((histRes.data.data ?? []) as HistoricalScore[]);
      setState('done');
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Health score failed';
      setErrorMsg(msg);
      setState('error');
      toast.error(msg);
    }
  }, [collectionId]);

  // Auto-analyze on open
  useEffect(() => { if (isOpen && state === 'idle') void fetchScore(); }, [isOpen, state, fetchScore]);

  // Auto-refresh every 5 minutes while panel is open
  useEffect(() => {
    if (!isOpen || state !== 'done') return;
    const id = setInterval(() => void fetchScore(), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [isOpen, state, fetchScore]);

  // Reset on close
  useEffect(() => { if (!isOpen) { setState('idle'); setData(null); setHistory([]); } }, [isOpen]);

  // Escape to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Activity size={20} style={{ color: 'hsl(142,70%,45%)' }} />
            <div>
              <h3 className={styles.headerTitle}>AI API Health Score</h3>
              <div className={styles.headerSub}>{collectionName}</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} type="button"><X size={16} /></button>
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <button
            className={styles.analyzeBtn}
            onClick={fetchScore}
            disabled={state === 'loading'}
            type="button"
          >
            {state === 'loading'
              ? <><RefreshCw size={13} style={{ animation: 'spin 700ms linear infinite' }} />Analyzing…</>
              : <><Activity size={13} />{state === 'done' ? 'Re-analyze' : 'Analyze Now'}</>
            }
          </button>
          <span className={styles.collectionInfo}>Auto-refreshes every 5 minutes</span>
        </div>

        {/* Loading */}
        {state === 'loading' && (
          <div className={styles.loadingWrap}>
            <div className={styles.loadingSpinner} />
            <p className={styles.loadingText}>Computing health score across all dimensions…</p>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className={styles.content}>
            <div className={styles.errorBanner}><AlertTriangle size={13} />{errorMsg}</div>
          </div>
        )}

        {/* Idle */}
        {state === 'idle' && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🏥</div>
            <p className={styles.emptyTitle}>Ready to assess</p>
            <p className={styles.emptyHint}>
              Click "Analyze Now" to compute a comprehensive health score combining performance, security, reliability, coverage, and documentation quality.
            </p>
          </div>
        )}

        {/* Results */}
        {state === 'done' && data && (
          <div className={styles.content}>

            {/* Gauge + summary */}
            <div className={styles.gaugeRow}>
              <div className={styles.gaugeWrap}>
                <GaugeRing score={data.overallScore} />
                <span className={styles.gaugeLabel}>Overall Health</span>
              </div>
              <div className={styles.summaryBlock}>
                <p className={styles.summary}>{data.summary}</p>
                <span className={`${styles.trendBadge} ${TREND_CLS[data.trend] ?? ''}`}>
                  {TREND_EMOJI[data.trend]} {data.trend.charAt(0).toUpperCase() + data.trend.slice(1)}
                </span>
              </div>
            </div>

            {/* Category breakdown */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                <span>📊</span>Category Breakdown
              </div>
              <div className={styles.categories}>
                {CATEGORY_META.map((meta) => (
                  <HealthCategory
                    key={meta.key}
                    name={meta.label}
                    weight={meta.weight}
                    icon={meta.icon}
                    data={data.categoryScores[meta.key]}
                  />
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                <span>💡</span>Recommendations
                {data.recommendations.length > 0 && (
                  <span style={{ marginLeft: 'auto', fontWeight: 400, color: 'var(--color-text-tertiary)', textTransform: 'none', letterSpacing: 0 }}>
                    {data.recommendations.length} items
                  </span>
                )}
              </div>
              <HealthRecommendations recommendations={data.recommendations} limit={8} />
            </div>

            {/* 30-day trend */}
            <div className={styles.section}>
              <div className={styles.sectionTitle}><span>📈</span>30-Day Trend</div>
              <HealthTrend scores={history} />
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
