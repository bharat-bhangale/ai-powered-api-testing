import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useRequestStore } from '@/stores/requestStore';
import { useTestRunnerStore } from '@/stores/testRunnerStore';
import { apiClient } from '@/services/api';
import { useAIStore } from '@/stores/aiStore';

// ===== Types =====

interface GeneratedTest {
  name: string;
  category: string;
  assertion: string;
  script: string;
}

interface AITestSuite {
  tests: GeneratedTest[];
  summary: string;
}

// ===== Helpers =====

/**
 * Creates a simple hash of the response to detect changes.
 * Uses status + body length + first 100 chars of body to avoid re-triggering.
 */
function computeResponseHash(response: {
  status: number;
  body: unknown;
  timing: { total: number };
}): string {
  const bodyStr = typeof response.body === 'string'
    ? response.body.substring(0, 100)
    : JSON.stringify(response.body).substring(0, 100);
  return `${response.status}:${bodyStr.length}:${bodyStr}`;
}

/**
 * Converts AI-generated test objects into a single executable script string.
 */
function combineTestScripts(tests: GeneratedTest[]): string {
  return tests
    .map((t) => t.script)
    .join('\n\n');
}

// ===== Hook =====

/**
 * useAutoTest — watches for new responses on the active tab.
 * When autoTestEnabled is ON and a new response arrives:
 * 1. Call AI test generation API
 * 2. Combine generated test scripts
 * 3. Execute them via the test runner
 * 4. Store results (marked as AI-generated)
 *
 * The pipeline is fully non-blocking — the response viewer shows immediately.
 */
export function useAutoTest(): void {
  const activeTabId = useRequestStore((s) => s.activeTabId);

  // Get the response's executedAt timestamp as a change detector
  const responseTimestamp = useRequestStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.response?.executedAt || null;
  });

  const autoTestEnabled = useTestRunnerStore((s) => s.autoTestEnabled);
  const prevTimestampRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Skip if auto-test is off
    if (!autoTestEnabled) return;
    // Skip if no active tab or no response
    if (!activeTabId || !responseTimestamp) return;
    // Skip if the response hasn't changed
    if (responseTimestamp === prevTimestampRef.current) return;
    // Skip if already processing
    if (isProcessingRef.current) return;

    prevTimestampRef.current = responseTimestamp;
    isProcessingRef.current = true;

    const runAutoTest = async () => {
      const store = useRequestStore.getState();
      const tab = store.tabs.find((t) => t.id === activeTabId);
      if (!tab?.response) return;

      const testRunnerState = useTestRunnerStore.getState();

      // Check response hash to avoid re-triggering
      const hash = computeResponseHash(tab.response.response);
      const prevHash = testRunnerState.lastResponseHash[activeTabId];
      if (hash === prevHash) {
        isProcessingRef.current = false;
        return;
      }
      testRunnerState.setLastResponseHash(activeTabId, hash);
      testRunnerState.setAIGenerating(activeTabId, true);

      try {
        // Step 1: Call AI test generation API
        const res = await apiClient.post('/api/ai/generate-tests', {
          request: { method: tab.method, url: tab.url },
          response: tab.response.response,
        });

        const suite: AITestSuite = res.data.data;

        if (!suite?.tests?.length) {
          testRunnerState.setAIGenerating(activeTabId, false);
          isProcessingRef.current = false;
          return;
        }

        // Update AI usage tracking
        const remaining = res.headers['x-ai-usage-remaining'];
        if (remaining != null) {
          const used = 50 - Number(remaining);
          useAIStore.getState().setUsage({ used, limit: 50, remaining: Number(remaining) });
        }

        // Step 2: Combine generated scripts
        const aiScript = combineTestScripts(suite.tests);

        // Step 3: Execute via test runner (merges with manual tests if any)
        testRunnerState.setAIGenerating(activeTabId, false);
        await testRunnerState.runAITests(activeTabId, aiScript);

        toast.success(`AI auto-test: ${suite.tests.length} tests generated & executed`, {
          duration: 3000,
        });
      } catch (err) {
        // Fail silently with a toast — never crash the response viewer
        testRunnerState.setAIGenerating(activeTabId, false);
        const message = err instanceof Error ? err.message : 'AI test generation failed';
        toast.error(message, { duration: 3000 });
      } finally {
        isProcessingRef.current = false;
      }
    };

    runAutoTest();
  }, [activeTabId, responseTimestamp, autoTestEnabled]);
}
