import { create } from 'zustand';
import { getAvailableDiffDates, runDiffAnalysis } from '@/services/diff.service';
import { toast } from 'sonner';

// ===== Types (mirrored from backend schema) =====

export interface BreakingChange {
  endpoint: string;
  change: string;
  impact: string;
  migration: string;
}

export interface Deprecation {
  endpoint: string;
  signal: string;
  alternative: string;
  deadline?: string;
}

export interface Drift {
  endpoint: string;
  change: string;
  risk: 'high' | 'medium' | 'low';
}

export interface Enhancement {
  endpoint: string;
  change: string;
}

export interface StructuralChange {
  endpoint: string;
  changeType: string;
  path?: string;
  oldValue?: string;
  newValue?: string;
  detail?: string;
}

export interface DiffStoreResult {
  breakingChanges: BreakingChange[];
  deprecations: Deprecation[];
  drifts: Drift[];
  enhancements: Enhancement[];
  summary: string;
  migrationGuide?: string;
  structuralChanges: StructuralChange[];
  endpointsCompared: number;
  baselineDate: string;
  currentDate: string;
  availableDates: string[];
}

type DiffState = 'idle' | 'loading-dates' | 'ready-dates' | 'analyzing' | 'done' | 'error';

interface DiffStore {
  state: DiffState;
  availableDates: string[];
  baselineDate: string;
  currentDate: string;
  result: DiffStoreResult | null;
  errorMessage: string | null;
  activeCollectionId: string | null;
  showMigrationGuide: boolean;

  // Actions
  setBaselineDate: (d: string) => void;
  setCurrentDate: (d: string) => void;
  setShowMigrationGuide: (v: boolean) => void;
  reset: () => void;

  // Async
  loadDates: (collectionId: string) => Promise<void>;
  analyze: (collectionId: string) => Promise<void>;
}

export const useDiffStore = create<DiffStore>((set, get) => ({
  state: 'idle',
  availableDates: [],
  baselineDate: '',
  currentDate: '',
  result: null,
  errorMessage: null,
  activeCollectionId: null,
  showMigrationGuide: false,

  setBaselineDate: (baselineDate) => set({ baselineDate }),
  setCurrentDate: (currentDate) => set({ currentDate }),
  setShowMigrationGuide: (showMigrationGuide) => set({ showMigrationGuide }),
  reset: () => set({
    state: 'idle',
    availableDates: [],
    baselineDate: '',
    currentDate: '',
    result: null,
    errorMessage: null,
    showMigrationGuide: false,
  }),

  loadDates: async (collectionId: string) => {
    set({ state: 'loading-dates', activeCollectionId: collectionId, errorMessage: null });
    try {
      const dates = await getAvailableDiffDates(collectionId);
      set({
        state: 'ready-dates',
        availableDates: dates,
        // Auto-select: oldest as baseline, newest as current
        baselineDate: dates[0] ?? '',
        currentDate: dates[dates.length - 1] ?? '',
      });
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Failed to load dates';
      set({ state: 'error', errorMessage: msg });
      toast.error(msg);
    }
  },

  analyze: async (collectionId: string) => {
    const { baselineDate, currentDate } = get();
    if (!baselineDate || !currentDate) {
      toast.error('Select both a baseline and current date first');
      return;
    }

    set({ state: 'analyzing', errorMessage: null });
    try {
      const result = await runDiffAnalysis({ collectionId, baselineDate, currentDate });
      set({ state: 'done', result });

      const total =
        result.breakingChanges.length +
        result.deprecations.length +
        result.drifts.length +
        result.enhancements.length;

      if (result.breakingChanges.length > 0) {
        toast.warning(`${result.breakingChanges.length} breaking change${result.breakingChanges.length !== 1 ? 's' : ''} detected!`);
      } else if (total > 0) {
        toast.success(`Diff complete — ${total} change${total !== 1 ? 's' : ''} found`);
      } else {
        toast.success('No changes detected between the two snapshots');
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        (err as { message?: string })?.message ??
        'Diff analysis failed';
      set({ state: 'error', errorMessage: msg });
      toast.error(msg);
    }
  },
}));
