/**
 * Detailed timing breakdown for an HTTP response.
 */
export interface ResponseTiming {
    total: number;
    dns?: number;
    tcp?: number;
    tls?: number;
    ttfb?: number;
    download?: number;
}
/**
 * Parsed cookie from a response.
 */
export interface ResponseCookie {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: string;
    httpOnly?: boolean;
    secure?: boolean;
}
/**
 * Complete response data returned from the executor.
 */
export interface ResponseData {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    size: number;
    timing: ResponseTiming;
    cookies?: ResponseCookie[];
}
/**
 * Full result of a request execution — includes both the resolved request and the response.
 */
export interface ExecutionResult {
    success: boolean;
    request: {
        resolvedUrl: string;
        resolvedHeaders: Record<string, string>;
        resolvedBody: unknown;
    };
    response: ResponseData;
    error?: {
        code: string;
        message: string;
    };
    executedAt: string;
}
//# sourceMappingURL=response.types.d.ts.map