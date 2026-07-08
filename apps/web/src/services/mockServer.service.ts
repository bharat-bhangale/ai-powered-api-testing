import { apiClient } from './api';
import { useMockServerStore } from '@/stores/mockServerStore';
import { useRequestStore } from '@/stores/requestStore';
import { toast } from 'sonner';

/**
 * Generate a mock server config from the selected collection.
 */
export async function generateMockServer(collectionId: string, port: number): Promise<void> {
  const store = useMockServerStore.getState();
  store.setState('generating');
  store.setErrorMessage(null);

  try {
    const res = await apiClient.post('/api/mock-server/generate', { collectionId, port });
    store.setState('ready');
    toast.success(`Mock config generated: ${res.data.data.routeCount} routes for ${res.data.data.resourceCount} resources`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Mock generation failed';
    store.setState('error');
    store.setErrorMessage(msg);
    toast.error(msg);
    throw err;
  }
}

/**
 * Start the mock server using the last generated config.
 */
export async function startMockServer(port: number): Promise<void> {
  const store = useMockServerStore.getState();
  store.setState('starting');

  try {
    const res = await apiClient.post('/api/mock-server/start', { port });
    store.setStatus(res.data.data.status);
    store.setEndpoints(res.data.data.endpoints);
    store.setState('running');
    toast.success(`Mock server running on port ${port}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to start mock server';
    store.setState('error');
    store.setErrorMessage(msg);
    toast.error(msg);
    throw err;
  }
}

/**
 * Stop the running mock server.
 */
export async function stopMockServer(): Promise<void> {
  const store = useMockServerStore.getState();
  store.setState('stopping');

  try {
    await apiClient.post('/api/mock-server/stop');
    store.setStatus({ isRunning: false, port: null, title: '', endpointCount: 0, startedAt: null });
    store.setState('idle');
    toast.info('Mock server stopped');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to stop mock server';
    store.setState('error');
    store.setErrorMessage(msg);
    toast.error(msg);
    throw err;
  }
}

/**
 * Fetch current mock server status and endpoint list.
 */
export async function fetchMockStatus(): Promise<void> {
  try {
    const res = await apiClient.get('/api/mock-server/status');
    const { status, endpoints } = res.data.data;
    useMockServerStore.getState().setStatus(status);
    useMockServerStore.getState().setEndpoints(endpoints);
    if (status.isRunning) {
      useMockServerStore.getState().setState('running');
    }
  } catch {
    // Silent — status polling failure is non-critical
  }
}

/**
 * "Test Endpoint" — sends a request to the mock server from the active ATX tab.
 * Sets the active tab's URL to the mock endpoint URL and clears the method/headers.
 */
export function testMockEndpoint(method: string, url: string): void {
  const store = useRequestStore.getState();
  store.updateUrl(url);
  store.updateMethod(method as Parameters<typeof store.updateMethod>[0]);
  toast.success(`Loaded ${method} ${url} into the active tab`);
}
