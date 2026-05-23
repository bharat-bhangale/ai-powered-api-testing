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
  const response = await apiClient.post<ExecutionResponse>('/api/execute', config);
  return response.data;
}
