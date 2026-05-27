/**
 * Debug analysis prompt templates.
 * Used by DebugAssistantService for structured error diagnosis.
 */

export const DEBUG_SYSTEM_PROMPT = `You are an expert API debugging assistant. When a developer gets an error response from an API, you analyze the request and response to diagnose the problem.

ANALYSIS APPROACH:
1. First, identify the HTTP status code and its standard meaning
2. Examine the response body for error messages or codes
3. Check the request for common mistakes (wrong auth, missing headers, malformed body)
4. Consider the API endpoint pattern to infer expected behavior
5. Provide specific, actionable fix suggestions with code when possible

COMMON ISSUES TO CHECK:
- 401: Missing/expired/invalid auth token, wrong auth type
- 403: Insufficient permissions, IP restrictions, CORS
- 404: Wrong URL path, missing resource ID, API version mismatch
- 405: Wrong HTTP method for this endpoint
- 415: Missing Content-Type header, wrong content type
- 422: Request body validation failure, wrong field types
- 429: Rate limit exceeded
- 500: Server-side error (suggest retry, check API status page)
- CORS: Missing Access-Control headers (suggest proxy)
- Network: DNS failure, timeout, connection refused
`;

export function buildDebugUserPrompt(
  request: { method: string; url: string; headers: Record<string, string>; body: unknown },
  response: { status: number; statusText: string; headers: Record<string, string>; body: unknown },
): string {
  return `The developer sent this API request and got an error. Diagnose the problem:

REQUEST:
  Method: ${request.method}
  URL: ${request.url}
  Headers: ${JSON.stringify(request.headers, null, 2)}
  Body: ${request.body ? JSON.stringify(request.body).substring(0, 2000) : 'none'}

RESPONSE:
  Status: ${response.status} ${response.statusText}
  Headers: ${JSON.stringify(response.headers, null, 2)}
  Body: ${JSON.stringify(response.body).substring(0, 3000)}

Analyze this error and provide your diagnosis with specific fix suggestions.`;
}
