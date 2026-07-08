import { create } from 'zustand';

// ===== Types =====

export interface DiscoveredEndpoint {
  id: string;
  method: string;
  path: string;
  status: number;
  responseType: 'array' | 'object' | 'string' | 'empty' | 'error';
  fieldCount: number;
}

export interface DiscoveryPhase {
  phase: number;
  description: string;
}

export interface DiscoveryCollection {
  collectionName: string;
  folders: Array<{
    name: string;
    requests: Array<{ name: string; method: string; path: string; url: string }>;
  }>;
}

export type DiscoveryStatus = 'idle' | 'discovering' | 'complete' | 'stopped' | 'error';

interface DiscoveryStore {
  // State
  status: DiscoveryStatus;
  baseUrl: string;
  currentPhase: DiscoveryPhase | null;
  currentProbe: { url: string; method: string } | null;
  endpoints: DiscoveredEndpoint[];
  collection: DiscoveryCollection | null;
  errorMessage: string | null;
  authRequired: boolean;

  // Actions
  setBaseUrl: (url: string) => void;
  setStatus: (status: DiscoveryStatus) => void;
  setCurrentPhase: (phase: DiscoveryPhase) => void;
  setCurrentProbe: (probe: { url: string; method: string } | null) => void;
  addEndpoint: (endpoint: Omit<DiscoveredEndpoint, 'id'>) => void;
  setCollection: (collection: DiscoveryCollection) => void;
  setErrorMessage: (msg: string | null) => void;
  setAuthRequired: (required: boolean) => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as DiscoveryStatus,
  baseUrl: '',
  currentPhase: null,
  currentProbe: null,
  endpoints: [],
  collection: null,
  errorMessage: null,
  authRequired: false,
};

/**
 * Zustand store for the API Discovery feature.
 * Tracks real-time probe progress, discovered endpoints, and the final collection.
 */
export const useDiscoveryStore = create<DiscoveryStore>((set) => ({
  ...initialState,

  setBaseUrl: (baseUrl) => set({ baseUrl }),
  setStatus: (status) => set({ status }),
  setCurrentPhase: (phase) => set({ currentPhase: phase }),
  setCurrentProbe: (probe) => set({ currentProbe: probe }),

  addEndpoint: (endpoint) =>
    set((state) => ({
      endpoints: [
        ...state.endpoints,
        { ...endpoint, id: crypto.randomUUID() },
      ],
    })),

  setCollection: (collection) => set({ collection }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  setAuthRequired: (authRequired) => set({ authRequired }),

  reset: () => set({ ...initialState }),
}));
