import { create } from 'zustand';
import { executeTests, type TestResult, type TestRunResponse } from '@/services/testRunner.service';
import { useRequestStore } from './requestStore';

// ===== Store Interface =====

interface TestRunnerStore {
  /** The current test script content (per active tab) */
  scripts: Record<string, string>;
  /** Test results for each tab */
  results: Record<string, TestRunResponse | null>;
  /** Loading state per tab */
  isRunning: Record<string, boolean>;
  /** Global auto-test toggle */
  autoTestEnabled: boolean;

  // Actions
  setScript: (tabId: string, script: string) => void;
  getScript: (tabId: string) => string;
  runTests: (tabId: string) => Promise<void>;
  clearResults: (tabId: string) => void;
  setAutoTestEnabled: (enabled: boolean) => void;
  setResults: (tabId: string, results: TestRunResponse) => void;
}

// ===== Store =====

export const useTestRunnerStore = create<TestRunnerStore>((set, get) => ({
  scripts: {},
  results: {},
  isRunning: {},
  autoTestEnabled: false,

  setScript: (tabId, script) => {
    set((state) => ({
      scripts: { ...state.scripts, [tabId]: script },
    }));
  },

  getScript: (tabId) => {
    return get().scripts[tabId] || '';
  },

  runTests: async (tabId) => {
    const script = get().scripts[tabId];
    if (!script?.trim()) return;

    const requestStore = useRequestStore.getState();
    const tab = requestStore.tabs.find((t) => t.id === tabId);
    if (!tab?.response) return;

    set((state) => ({
      isRunning: { ...state.isRunning, [tabId]: true },
    }));

    try {
      // Build request context from the tab's resolved request
      const requestCtx = {
        method: tab.method,
        url: tab.response.request.resolvedUrl || tab.url,
        headers: tab.response.request.resolvedHeaders || {},
        body: tab.response.request.resolvedBody,
      };

      // Build response context
      const responseCtx = {
        status: tab.response.response.status,
        statusText: tab.response.response.statusText,
        headers: tab.response.response.headers,
        body: tab.response.response.body,
        size: tab.response.response.size,
        timing: tab.response.response.timing,
      };

      const result = await executeTests(script, requestCtx, responseCtx);

      set((state) => ({
        results: { ...state.results, [tabId]: result },
        isRunning: { ...state.isRunning, [tabId]: false },
      }));
    } catch {
      set((state) => ({
        results: {
          ...state.results,
          [tabId]: {
            results: [],
            totalPassed: 0,
            totalFailed: 0,
            duration: 0,
            logs: [],
            error: 'Failed to execute tests',
          },
        },
        isRunning: { ...state.isRunning, [tabId]: false },
      }));
    }
  },

  clearResults: (tabId) => {
    set((state) => ({
      results: { ...state.results, [tabId]: null },
    }));
  },

  setAutoTestEnabled: (enabled) => {
    set({ autoTestEnabled: enabled });
  },

  setResults: (tabId, results) => {
    set((state) => ({
      results: { ...state.results, [tabId]: results },
    }));
  },
}));

// Re-export types for convenience
export type { TestResult, TestRunResponse };
