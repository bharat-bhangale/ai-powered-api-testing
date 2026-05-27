import { apiClient } from './api';
import type { RequestBodyConfig, KeyValuePair, ExecutionResponse } from '@/stores/requestStore';

interface ExecuteRequestParams {
  method: string;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: RequestBodyConfig;
}

/**
 * Sends a request configuration to the backend executor.
 * The backend makes the actual HTTP call (avoids CORS issues).
 */
export async function executeRequest(config: ExecuteRequestParams): Promise<ExecutionResponse> {
  // Auto-prepend https:// if no protocol specified
  let url = config.url.trim();
  if (url && !/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  const response = await apiClient.post<ExecutionResponse>('/api/execute', { ...config, url });
  return response.data;
}
