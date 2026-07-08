import { create } from 'zustand';
import { apiClient } from '@/services/api';
import type { RequestTab } from '@/stores/requestStore';
import type { ExecutionResponse } from '@/stores/requestStore';

// ===== Types =====

export type OptimizationCategory = 'headers' | 'performance' | 'security' | 'best_practices' | 'correctness';
export type OptimizationSeverity = 'info' | 'warning' | 'critical';

export interface OptimizationFix {
  type: 'add_header' | 'change_method' | 'add_param' | 'modify_body';
  key?: string;
  value?: string;
}

export interface Optimization {
  category: OptimizationCategory;
  title: string;
  description: string;
  currentValue?: string;
  suggestedValue?: string;
  severity: OptimizationSeverity;
  autoFixable: boolean;
  fix?: OptimizationFix;
  applied?: boolean;
}

export interface OptimizationResult {
  optimizations: Optimization[];
  score: number;
}

type OptimizerState = 'idle' | 'analyzing' | 'ready' | 'error';

interface OptimizerStore {
  state: OptimizerState;
  result: OptimizationResult | null;
  isPanelOpen: boolean;
  errorMessage: string | null;

  setState: (s: OptimizerState) => void;
  setResult: (r: OptimizationResult | null) => void;
  setError: (msg: string | null) => void;
  openPanel: () => void;
  closePanel: () => void;
  reset: () => void;
  markApplied: (index: number) => void;

  analyze: (tab: RequestTab, response: ExecutionResponse) => Promise<void>;
}

export const useOptimizerStore = create<OptimizerStore>((set, get) => ({
  state: 'idle',
  result: null,
  isPanelOpen: false,
  errorMessage: null,

  setState: (state) => set({ state }),
  setResult: (result) => set({ result }),
  setError: (errorMessage) => set({ errorMessage }),
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
  reset: () => set({ state: 'idle', result: null, errorMessage: null, isPanelOpen: false }),

  markApplied: (index) =>
    set((state) => {
      if (!state.result) return state;
      const optimizations = [...state.result.optimizations];
      if (optimizations[index]) {
        optimizations[index] = { ...optimizations[index]!, applied: true };
      }
      return { result: { ...state.result, optimizations } };
    }),

  analyze: async (tab: RequestTab, response: ExecutionResponse) => {
    set({ state: 'analyzing', errorMessage: null });
    try {
      const res = await apiClient.post('/api/ai/optimize-request', {
        request: {
          method: tab.method,
          url: tab.url,
          headers: tab.headers,
          params: tab.params,
          body: tab.body,
        },
        response: {
          status: response.response.status,
          statusText: response.response.statusText,
          headers: response.response.headers,
          body: response.response.body,
          size: response.response.size,
          timing: response.response.timing,
        },
      });

      set({ state: 'ready', result: res.data.data, isPanelOpen: true });
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Optimization analysis failed';
      set({ state: 'error', errorMessage: msg });
    }
  },
}));
