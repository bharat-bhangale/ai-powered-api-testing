import type { HttpMethod } from '@atx/shared';
/**
 * Color mapping for HTTP methods — used for badges and labels.
 */
export declare const METHOD_COLORS: Record<HttpMethod, string>;
/**
 * Ordered list of all supported HTTP methods.
 */
export declare const HTTP_METHODS: HttpMethod[];
/**
 * Status code range classification.
 */
export type StatusRange = 'info' | 'success' | 'redirect' | 'client_error' | 'server_error' | 'unknown';
/**
 * Classifies an HTTP status code into a range category.
 */
export declare function getStatusRange(status: number): StatusRange;
/**
 * Color mapping for status code ranges — used for badges.
 */
export declare const STATUS_RANGE_COLORS: Record<StatusRange, string>;
