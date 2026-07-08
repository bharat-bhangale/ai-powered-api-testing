import { create } from 'zustand';
import { useTestRunnerStore } from './testRunnerStore';

/**
 * HTTP method type.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Key-value pair for headers, params, and form data.
 */
export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  description: string;
  enabled: boolean;
}

/**
 * Request body configuration.
 */
export interface RequestBodyConfig {
  mode: 'none' | 'json' | 'form-data' | 'urlencoded' | 'raw';
  content: string;
}

/**
 * Auth configuration for a request.
 */
export interface AuthConfig {
  type: 'none' | 'apikey' | 'bearer' | 'basic';
  apiKey?: { key: string; value: string; addTo: 'header' | 'query' };
  bearer?: { token: string };
  basic?: { username: string; password: string };
}

/**
 * Single request tab — holds all state for one request.
 */
export interface RequestTab {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: RequestBodyConfig;
  auth: AuthConfig;
  response: ExecutionResponse | null;
  isLoading: boolean;
  isDirty: boolean;
  savedRequestId?: string;
  savedCollectionId?: string;
}

/**
 * Execution response from the backend executor.
 */
export interface ExecutionResponse {
  success: boolean;
  request: {
    resolvedUrl: string;
    resolvedHeaders: Record<string, string>;
    resolvedBody: unknown;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    size: number;
    timing: {
      total: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
  executedAt: string;
}

/**
 * Zustand store for managing request tabs.
 */
interface RequestStore {
  tabs: RequestTab[];
  activeTabId: string | null;

  // Tab lifecycle
  addTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;

  // Update active tab fields
  updateMethod: (method: HttpMethod) => void;
  updateUrl: (url: string) => void;
  updateHeaders: (headers: KeyValuePair[]) => void;
  updateParams: (params: KeyValuePair[]) => void;
  updateBody: (body: RequestBodyConfig) => void;
  updateAuth: (auth: AuthConfig) => void;

  // Response + loading
  setResponse: (tabId: string, response: ExecutionResponse) => void;
  setLoading: (tabId: string, loading: boolean) => void;

  // AI Population
  populateFromAI: (config: {
    method: HttpMethod;
    url: string;
    headers: KeyValuePair[];
    params: KeyValuePair[];
    body: RequestBodyConfig;
    auth?: AuthConfig;
  }) => void;

  // Save/Load
  loadSavedRequest: (saved: {
    _id: string;
    name: string;
    method: string;
    url: string;
    collectionId: string;
    folderId: string | null;
    headers?: KeyValuePair[];
    params?: KeyValuePair[];
    body?: RequestBodyConfig;
    auth?: AuthConfig;
    testScript?: string;
    preRequestScript?: string;
  }) => void;
  markSaved: (tabId: string, savedRequestId: string, savedCollectionId: string) => void;
}

/**
 * Creates a fresh blank key-value pair.
 */
const createBlankPair = (): KeyValuePair => ({
  id: crypto.randomUUID(),
  key: '',
  value: '',
  description: '',
  enabled: true,
});

/**
 * Creates a new empty request tab with sensible defaults.
 */
const createNewTab = (): RequestTab => ({
  id: crypto.randomUUID(),
  name: 'Untitled Request',
  method: 'GET',
  url: '',
  headers: [createBlankPair()],
  params: [createBlankPair()],
  body: { mode: 'none', content: '' },
  auth: { type: 'none' },
  response: null,
  isLoading: false,
  isDirty: false,
});

/**
 * Helper to update a specific tab in the tabs array.
 */
const updateTab = (
  tabs: RequestTab[],
  activeTabId: string | null,
  updater: Partial<RequestTab>,
): RequestTab[] =>
  tabs.map((t) =>
    t.id === activeTabId ? { ...t, ...updater, isDirty: true } : t,
  );

export const useRequestStore = create<RequestStore>((set) => {
  const initialTab = createNewTab();

  return {
    tabs: [initialTab],
    activeTabId: initialTab.id,

    addTab: () => {
      const newTab = createNewTab();
      set((state) => ({
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
      }));
    },

    closeTab: (id) => {
      set((state) => {
        const filtered = state.tabs.filter((t) => t.id !== id);

        // Always keep at least one tab
        if (filtered.length === 0) {
          const freshTab = createNewTab();
          return { tabs: [freshTab], activeTabId: freshTab.id };
        }

        // If the closed tab was active, switch to the nearest tab
        const newActiveId =
          state.activeTabId === id
            ? filtered[
                Math.max(
                  0,
                  state.tabs.findIndex((t) => t.id === id) - 1,
                )
              ]?.id ?? filtered[0]?.id ?? null
            : state.activeTabId;

        return { tabs: filtered, activeTabId: newActiveId };
      });
    },

    setActiveTab: (id) => set({ activeTabId: id }),

    updateMethod: (method) => {
      set((state) => ({
        tabs: updateTab(state.tabs, state.activeTabId, { method }),
      }));
    },

    updateUrl: (url) => {
      set((state) => ({
        tabs: updateTab(state.tabs, state.activeTabId, { url }),
      }));
    },

    updateHeaders: (headers) => {
      set((state) => ({
        tabs: updateTab(state.tabs, state.activeTabId, { headers }),
      }));
    },

    updateParams: (params) => {
      set((state) => ({
        tabs: updateTab(state.tabs, state.activeTabId, { params }),
      }));
    },

    updateBody: (body) => {
      set((state) => ({
        tabs: updateTab(state.tabs, state.activeTabId, { body }),
      }));
    },

    updateAuth: (auth) => {
      set((state) => ({
        tabs: updateTab(state.tabs, state.activeTabId, { auth }),
      }));
    },

    setResponse: (tabId, response) => {
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === tabId ? { ...t, response, isLoading: false } : t,
        ),
      }));
    },

