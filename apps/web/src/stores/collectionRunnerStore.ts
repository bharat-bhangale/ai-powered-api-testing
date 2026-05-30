import { create } from 'zustand';
import { startCollectionRun, stopCollectionRun, type RunEvent, type RunProgressData, type RunCompleteData } from '@/services/collectionRunner.service';
import { useEnvironmentStore } from './environmentStore';
import { toast } from 'sonner';

interface CollectionRunnerStore {
  // State
  isRunning: boolean;
  activeCollectionId: string | null;
  progress: { current: number; total: number } | null;
  results: RunProgressData[];
  summary: RunCompleteData | null;
  error: string | null;
  
  // Internal
  _abortFn: (() => void) | null;

  // Actions
  startRun: (collectionId: string) => void;
  stopRun: () => Promise<void>;
  clearResults: () => void;
}

export const useCollectionRunnerStore = create<CollectionRunnerStore>((set, get) => ({
  isRunning: false,
  activeCollectionId: null,
  progress: null,
  results: [],
  summary: null,
  error: null,
  _abortFn: null,

  startRun: (collectionId: string) => {
    // If already running something, abort it locally
    const { _abortFn } = get();
    if (_abortFn) {
      _abortFn();
    }

    set({
      isRunning: true,
      activeCollectionId: collectionId,
      progress: { current: 0, total: 0 },
      results: [],
      summary: null,
      error: null,
    });

    const environmentId = useEnvironmentStore.getState().activeEnvironmentId;

    const abortFn = startCollectionRun(
      collectionId,
      environmentId,
      (event: RunEvent) => {
        if (event.type === 'progress') {
          const data = event.data as RunProgressData;
          set((state) => ({
            progress: { current: data.requestIndex + 1, total: data.total },
            results: [...state.results, data],
          }));
        } else if (event.type === 'complete') {
          const data = event.data as RunCompleteData;
          set({
            isRunning: false,
            summary: data,
            _abortFn: null,
          });
          if (data.status === 'failed') {
            toast.error('Collection run completed with failures');
          } else if (data.status === 'cancelled') {
            toast.info('Collection run stopped');
          } else {
            toast.success('Collection run completed successfully');
          }
        } else if (event.type === 'error') {
          const msg = (event.data as { message: string }).message;
          set({
            isRunning: false,
            error: msg,
            _abortFn: null,
          });
          toast.error(`Run error: ${msg}`);
        }
      },
      (errorMsg: string) => {
        set({
          isRunning: false,
          error: errorMsg,
          _abortFn: null,
        });
        toast.error(`Connection failed: ${errorMsg}`);
      }
    );

    set({ _abortFn: abortFn });
  },

  stopRun: async () => {
    const { activeCollectionId, _abortFn, isRunning } = get();
    if (!isRunning || !activeCollectionId) return;

    // Abort local SSE connection immediately
    if (_abortFn) {
      _abortFn();
    }

    set({ isRunning: false, _abortFn: null });
    toast.info('Stopping run...');

    try {
      await stopCollectionRun(activeCollectionId);
    } catch (err) {
      console.error('Failed to stop run backend', err);
    }
  },

  clearResults: () => {
    set({
      progress: null,
      results: [],
      summary: null,
      error: null,
      activeCollectionId: null,
    });
  },
}));
