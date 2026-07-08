import { ArrowRight, Check, Shield, Zap, Settings, Book, CheckCircle } from 'lucide-react';
import type { Optimization, OptimizationCategory } from '@/stores/optimizerStore';
import styles from './OptimizationCard.module.css';

const CATEGORY_ICONS: Record<OptimizationCategory, React.ReactNode> = {
  security:      <Shield size={13} color="hsl(0,84%,60%)" />,
  performance:   <Zap size={13} color="hsl(38,92%,50%)" />,
  headers:       <Settings size={13} color="hsl(217,91%,60%)" />,
  best_practices: <Book size={13} color="hsl(271,76%,65%)" />,
  correctness:   <CheckCircle size={13} color="hsl(142,70%,45%)" />,
};

const SEVERITY_CARD: Record<string, string> = {
  critical: styles['cardCritical'] as string,
  warning:  styles['cardWarning'] as string,
  info:     styles['cardInfo'] as string,
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: styles['critical'] as string,
  warning:  styles['warning'] as string,
  info:     styles['info'] as string,
};

interface OptimizationCardProps {
  optimization: Optimization;
  index: number;
  onApply: (index: number, fix: Optimization['fix']) => void;
}

/**
 * OptimizationCard — displays one AI optimization suggestion with:
 * severity left-border, category icon, title, description,
 * old→new value diff, and optional "Apply" button for auto-fixable items.
 */
export const OptimizationCard = ({ optimization, index, onApply }: OptimizationCardProps) => {
  const cardCls = SEVERITY_CARD[optimization.severity] ?? '';
  const badgeCls = SEVERITY_BADGE[optimization.severity] ?? '';
  const icon = CATEGORY_ICONS[optimization.category];

  return (
    <div className={`${styles.card} ${cardCls}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.categoryIcon}>{icon}</span>
          <span className={styles.title}>{optimization.title}</span>
        </div>
        <div className={styles.badges}>
          {optimization.applied && (
            <span className={styles.appliedBadge}>✓ Applied</span>
          )}
          <span className={`${styles.severityBadge} ${badgeCls}`}>
            {optimization.severity}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className={styles.description}>{optimization.description}</p>

      {/* Old → New value diff */}
      {(optimization.currentValue || optimization.suggestedValue) && (
        <div className={styles.diffRow}>
          {optimization.currentValue && (
            <span className={`${styles.diffVal} ${styles.diffOld}`}>
              {optimization.currentValue}
            </span>
          )}
          {optimization.currentValue && optimization.suggestedValue && (
            <ArrowRight size={12} className={styles.diffArrow} />
          )}
          {optimization.suggestedValue && (
            <span className={`${styles.diffVal} ${styles.diffNew}`}>
              {optimization.suggestedValue}
            </span>
          )}
        </div>
      )}

      {/* Apply button */}
      {optimization.autoFixable && optimization.fix && !optimization.applied && (
        <div className={styles.footer}>
          <button
            className={styles.applyBtn}
            onClick={() => onApply(index, optimization.fix)}
            type="button"
          >
            <Check size={11} />
            Apply Fix
          </button>
        </div>
      )}
    </div>
  );
};
