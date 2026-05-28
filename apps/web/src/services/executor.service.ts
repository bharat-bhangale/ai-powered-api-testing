import { apiClient } from './api';
import type { ApiResponse } from '@shared/types/api.types';
import type {
  AuthConfig,
  RequestBodyConfig,
  KeyValuePair,
  ExecutionResponse,
} from '@/stores/requestStore';

interface ExecuteRequestParams {
  method: string;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: RequestBodyConfig;
  auth: AuthConfig;
  environmentId?: string | null;
  timeout?: number;
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

  const response = await apiClient.post<ApiResponse<ExecutionResponse>>('/api/execute', {
    ...config,
    url,
  });

  if (!response.data.success) {
    throw new Error(response.data.error.message);
  }

  return response.data.data;
}
