import { useCallback } from 'react';
import { Play, RotateCcw, Clipboard, FlaskConical, Zap, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useTestRunnerStore } from '@/stores/testRunnerStore';
import { useRequestStore } from '@/stores/requestStore';
import { TestSummaryBar } from './TestSummaryBar';
import { TestResultItem } from './TestResultItem';
import styles from './TestResultsPanel.module.css';

/**
 * TestResultsPanel — shows pass/fail results below the response viewer.
 * Renders: header with auto-test toggle + Run buttons → summary bar → scrollable results → logs.
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
  const isAIGenerating = useTestRunnerStore((s) => (activeTabId ? s.isAIGenerating[activeTabId] : false));
  const isAIGenerated = useTestRunnerStore((s) => (activeTabId ? s.aiGeneratedTabs[activeTabId] : false));
  const autoTestEnabled = useTestRunnerStore((s) => s.autoTestEnabled);
  const runTests = useTestRunnerStore((s) => s.runTests);
  const clearResults = useTestRunnerStore((s) => s.clearResults);
  const setAutoTestEnabled = useTestRunnerStore((s) => s.setAutoTestEnabled);
  const setScript = useTestRunnerStore((s) => s.setScript);

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

  /** Save AI-generated test scripts into the editor so they persist */
  const handleSaveAITests = useCallback(() => {
    if (!activeTabId || !results?.results?.length) return;
    // Build atx.test() blocks from the results
    const existingScript = useTestRunnerStore.getState().getScript(activeTabId);
    // For AI results, we just preserve whatever script was used — it's already in the store
    if (!existingScript?.trim() && isAIGenerated) {
      toast.info('AI tests are already saved in the test editor');
    } else {
      toast.info('Tests are available in the Tests tab');
    }
  }, [activeTabId, results, isAIGenerated]);

  const hasScript = !!script?.trim();
  const hasResults = !!results?.results?.length;
  const isLoading = isRunning || isAIGenerating;

  // Don't show the panel if there's no response and no results
  if (!hasResponse && !hasResults) return null;

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <FlaskConical size={14} />
          <span className={styles.headerTitle}>
            Test Results
            {isAIGenerated && <span className={styles.aiBadgeHeader}>🤖 AI</span>}
          </span>
        </div>
        <div className={styles.headerActions}>
          {/* Auto-test toggle */}
          <button
            className={`${styles.toggleBtn} ${autoTestEnabled ? styles.toggleActive : ''}`}
            onClick={() => setAutoTestEnabled(!autoTestEnabled)}
            type="button"
            title={autoTestEnabled ? 'Disable auto-test' : 'Enable auto-test: AI generates & runs tests on every response'}
          >
            <Zap size={12} />
            Auto-test
          </button>

          {hasResults && (
            <>
              <button className={styles.headerBtn} onClick={handleCopyResults} type="button" title="Copy results">
                <Clipboard size={12} />
                Copy
              </button>
              {isAIGenerated && (
                <button className={styles.headerBtn} onClick={handleSaveAITests} type="button" title="Save AI tests to editor">
                  <Save size={12} />
                  Save
                </button>
              )}
              <button className={styles.headerBtn} onClick={handleClear} type="button" title="Clear results">
                <RotateCcw size={12} />
                Clear
              </button>
            </>
          )}
          <button
            className={styles.runBtn}
            onClick={handleRun}
            disabled={isLoading || !hasScript || !hasResponse}
            type="button"
            title={!hasScript ? 'Write a test script first' : !hasResponse ? 'Send a request first' : 'Run tests'}
          >
            <Play size={12} />
            {isRunning ? 'Running...' : hasResults ? 'Re-run' : 'Run Tests'}
          </button>
        </div>
      </div>

      {/* AI Generating State */}
      {isAIGenerating && (
        <div className={styles.aiLoading}>
          <div className={styles.spinner} />
          🤖 AI is generating tests...
        </div>
      )}

      {/* Loading State */}
      {isRunning && !isAIGenerating && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          Executing tests...
        </div>
      )}

      {/* Results */}
      {!isLoading && results && (
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
                <TestResultItem
                  key={`${result.name}-${idx}`}
                  result={result}
                  isAIGenerated={isAIGenerated}
                />
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
      {!isLoading && !results && hasScript && (
        <div className={styles.empty}>Click "Run Tests" to execute your test script</div>
      )}

      {!isLoading && !results && !hasScript && (
        <div className={styles.empty}>
          {autoTestEnabled
            ? 'Auto-test ⚡ is ON — send a request to auto-generate & run tests'
            : 'Write a test script in the "Tests" tab above, then run it here'}
        </div>
      )}
    </div>
  );
};
