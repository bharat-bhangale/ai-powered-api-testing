import { create } from 'zustand';
import { apiClient } from '@/services/api';

// ===== Types =====

export type AnomalyType = 'timing' | 'size' | 'status' | 'field_missing' | 'field_new' | 'type_change';
export type AnomalySeverity = 'warning' | 'critical';

export interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  details: {
    expected: unknown;
    actual: unknown;
  };
  explanation?: string; // Lazy-loaded via AI
}

export interface AnomalyResult {
  anomalies: Anomaly[];
  endpointKey: string;
  baselineActive: boolean;
  sampleCount: number;
}

interface AnomalyStore {
  // Current response anomalies (reset on each new request)
  current: AnomalyResult | null;
  // Which anomaly is being explained
  loadingExplanationIndex: number | null;
  // Whether the detail panel is expanded
  isPanelOpen: boolean;

  // Actions
  setCurrent: (result: AnomalyResult | null) => void;
  dismissAnomaly: (index: number) => void;
  setExplanation: (index: number, explanation: string) => void;
  setLoadingExplanation: (index: number | null) => void;
  togglePanel: () => void;
  closePanel: () => void;
  reset: () => void;

  // Async actions
  analyzeResponse: (params: {
    method: string;
    url: string;
    status: number;
    responseTimeMs: number;
    responseSizeBytes: number;
    responseBody: unknown;
  }) => Promise<void>;

  explainAnomaly: (index: number) => Promise<void>;
}

/**
 * Zustand store for the anomaly detection feature.
 * Holds current-response anomalies and handles lazy AI explanations.
 */
export const useAnomalyStore = create<AnomalyStore>((set, get) => ({
  current: null,
  loadingExplanationIndex: null,
  isPanelOpen: false,

  setCurrent: (current) => set({ current }),
  dismissAnomaly: (index) =>
    set((state) => {
      if (!state.current) return state;
      const anomalies = [...state.current.anomalies];
      anomalies.splice(index, 1);
      return { current: { ...state.current, anomalies } };
    }),

  setExplanation: (index, explanation) =>
    set((state) => {
      if (!state.current) return state;
      const anomalies = [...state.current.anomalies];
      if (anomalies[index]) {
        anomalies[index] = { ...anomalies[index]!, explanation };
      }
      return { current: { ...state.current, anomalies } };
    }),

  setLoadingExplanation: (index) => set({ loadingExplanationIndex: index }),
  togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),
  closePanel: () => set({ isPanelOpen: false }),
  reset: () => set({ current: null, isPanelOpen: false, loadingExplanationIndex: null }),

  analyzeResponse: async (params) => {
    try {
      const res = await apiClient.post('/api/anomalies/analyze', params);
      const result = res.data.data as AnomalyResult;

      set({ current: result });

      // Auto-open panel if critical anomalies found
      if (result.anomalies.some((a) => a.severity === 'critical')) {
        set({ isPanelOpen: true });
      }
    } catch {
      // Silent — anomaly detection failure is non-critical
    }
  },

  explainAnomaly: async (index) => {
    const { current } = get();
    const anomaly = current?.anomalies[index];
    if (!anomaly || anomaly.explanation) return;

    set({ loadingExplanationIndex: index });

    try {
      const res = await apiClient.post('/api/anomalies/explain', {
        type: anomaly.type,
        severity: anomaly.severity,
        message: anomaly.message,
        endpoint: current?.endpointKey,
        details: anomaly.details,
      });

      get().setExplanation(index, res.data.data.explanation);
    } catch {
      get().setExplanation(index, 'Unable to generate explanation. Please try again.');
    } finally {
      set({ loadingExplanationIndex: null });
    }
  },
}));
