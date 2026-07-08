import { useAuthStore } from '@/stores/authStore';
import { useDiscoveryStore } from '@/stores/discoveryStore';
import { useCollectionStore } from '@/stores/collectionStore';
import { apiClient, getApiBaseUrl } from './api';
import { toast } from 'sonner';

/**
 * Start API discovery via SSE.
 * Connects to POST /api/discovery/start, parses SSE events,
 * and updates the discoveryStore in real-time.
 */
export async function startDiscovery(baseUrl: string): Promise<void> {
  const store = useDiscoveryStore.getState();
  store.reset();
  store.setBaseUrl(baseUrl);
  store.setStatus('discovering');

  const token = useAuthStore.getState().accessToken;
  const apiBase = getApiBaseUrl();

  const response = await fetch(`${apiBase}/api/discovery/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ baseUrl }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const message = errData?.error?.message || `HTTP ${response.status}`;
    store.setStatus('error');
    store.setErrorMessage(message);
    throw new Error(message);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    store.setStatus('error');
    store.setErrorMessage('No response body from server');
    return;
  }

  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE lines
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const event = JSON.parse(line.slice(6));
        handleDiscoveryEvent(event);
      } catch {
        // Skip malformed events
      }
    }
  }
}

/**
 * Stop the active discovery session.
 */
export async function stopDiscovery(): Promise<void> {
  try {
    await apiClient.post('/api/discovery/stop');
    useDiscoveryStore.getState().setStatus('stopped');
  } catch {
    useDiscoveryStore.getState().setStatus('stopped');
  }
}

/**
 * Save discovered collection to the user's collections.
 */
export async function saveDiscoveredCollection(): Promise<void> {
  const { collection } = useDiscoveryStore.getState();
  if (!collection) return;

  try {
    // Create the collection
    const collectionRes = await apiClient.post('/api/collections', {
      name: collection.collectionName,
      description: 'Auto-discovered by ATX API Reverse Engineer',
    });

    const collectionId: string = collectionRes.data.data._id || collectionRes.data.data.id;

    // Create folders and requests
    for (const folder of collection.folders) {
      // Create folder
      const folderRes = await apiClient.post(`/api/collections/${collectionId}/folders`, {
        name: folder.name,
      });
      const folderId: string = folderRes.data.data._id || folderRes.data.data.id;

      // Create requests inside the folder
      for (const req of folder.requests) {
        await apiClient.post('/api/requests', {
          collectionId,
          folderId,
          name: req.name,
          method: req.method.toUpperCase(),
          url: req.url,
          headers: [],
          params: [],
          body: { mode: 'none', content: '' },
          auth: { type: 'none' },
        });
      }
    }

    // Refresh collections sidebar
    await useCollectionStore.getState().fetchCollections();
    toast.success(`Collection "${collection.collectionName}" saved with ${collection.folders.reduce((n, f) => n + f.requests.length, 0)} requests`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to save collection';
    toast.error(msg);
    throw error;
  }
}

// ===== Event Handler =====

function handleDiscoveryEvent(event: { type: string; data: unknown }): void {
  const store = useDiscoveryStore.getState();

  switch (event.type) {
    case 'phase': {
      const d = event.data as { phase: number; description: string };
      store.setCurrentPhase({ phase: d.phase, description: d.description });
      break;
    }
    case 'probing': {
      const d = event.data as { url: string; method: string };
      store.setCurrentProbe({ url: d.url, method: d.method });
      break;
    }
    case 'discovered': {
      const d = event.data as { method: string; path: string; status: number; responseType: string; fieldCount: number };
      store.addEndpoint({
        method: d.method,
        path: d.path,
        status: d.status,
        responseType: d.responseType as 'array' | 'object' | 'string' | 'empty' | 'error',
        fieldCount: d.fieldCount,
      });
      break;
    }
    case 'complete': {
      const d = event.data as { totalEndpoints: number; collection: unknown };
      store.setCollection(d.collection as ReturnType<typeof useDiscoveryStore.getState>['collection'] & object);
      store.setStatus('complete');
      store.setCurrentProbe(null);
      break;
    }
    case 'stopped': {
      store.setStatus('stopped');
      store.setCurrentProbe(null);
      break;
    }
    case 'auth_required': {
      store.setAuthRequired(true);
      break;
    }
    case 'error': {
      const d = event.data as { url: string; error: string };
      console.warn('[Discovery] Probe error:', d.url, d.error);
      break;
    }
  }
}
