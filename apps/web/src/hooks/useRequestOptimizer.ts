import { useOptimizerStore } from '@/stores/optimizerStore';
import { useRequestStore } from '@/stores/requestStore';

/**
 * useRequestOptimizer — provides state and trigger for the request optimizer.
 *
 * Usage:
 *   const { count, severity, isAnalyzing, canAnalyze, trigger, openPanel } = useRequestOptimizer();
 *
 * - canAnalyze: true when there's a response to analyze
 * - trigger: starts the analysis (user clicks 💡 button)
 * - count: number of suggestions from last analysis
 * - maxSeverity: 'critical' | 'warning' | 'info' (for badge color)
 */
export function useRequestOptimizer() {
  const { tabs, activeTabId } = useRequestStore();
  const { state, result, isPanelOpen, analyze, openPanel, closePanel, reset } = useOptimizerStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const response = activeTab?.response;

  const canAnalyze = !!response && !response.error;
  const isAnalyzing = state === 'analyzing';

  const count = result?.optimizations?.length ?? 0;

  const maxSeverity = (() => {
    if (!result) return null;
    if (result.optimizations.some((o) => o.severity === 'critical')) return 'critical';
    if (result.optimizations.some((o) => o.severity === 'warning')) return 'warning';
    if (result.optimizations.length > 0) return 'info';
    return null;
  })() as 'critical' | 'warning' | 'info' | null;

  const trigger = () => {
    if (!activeTab || !response) return;
    // If already have results — just open panel
    if (state === 'ready' && result) {
      openPanel();
      return;
    }
    analyze(activeTab, response);
  };

  const handleReset = () => {
    reset();
  };

  return {
    canAnalyze,
    isAnalyzing,
    count,
    maxSeverity,
    score: result?.score ?? null,
    isPanelOpen,
    trigger,
    openPanel,
    closePanel,
    reset: handleReset,
    activeTab,
    response,
  };
}