    setLoading: (tabId, loading) => {
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === tabId ? { ...t, isLoading: loading } : t,
        ),
      }));
    },

    populateFromAI: (config) => {
      set((state) => {
        const currentTab = state.tabs.find((t) => t.id === state.activeTabId);
        return {
          tabs: updateTab(state.tabs, state.activeTabId, {
            method: config.method,
            url: config.url,
            headers: config.headers,
            params: config.params,
            body: config.body,
            auth: config.auth || currentTab?.auth || { type: 'none' },
          }),
        };
      });
    },

    loadSavedRequest: (saved) => {
      set((state) => {
        // Check if this saved request is already open in a tab
        const existingTab = state.tabs.find(
          (t) => t.savedRequestId === saved._id,
        );
        if (existingTab) {
          return { activeTabId: existingTab.id };
        }

        // Create a new tab with the saved request data
        const newTab: RequestTab = {
          id: crypto.randomUUID(),
          name: saved.name,
          method: (saved.method as HttpMethod) || 'GET',
          url: saved.url || '',
          headers: saved.headers?.length ? saved.headers : [createBlankPair()],
          params: saved.params?.length ? saved.params : [createBlankPair()],
          body: saved.body || { mode: 'none', content: '' },
          auth: saved.auth || { type: 'none' },
          response: null,
          isLoading: false,
          isDirty: false,
          savedRequestId: saved._id,
          savedCollectionId: saved.collectionId,
        };

        return {
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
        };
      });

      // Load test script into testRunnerStore (outside Zustand set)
      if (saved.testScript) {
        useTestRunnerStore.getState().setScript(
          useRequestStore.getState().tabs.find((t) => t.savedRequestId === saved._id)?.id || '',
          saved.testScript,
        );
      }
    },

    markSaved: (tabId, savedRequestId, savedCollectionId) => {
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === tabId
            ? { ...t, isDirty: false, savedRequestId, savedCollectionId }
            : t,
        ),
      }));
    },
  };
});
