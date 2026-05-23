import type { HttpMethod } from '@atx/shared';

/**
 * Color mapping for HTTP methods — used for badges and labels.
 */
export const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: '#22c55e',
  POST: '#f97316',
  PUT: '#3b82f6',
  PATCH: '#a855f7',
  DELETE: '#ef4444',
  HEAD: '#06b6d4',
  OPTIONS: '#6b7280',
};

/**
 * Ordered list of all supported HTTP methods.
 */
export const HTTP_METHODS: HttpMethod[] = [
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS',
];

/**
 * Status code range classification.
 */
export type StatusRange = 'info' | 'success' | 'redirect' | 'client_error' | 'server_error' | 'unknown';

/**
 * Classifies an HTTP status code into a range category.
 */
export function getStatusRange(status: number): StatusRange {
  if (status >= 100 && status < 200) return 'info';
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'redirect';
  if (status >= 400 && status < 500) return 'client_error';
  if (status >= 500 && status < 600) return 'server_error';
  return 'unknown';
}

/**
 * Color mapping for status code ranges — used for badges.
 */
export const STATUS_RANGE_COLORS: Record<StatusRange, string> = {
  info: '#06b6d4',
  success: '#22c55e',
  redirect: '#3b82f6',
  client_error: '#f97316',
  server_error: '#ef4444',
  unknown: '#6b7280',
};
