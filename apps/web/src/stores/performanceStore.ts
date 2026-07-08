import { create } from 'zustand';
import { apiClient } from '@/services/api';
import { toast } from 'sonner';

// ===== Types (mirrored from backend Zod schema) =====

export interface Bottleneck {
  endpoint: string;
  avgTime: number;
  issue: string;
  suggestion: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface Optimization {
  type: 'caching' | 'compression' | 'pagination' | 'batching' | 'async';
  endpoint: string;
  observation: string;
  suggestion: string;
}

export interface Trend {
  endpoint: string;
  trend: 'improving' | 'degrading' | 'stable';
  changePercent: number;
}

export interface PerfProfile {
  performanceScore: number;
  bottlenecks: Bottleneck[];
  optimizations: Optimization[];
  trends: Trend[];
}

type ProfileState = 'idle' | 'loading' | 'ready' | 'error';

interface PerformanceStore {
  state: ProfileState;
  profile: PerfProfile | null;
  errorMessage: string | null;
  activeCollectionId: string | null;

  setState: (s: ProfileState) => void;
  setProfile: (p: PerfProfile | null) => void;
  setError: (msg: string | null) => void;
  setActiveCollection: (id: string | null) => void;
  reset: () => void;

  runProfile: (collectionId: string) => Promise<void>;
}

/**
 * PerformanceStore — manages state for the AI Performance Profiler.
 */
export const usePerformanceStore = create<PerformanceStore>((set) => ({
  state: 'idle',
  profile: null,
  errorMessage: null,
  activeCollectionId: null,

  setState: (state) => set({ state }),
  setProfile: (profile) => set({ profile }),
  setError: (errorMessage) => set({ errorMessage }),
  setActiveCollection: (activeCollectionId) => set({ activeCollectionId }),
  reset: () => set({ state: 'idle', profile: null, errorMessage: null }),

  runProfile: async (collectionId: string) => {
    set({ state: 'loading', errorMessage: null, activeCollectionId: collectionId });
    try {
      const res = await apiClient.post('/api/ai/performance-profile', { collectionId });
      set({ state: 'ready', profile: res.data.data });
      toast.success('Performance profile complete');
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : ((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Profiling failed');
      set({ state: 'error', errorMessage: msg });
      toast.error(msg);
    }
  },
}));
