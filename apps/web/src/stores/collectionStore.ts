import { create } from 'zustand';
import { apiClient } from '../services/api';

// ===== Types =====

interface Folder {
  _id: string;
  name: string;
  parentFolderId: string | null;
  sortOrder: number;
}

interface SavedRequestSummary {
  _id: string;
  name: string;
  method: string;
  url: string;
  collectionId: string;
  folderId: string | null;
  sortOrder: number;
}

interface CollectionWithRequests {
  _id: string;
  name: string;
  description: string;
  folders: Folder[];
  requests: SavedRequestSummary[];
}

interface CollectionState {
  collections: CollectionWithRequests[];
  expandedIds: Set<string>;
  isLoading: boolean;
}

interface CollectionActions {
  fetchCollections: () => Promise<void>;
  createCollection: (name: string, description?: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  toggleExpanded: (id: string) => void;
  addFolder: (collectionId: string, name: string) => Promise<void>;
  deleteFolder: (collectionId: string, folderId: string) => Promise<void>;
}

type CollectionStore = CollectionState & CollectionActions;

// ===== Store =====

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  // State
  collections: [],
  expandedIds: new Set<string>(),
  isLoading: false,

  // Actions
  fetchCollections: async () => {
    set({ isLoading: true });
    try {
      // Get all collections
      const listRes = await apiClient.get('/api/collections');
      const collections = listRes.data.data.collections;

      // For each collection, fetch its requests
      const withRequests: CollectionWithRequests[] = await Promise.all(
        collections.map(async (col: { _id: string; name: string; description: string; folders: Folder[] }) => {
          try {
            const detailRes = await apiClient.get(`/api/collections/${col._id}`);
            return {
              ...col,
              requests: detailRes.data.data.requests || [],
            };
          } catch {
            return { ...col, requests: [] };
          }
        }),
      );

      set({ collections: withRequests, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createCollection: async (name: string, description?: string) => {
    await apiClient.post('/api/collections', { name, description });
    await get().fetchCollections();
  },

  deleteCollection: async (id: string) => {
    await apiClient.delete(`/api/collections/${id}`);
    const expandedIds = new Set(get().expandedIds);
    expandedIds.delete(id);
    set({ expandedIds });
    await get().fetchCollections();
  },

  toggleExpanded: (id: string) => {
    const expandedIds = new Set(get().expandedIds);
    if (expandedIds.has(id)) {
      expandedIds.delete(id);
    } else {
      expandedIds.add(id);
    }
    set({ expandedIds });
  },

  addFolder: async (collectionId: string, name: string) => {
    await apiClient.post(`/api/collections/${collectionId}/folders`, { name });
    await get().fetchCollections();
  },

  deleteFolder: async (collectionId: string, folderId: string) => {
    await apiClient.delete(`/api/collections/${collectionId}/folders/${folderId}`);
    await get().fetchCollections();
  },
}));
