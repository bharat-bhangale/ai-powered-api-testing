import { create } from 'zustand';
import { apiClient } from '@/services/api';

// ===== Types =====

export interface HistoryEntry {
  _id: string;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: unknown;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    size: number;
    timing: { total: number };
  };
  environmentName?: string;
  executedAt: string;
}

interface HistoryStore {
  entries: HistoryEntry[];
  isLoading: boolean;
  page: number;
  hasMore: boolean;
  search: string;
  methodFilter: string | null;
  statusFilter: string | null;

  fetchHistory: () => Promise<void>;
  loadMore: () => Promise<void>;
  setSearch: (search: string) => void;
  setMethodFilter: (method: string | null) => void;
  setStatusFilter: (status: string | null) => void;
  clearHistory: () => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}

/**
 * History store — manages paginated, filterable request history.
 */
export const useHistoryStore = create<HistoryStore>((set, get) => ({
  entries: [],
  isLoading: false,
  page: 1,
  hasMore: true,
  search: '',
  methodFilter: null,
  statusFilter: null,

  fetchHistory: async () => {
    set({ isLoading: true, page: 1 });
    try {
      const { search, methodFilter, statusFilter } = get();
      const params: Record<string, string | number> = { page: 1, limit: 50 };
      if (search) params.search = search;
      if (methodFilter) params.method = methodFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get('/api/history', { params });
      set({
        entries: res.data.data.items,
        hasMore: res.data.data.page < res.data.data.totalPages,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  loadMore: async () => {
    const { page, hasMore, search, methodFilter, statusFilter } = get();
    if (!hasMore) return;

    const nextPage = page + 1;
    const params: Record<string, string | number> = { page: nextPage, limit: 50 };
    if (search) params.search = search;
    if (methodFilter) params.method = methodFilter;
    if (statusFilter) params.status = statusFilter;

    try {
      const res = await apiClient.get('/api/history', { params });
      set({
        entries: [...get().entries, ...res.data.data.items],
        page: nextPage,
        hasMore: nextPage < res.data.data.totalPages,
      });
    } catch { /* silently fail */ }
  },

  setSearch: (search) => {
    set({ search });
    get().fetchHistory();
  },

  setMethodFilter: (method) => {
    set({ methodFilter: method });
    get().fetchHistory();
  },

  setStatusFilter: (status) => {
    set({ statusFilter: status });
    get().fetchHistory();
  },

  clearHistory: async () => {
    try {
      await apiClient.delete('/api/history');
      set({ entries: [], page: 1, hasMore: false });
    } catch { /* handled by caller */ }
  },

  deleteEntry: async (id) => {
    try {
      await apiClient.delete(`/api/history/${id}`);
      set({ entries: get().entries.filter((e) => e._id !== id) });
    } catch { /* handled by caller */ }
  },
}));
