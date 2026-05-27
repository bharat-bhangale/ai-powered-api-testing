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
export declare const API_ERROR_CODES: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly AUTH_ERROR: "AUTH_ERROR";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly RATE_LIMITED: "RATE_LIMITED";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly SSRF_BLOCKED: "SSRF_BLOCKED";
    readonly EXECUTION_ERROR: "EXECUTION_ERROR";
    readonly AI_ERROR: "AI_ERROR";
    readonly AI_LIMIT_EXCEEDED: "AI_LIMIT_EXCEEDED";
};
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
//# sourceMappingURL=api.types.d.ts.map