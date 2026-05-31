import { create } from 'zustand';
import { executeTests, type TestResult, type TestRunResponse } from '@/services/testRunner.service';
import { useRequestStore } from './requestStore';

// ===== Store Interface =====

interface TestRunnerStore {
  /** The current test script content (per active tab) */
  scripts: Record<string, string>;
  /** The current pre-request script content (per active tab) */
  preRequestScripts: Record<string, string>;
  /** Test results for each tab */
  results: Record<string, TestRunResponse | null>;
  /** Loading state per tab */
  isRunning: Record<string, boolean>;
  /** Global auto-test toggle */
  autoTestEnabled: boolean;
  /** Whether AI is currently generating tests for a tab */
  isAIGenerating: Record<string, boolean>;
  /** Tracks which results were AI-generated (per tab) */
  aiGeneratedTabs: Record<string, boolean>;
  /** Last response hash to prevent re-triggering */
  lastResponseHash: Record<string, string>;

  // Actions
  setScript: (tabId: string, script: string) => void;
  getScript: (tabId: string) => string;
  setPreRequestScript: (tabId: string, script: string) => void;
  getPreRequestScript: (tabId: string) => string;
  runTests: (tabId: string) => Promise<void>;
  clearResults: (tabId: string) => void;
  setAutoTestEnabled: (enabled: boolean) => void;
  setResults: (tabId: string, results: TestRunResponse) => void;
  setAIGenerating: (tabId: string, generating: boolean) => void;
  setAIGenerated: (tabId: string, isAI: boolean) => void;
  setLastResponseHash: (tabId: string, hash: string) => void;
  /** Run AI-generated tests: stores the AI script, runs it, marks results as AI */
  runAITests: (tabId: string, aiScript: string) => Promise<void>;
}

// ===== Store =====

export const useTestRunnerStore = create<TestRunnerStore>((set, get) => ({
  scripts: {},
  preRequestScripts: {},
  results: {},
  isRunning: {},
  autoTestEnabled: false,
  isAIGenerating: {},
  aiGeneratedTabs: {},
  lastResponseHash: {},

  setScript: (tabId, script) => {
    set((state) => ({
      scripts: { ...state.scripts, [tabId]: script },
    }));
  },

  getScript: (tabId) => {
    return get().scripts[tabId] || '';
  },

  setPreRequestScript: (tabId, script) => {
    set((state) => ({
      preRequestScripts: { ...state.preRequestScripts, [tabId]: script },
    }));
  },

  getPreRequestScript: (tabId) => {
    return get().preRequestScripts[tabId] || '';
  },

  runTests: async (tabId) => {
    const script = get().scripts[tabId];
    if (!script?.trim()) return;

    const requestStore = useRequestStore.getState();
    const tab = requestStore.tabs.find((t) => t.id === tabId);
    if (!tab?.response) return;

    set((state) => ({
      isRunning: { ...state.isRunning, [tabId]: true },
      aiGeneratedTabs: { ...state.aiGeneratedTabs, [tabId]: false },
    }));

    try {
      const requestCtx = {
        method: tab.method,
        url: tab.response.request.resolvedUrl || tab.url,
        headers: tab.response.request.resolvedHeaders || {},
        body: tab.response.request.resolvedBody,
      };

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

  runAITests: async (tabId, aiScript) => {
    const requestStore = useRequestStore.getState();
    const tab = requestStore.tabs.find((t) => t.id === tabId);
    if (!tab?.response) return;

    set((state) => ({
      isRunning: { ...state.isRunning, [tabId]: true },
      aiGeneratedTabs: { ...state.aiGeneratedTabs, [tabId]: true },
    }));

    try {
      const requestCtx = {
        method: tab.method,
        url: tab.response.request.resolvedUrl || tab.url,
        headers: tab.response.request.resolvedHeaders || {},
        body: tab.response.request.resolvedBody,
      };

      const responseCtx = {
        status: tab.response.response.status,
        statusText: tab.response.response.statusText,
        headers: tab.response.response.headers,
        body: tab.response.response.body,
        size: tab.response.response.size,
        timing: tab.response.response.timing,
      };

      // Run manual tests first if they exist
      const manualScript = get().scripts[tabId];
      let manualResults: TestRunResponse | null = null;
      if (manualScript?.trim()) {
        manualResults = await executeTests(manualScript, requestCtx, responseCtx);
      }

      // Then run AI-generated tests
      const aiResults = await executeTests(aiScript, requestCtx, responseCtx);

      // Merge results: manual first, then AI
      const mergedResults: TestRunResponse = {
        results: [
          ...(manualResults?.results || []),
          ...aiResults.results,
        ],
        totalPassed: (manualResults?.totalPassed || 0) + aiResults.totalPassed,
        totalFailed: (manualResults?.totalFailed || 0) + aiResults.totalFailed,
        duration: (manualResults?.duration || 0) + aiResults.duration,
        logs: [...(manualResults?.logs || []), ...aiResults.logs],
        error: manualResults?.error || aiResults.error,
      };

      set((state) => ({
        results: { ...state.results, [tabId]: mergedResults },
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
            error: 'Failed to execute AI-generated tests',
          },
        },
        isRunning: { ...state.isRunning, [tabId]: false },
      }));
    }
  },

  clearResults: (tabId) => {
    set((state) => ({
      results: { ...state.results, [tabId]: null },
      aiGeneratedTabs: { ...state.aiGeneratedTabs, [tabId]: false },
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

  setAIGenerating: (tabId, generating) => {
    set((state) => ({
      isAIGenerating: { ...state.isAIGenerating, [tabId]: generating },
    }));
  },

  setAIGenerated: (tabId, isAI) => {
    set((state) => ({
      aiGeneratedTabs: { ...state.aiGeneratedTabs, [tabId]: isAI },
    }));
  },

  setLastResponseHash: (tabId, hash) => {
    set((state) => ({
      lastResponseHash: { ...state.lastResponseHash, [tabId]: hash },
    }));
  },
}));

// Re-export types for convenience
export type { TestResult, TestRunResponse };
