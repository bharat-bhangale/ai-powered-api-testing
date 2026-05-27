import { useState, useCallback } from 'react';
import { X, Sparkles, Copy, Check, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAIStore } from '@/stores/aiStore';
import { useRequestStore } from '@/stores/requestStore';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/services/api';
import styles from './AITestSuggestions.module.css';

// ===== Types =====

interface GeneratedTest {
  name: string;
  category: 'status' | 'body_structure' | 'data_validation' | 'performance' | 'edge_case';
  assertion: string;
  script: string;
}

interface TestSuite {
  tests: GeneratedTest[];
  summary: string;
}

const CATEGORY_LABELS: Record<string, { label: string; className: string }> = {
  status: { label: 'Status', className: 'catStatus' },
  body_structure: { label: 'Body', className: 'catBody' },
  data_validation: { label: 'Data', className: 'catData' },
  performance: { label: 'Perf', className: 'catPerf' },
  edge_case: { label: 'Edge', className: 'catEdge' },
};

/**
 * AITestSuggestions — generates test assertions from the current response.
 * Displays as an expandable checklist with category badges and copy actions.
 */
export const AITestSuggestions = () => {
  const { isGeneratingTests, setGeneratingTests, setUsage } = useAIStore();
  const [testSuite, setTestSuite] = useState<TestSuite | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isVisible, setIsVisible] = useState(false);

  /** Generate tests from current request+response */
  const handleGenerate = useCallback(async () => {
    const store = useRequestStore.getState();
    const tab = store.tabs.find((t) => t.id === store.activeTabId);
    if (!tab?.response) {
      toast.error('Send a request first to generate tests');
      return;
    }

    setGeneratingTests(true);
    setIsVisible(true);

    try {
      const res = await apiClient.post('/api/ai/generate-tests', {
        request: { method: tab.method, url: tab.url },
        response: tab.response.response,
      });

      const suite: TestSuite = res.data.data;
      setTestSuite(suite);
      setSelected(new Set(suite.tests.map((_, i) => i)));

      // Update usage from header
      const remaining = res.headers['x-ai-usage-remaining'];
      if (remaining != null) {
        const used = 50 - Number(remaining);
        setUsage({ used, limit: 50, remaining: Number(remaining) });
      }

      toast.success(`Generated ${suite.tests.length} test assertions`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate tests');
      setIsVisible(false);
    } finally {
      setGeneratingTests(false);
    }
  }, [setGeneratingTests, setUsage]);

  /** Toggle individual test selection */
  const toggleTest = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  /** Copy selected test scripts to clipboard */
  const copySelected = useCallback(() => {
    if (!testSuite) return;
    const scripts = testSuite.tests
      .filter((_, i) => selected.has(i))
      .map((t) => t.script)
      .join('\n\n');
    navigator.clipboard.writeText(scripts);
    toast.success(`Copied ${selected.size} test scripts`);
  }, [testSuite, selected]);

  /** Copy all scripts */
  const copyAll = useCallback(() => {
    if (!testSuite) return;
    const scripts = testSuite.tests.map((t) => t.script).join('\n\n');
    navigator.clipboard.writeText(scripts);
    toast.success('All test scripts copied');
  }, [testSuite]);

  /** Dismiss the panel */
  const dismiss = () => {
    setIsVisible(false);
    setTestSuite(null);
  };

  // Check if current tab has a response
  const hasResponse = useRequestStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return !!tab?.response;
  });

  return (
    <>
      {/* Trigger Button */}
      {hasResponse && !isVisible && (
        <button
          className={styles.triggerBtn}
          onClick={handleGenerate}
          disabled={isGeneratingTests}
          type="button"
        >
          <Sparkles size={13} />
          {isGeneratingTests ? 'Generating...' : 'Generate Tests'}
        </button>
      )}

      {/* Results Panel */}
      {isVisible && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <Sparkles size={14} className={styles.sparkle} />
              <span className={styles.headerTitle}>AI Generated Tests</span>
            </div>
            <button className={styles.closeBtn} onClick={dismiss} type="button">
              <X size={14} />
            </button>
          </div>

          {isGeneratingTests ? (
            <div className={styles.loading}>
              <div className={styles.loadingPulse} />
              <p>AI is analyzing your response...</p>
            </div>
          ) : testSuite ? (
            <>
              <p className={styles.summary}>{testSuite.summary}</p>

              <div className={styles.testList}>
                {testSuite.tests.map((test, idx) => {
                  const cat = CATEGORY_LABELS[test.category] || CATEGORY_LABELS.status!;
                  return (
                    <div
                      key={idx}
                      className={`${styles.testItem} ${selected.has(idx) ? styles.testSelected : ''}`}
                    >
                      <label className={styles.testHeader}>
                        <input
                          type="checkbox"
                          checked={selected.has(idx)}
                          onChange={() => toggleTest(idx)}
                          className={styles.checkbox}
                        />
                        <span className={styles.testName}>{test.name}</span>
                        <span className={`${styles.catBadge} ${styles[cat.className]!}`}>{cat.label}</span>
                      </label>
                      <div className={styles.scriptBlock}>
                        <code>{test.script}</code>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.actions}>
                <button className={styles.actionBtn} onClick={copySelected} type="button">
                  <ClipboardCheck size={13} />
                  Apply Selected ({selected.size})
                </button>
                <button className={`${styles.actionBtn} ${styles.actionSecondary}`} onClick={copyAll} type="button">
                  <Copy size={13} />
                  Copy All
                </button>
                <button className={`${styles.actionBtn} ${styles.actionSecondary}`} onClick={dismiss} type="button">
                  Dismiss
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </>
  );
};
