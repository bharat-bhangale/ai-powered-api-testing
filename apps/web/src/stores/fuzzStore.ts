import { create } from 'zustand';
import { toast } from 'sonner';

// ===== Types =====

export type FuzzCategory = 'boundary' | 'type_confusion' | 'injection' | 'xss' | 'unicode' | 'format' | 'size';
export type FuzzVerdict = 'pass' | 'fail' | 'crash' | 'timeout' | 'leak';

export interface FuzzResult {
  id: string;
  field: string;
  category: FuzzCategory | 'ai';
  payloadLabel: string;
  payloadPreview: string;
  statusCode: number | null;
  verdict: FuzzVerdict;
  responsePreview: string;
  durationMs: number;
}

export interface FuzzReport {
  id: string;
  requestMethod: string;
  requestUrl: string;
  startedAt: string;
  completedAt?: string;
  totalPayloads: number;
  passed: number;
  failed: number;
  crashed: number;
  timedOut: number;
  leaked: number;
  results: FuzzResult[];
}

export const CATEGORY_LABELS: Record<FuzzCategory, string> = {
  boundary:      'Boundary Values',
  type_confusion: 'Type Confusion',
  injection:     'Injection',
  xss:           'XSS',
  unicode:       'Unicode',
  format:        'Format Violations',
  size:          'Size Attacks',
};

// Default selected categories (not all — size is expensive)
export const DEFAULT_CATEGORIES: FuzzCategory[] = ['boundary', 'type_confusion', 'injection', 'format'];

type FuzzState = 'idle' | 'generating' | 'running' | 'done' | 'error';

interface FuzzStore {
  state: FuzzState;
  progress: number;
  progressMessage: string;
  selectedCategories: FuzzCategory[];
  useAiPayloads: boolean;
  results: FuzzResult[];
  report: FuzzReport | null;
  errorMessage: string | null;

  setCategory: (cat: FuzzCategory, enabled: boolean) => void;
  setUseAiPayloads: (v: boolean) => void;
  reset: () => void;
  stopFuzz: () => void;

  // Async
  startFuzz: (method: string, url: string, headers: Record<string, string>, body: unknown) => Promise<void>;
}

export const useFuzzStore = create<FuzzStore>((set, get) => ({
  state: 'idle',
  progress: 0,
  progressMessage: '',
  selectedCategories: DEFAULT_CATEGORIES,
  useAiPayloads: false,
  results: [],
  report: null,
  errorMessage: null,

  setCategory: (cat, enabled) =>
    set((s) => ({
      selectedCategories: enabled
        ? [...s.selectedCategories, cat]
        : s.selectedCategories.filter((c) => c !== cat),
    })),

  setUseAiPayloads: (useAiPayloads) => set({ useAiPayloads }),

  reset: () => set({
    state: 'idle', progress: 0, progressMessage: '', results: [], report: null, errorMessage: null,
  }),

  stopFuzz: () => set({ state: 'idle' }),

  startFuzz: async (method, url, headers, body) => {
    const { selectedCategories, useAiPayloads } = get();
    if (selectedCategories.length === 0) {
      toast.error('Select at least one fuzz category');
      return;
    }

    set({ state: 'running', progress: 0, progressMessage: 'Connecting…', results: [], report: null, errorMessage: null });

    try {
      const token = localStorage.getItem('atx-token') ?? '';
      const response = await fetch('/api/fuzz/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ method, url, headers, body, categories: selectedCategories, useAiPayloads }),
      });

      if (!response.ok || !response.body) throw new Error('Failed to connect to fuzz runner');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string;
              message?: string;
              progress?: number;
              result?: FuzzResult;
              report?: FuzzReport;
            };

            if (event.type === 'progress') {
              set({ progress: event.progress ?? get().progress, progressMessage: event.message ?? '' });
            } else if (event.type === 'result' && event.result) {
              const r = event.result;
              set((s) => ({ results: [...s.results, r], progress: event.progress ?? s.progress }));
              // Toast for critical findings only
              if (r.verdict === 'crash') {
                toast.error(`💥 Crash: ${r.payloadLabel}`, { duration: 3000 });
              }
            } else if (event.type === 'complete' && event.report) {
              set({ state: 'done', report: event.report, progress: 100 });
              const r = event.report;
              toast.success(`Fuzz complete — ${r.crashed} crashes, ${r.failed} failures, ${r.passed} passed`);
            } else if (event.type === 'error') {
              set({ state: 'error', errorMessage: event.message ?? 'Unknown error' });
              toast.error(event.message ?? 'Fuzz test failed');
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Fuzz test failed';
      set({ state: 'error', errorMessage: msg });
      toast.error(msg);
    }
  },
}));
