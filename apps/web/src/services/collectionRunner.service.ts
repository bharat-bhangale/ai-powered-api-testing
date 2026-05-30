import { apiClient } from './api';

// ===== Types =====

export interface RunTestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export interface RunProgressData {
  requestIndex: number;
  total: number;
  requestName: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  timing: number;
  size: number;
  testResults: RunTestResult[];
  totalPassed: number;
  totalFailed: number;
  error?: string;
}

export interface RunCompleteData {
  runId: string;
  totalRequests: number;
  completedRequests: number;
  totalTestsPassed: number;
  totalTestsFailed: number;
  totalDuration: number;
  status: 'completed' | 'failed' | 'cancelled';
}

export interface RunEvent {
  type: 'progress' | 'complete' | 'error';
  data: RunProgressData | RunCompleteData | { message: string };
}

export interface TestRunRecord {
  _id: string;
  collectionId: string;
  collectionName: string;
  status: string;
  summary: {
    totalRequests: number;
    completedRequests: number;
    totalTestsPassed: number;
    totalTestsFailed: number;
    totalDuration: number;
  };
  startedAt: string;
  completedAt?: string;
}

// ===== SSE Connection =====

/**
 * Starts a collection run via SSE.
 * Returns a function to abort the connection.
 */
export function startCollectionRun(
  collectionId: string,
  environmentId: string | null,
  onEvent: (event: RunEvent) => void,
  onError: (error: string) => void,
): () => void {
  const abortController = new AbortController();

  const run = async () => {
    try {
      const response = await fetch(
        `${apiClient.defaults.baseURL}/api/collections/${collectionId}/run`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
          body: JSON.stringify({ environmentId }),
          signal: abortController.signal,
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = (errorData as { error?: { message?: string } })?.error?.message || 'Failed to start run';
        onError(errMsg);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError('SSE stream not available');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.substring(6)) as RunEvent;
              onEvent(parsed);
            } catch {
              // Skip malformed SSE data
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        onError(err instanceof Error ? err.message : 'Connection lost');
      }
    }
  };

  run();

  return () => abortController.abort();
}

/**
 * Stops an active collection run.
 */
export async function stopCollectionRun(collectionId: string): Promise<void> {
  await apiClient.post(`/api/collections/${collectionId}/run/stop`);
}

/**
 * Fetches run history for a collection.
 */
export async function getRunHistory(collectionId: string, limit = 20): Promise<TestRunRecord[]> {
  const res = await apiClient.get(`/api/collections/${collectionId}/runs`, {
    params: { limit },
  });
  return res.data.data;
}
