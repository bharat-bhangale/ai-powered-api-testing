import { create } from 'zustand';

// ===== Types =====

export interface MockEndpointInfo {
  method: string;
  path: string;
  url: string;
  successStatus: number;
  stateful: boolean;
  paginatable: boolean;
}

export interface MockServerStatus {
  isRunning: boolean;
  port: number | null;
  title: string;
  endpointCount: number;
  startedAt: string | null;
}

export type MockGenerationState = 'idle' | 'generating' | 'ready' | 'starting' | 'running' | 'stopping' | 'error';

interface MockServerStore {
  // State
  state: MockGenerationState;
  status: MockServerStatus;
  endpoints: MockEndpointInfo[];
  errorMessage: string | null;
  selectedCollectionId: string;
  port: number;

  // Settings
  errorSimulationEnabled: boolean;
  defaultDelayMs: number;

  // Actions
  setState: (s: MockGenerationState) => void;
  setStatus: (status: MockServerStatus) => void;
  setEndpoints: (endpoints: MockEndpointInfo[]) => void;
  setErrorMessage: (msg: string | null) => void;
  setSelectedCollectionId: (id: string) => void;
  setPort: (port: number) => void;
  setErrorSimulation: (enabled: boolean) => void;
  setDefaultDelay: (ms: number) => void;
  reset: () => void;
}

const initialStatus: MockServerStatus = {
  isRunning: false,
  port: null,
  title: '',
  endpointCount: 0,
  startedAt: null,
};

/**
 * MockServerStore — manages the frontend state for the AI Smart Mock Server.
 * Tracks generation/running state, endpoint list, and configuration settings.
 */
export const useMockServerStore = create<MockServerStore>((set) => ({
  state: 'idle',
  status: initialStatus,
  endpoints: [],
  errorMessage: null,
  selectedCollectionId: '',
  port: 3001,
  errorSimulationEnabled: false,
  defaultDelayMs: 0,

  setState: (state) => set({ state }),
  setStatus: (status) => set({ status }),
  setEndpoints: (endpoints) => set({ endpoints }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  setSelectedCollectionId: (selectedCollectionId) => set({ selectedCollectionId }),
  setPort: (port) => set({ port }),
  setErrorSimulation: (errorSimulationEnabled) => set({ errorSimulationEnabled }),
  setDefaultDelay: (defaultDelayMs) => set({ defaultDelayMs }),
  reset: () => set({ state: 'idle', status: initialStatus, endpoints: [], errorMessage: null }),
}));
