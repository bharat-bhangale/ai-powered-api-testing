import { useCallback } from 'react';
import { Play, RotateCcw, Clipboard, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { useTestRunnerStore } from '@/stores/testRunnerStore';
import { useRequestStore } from '@/stores/requestStore';
import { TestSummaryBar } from './TestSummaryBar';
import { TestResultItem } from './TestResultItem';
import styles from './TestResultsPanel.module.css';

/**
 * TestResultsPanel — shows pass/fail results below the response viewer.
 * Renders: header with Run/Re-run buttons → summary bar → scrollable results list → logs.
 */
export const TestResultsPanel = () => {
  const activeTabId = useRequestStore((s) => s.activeTabId);
  const hasResponse = useRequestStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return !!tab?.response;
  });

  const results = useTestRunnerStore((s) => (activeTabId ? s.results[activeTabId] : null));
  const isRunning = useTestRunnerStore((s) => (activeTabId ? s.isRunning[activeTabId] : false));
  const script = useTestRunnerStore((s) => (activeTabId ? s.scripts[activeTabId] : ''));
  const runTests = useTestRunnerStore((s) => s.runTests);
  const clearResults = useTestRunnerStore((s) => s.clearResults);

  const handleRun = useCallback(() => {
    if (!activeTabId) return;
    runTests(activeTabId);
  }, [activeTabId, runTests]);

  const handleClear = useCallback(() => {
    if (!activeTabId) return;
    clearResults(activeTabId);
  }, [activeTabId, clearResults]);

  const handleCopyResults = useCallback(() => {
    if (!results?.results?.length) return;
    const text = results.results
      .map((r) => `${r.passed ? '✅' : '❌'} ${r.name} (${r.duration}ms)${r.error ? `\n   ${r.error}` : ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Test results copied');
  }, [results]);

  const hasScript = !!script?.trim();
  const hasResults = !!results?.results?.length;

  // Don't show the panel if there's no response and no results
  if (!hasResponse && !hasResults) return null;

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <FlaskConical size={14} />
          <span className={styles.headerTitle}>Test Results</span>
        </div>
        <div className={styles.headerActions}>
          {hasResults && (
            <>
              <button className={styles.headerBtn} onClick={handleCopyResults} type="button" title="Copy results">
                <Clipboard size={12} />
                Copy
              </button>
              <button className={styles.headerBtn} onClick={handleClear} type="button" title="Clear results">
                <RotateCcw size={12} />
                Clear
              </button>
            </>
          )}
          <button
            className={styles.runBtn}
            onClick={handleRun}
            disabled={isRunning || !hasScript || !hasResponse}
            type="button"
            title={!hasScript ? 'Write a test script first' : !hasResponse ? 'Send a request first' : 'Run tests'}
          >
            <Play size={12} />
            {isRunning ? 'Running...' : hasResults ? 'Re-run' : 'Run Tests'}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isRunning && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          Executing tests...
        </div>
      )}

      {/* Results */}
      {!isRunning && results && (
        <>
          {/* Script-level error */}
          {results.error && (
            <div className={styles.errorBanner}>{results.error}</div>
          )}

          {/* Summary bar */}
          {results.results.length > 0 && (
            <TestSummaryBar
              totalPassed={results.totalPassed}
              totalFailed={results.totalFailed}
              duration={results.duration}
            />
          )}

          {/* Individual test results */}
          {results.results.length > 0 ? (
            <div className={styles.resultsList}>
              {results.results.map((result, idx) => (
                <TestResultItem key={`${result.name}-${idx}`} result={result} />
              ))}
            </div>
          ) : (
            !results.error && (
              <div className={styles.empty}>No tests were registered. Use atx.test() in your script.</div>
            )
          )}

          {/* Console logs */}
          {results.logs.length > 0 && (
            <div className={styles.logsSection}>
              <div className={styles.logsTitle}>Console</div>
              {results.logs.map((log, idx) => (
                <div key={idx} className={styles.logLine}>{log}</div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty state — no results yet */}
      {!isRunning && !results && hasScript && (
        <div className={styles.empty}>Click "Run Tests" to execute your test script</div>
      )}

      {!isRunning && !results && !hasScript && (
        <div className={styles.empty}>Write a test script in the "Tests" tab above, then run it here</div>
      )}
    </div>
  );
};
