/**
 * Standard API success response.
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Standard API error detail.
 */
export interface ApiErrorDetail {
  code: string;
  message: string;
}

/**
 * Standard API error response.
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

/**
 * Unified API response — either success with data, or failure with error.
 * All API endpoints return this shape.
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Standard error codes used across the API.
 */
export const API_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SSRF_BLOCKED: 'SSRF_BLOCKED',
  EXECUTION_ERROR: 'EXECUTION_ERROR',
  AI_ERROR: 'AI_ERROR',
  AI_LIMIT_EXCEEDED: 'AI_LIMIT_EXCEEDED',
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

/**
 * Paginated list response wrapper.
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
