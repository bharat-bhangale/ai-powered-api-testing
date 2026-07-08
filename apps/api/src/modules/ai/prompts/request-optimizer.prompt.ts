/**
 * Request Optimizer prompt templates.
 * AI proactively analyzes request config + response and returns scored improvement suggestions.
 */

export const REQUEST_OPTIMIZER_SYSTEM_PROMPT = `You are an expert API engineer and security consultant.
Your job is to analyze an HTTP request configuration and its response, then provide specific, actionable optimization suggestions.

OPTIMIZATION CATEGORIES:

HEADERS:
- Missing Content-Type for POST/PUT/PATCH requests with body
- Missing Accept header (specify expected format)
- Missing Accept-Encoding: gzip,deflate,br (enables compression)
- Sensitive data in Authorization header being logged (suggest bearer token format)
- Missing X-Request-ID for traceability

PERFORMANCE:
- Large response size (>50KB) without pagination params — suggest ?page=1&limit=50
- No ETag/If-None-Match for GET requests (missed caching opportunity)
- Missing Cache-Control header for read-heavy endpoints
- Downloading all fields when subset needed (suggest field selection params like ?fields=id,name)

SECURITY:
- API key in URL query params (visible in server logs — move to Authorization header)
- HTTP instead of HTTPS (man-in-the-middle risk)
- Missing Authorization for endpoints that returned 401 (add auth header)
- Credentials (password, secret, token) visible in URL params

BEST PRACTICES:
- Using POST when PATCH is semantically more correct (partial updates)
- Inconsistent URL casing (mixing camelCase and snake_case in params)
- Missing idempotency key (Idempotency-Key header) for POST financial/critical endpoints
- Response contains pagination but request doesn't include page params
- URL ends with .json or has format param — prefer Accept header instead

CORRECTNESS:
- Status 405 (Method Not Allowed) — wrong HTTP method
- Status 415 (Unsupported Media Type) — Content-Type mismatch
- Status 401 — missing or invalid auth
- Status 400 with body present — malformed request body likely

SCORING GUIDE:
100 = Perfect request configuration
-15 per critical issue (security risk, correctness error)
-8 per warning (missing important header, performance concern)
-3 per info suggestion (best practice, minor improvement)

RULES:
1. Only report genuine issues — do NOT flag correctly configured requests
2. Be specific — reference actual header names, status codes, response sizes
3. autoFixable=true ONLY for: add_header, add_param — never body modifications
4. Max 10 suggestions total
5. Prioritize CRITICAL security issues first`;

// ===== Input Types =====

export interface OptimizerInput {
  request: {
    method: string;
    url: string;
    headers: Array<{ key: string; value: string; enabled: boolean }>;
    params: Array<{ key: string; value: string; enabled: boolean }>;
    body: { mode: string; content: string };
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    bodyPreview: string;    // Truncated to 2000 chars
    size: number;
    timing: number;
  };
}

// ===== Prompt Builder =====

export function buildOptimizerPrompt(input: OptimizerInput): string {
  const enabledHeaders = input.request.headers
    .filter((h) => h.enabled && h.key)
    .map((h) => `  ${h.key}: ${h.value}`).join('\n');

  const enabledParams = input.request.params
    .filter((p) => p.enabled && p.key)
    .map((p) => `  ${p.key}=${p.value}`).join('\n');

  const responseHeaderSummary = Object.entries(input.response.headers)
    .slice(0, 15)
    .map(([k, v]) => `  ${k}: ${v}`).join('\n');

  return `Analyze this API request and provide optimization suggestions.

REQUEST:
  Method: ${input.request.method}
  URL: ${input.request.url}
  Body mode: ${input.request.body.mode}
${enabledHeaders ? `\nRequest Headers:\n${enabledHeaders}` : '  No custom headers'}
${enabledParams ? `\nQuery Params:\n${enabledParams}` : ''}

RESPONSE:
  Status: ${input.response.status} ${input.response.statusText}
  Size: ${(input.response.size / 1024).toFixed(1)}KB
  Time: ${input.response.timing}ms
  
Response Headers:
${responseHeaderSummary || '  (none)'}

Response Body Preview (first 1000 chars):
${input.response.bodyPreview.substring(0, 1000) || '(empty)'}

Analyze the above and return optimization suggestions. For each issue found:
- Be specific about the EXACT header name, param name, or URL pattern
- Only mark autoFixable=true if the fix is adding a header or query param (safe, non-destructive)
- Include fix.type, fix.key, fix.value for autoFixable suggestions
- Calculate a realistic quality score (0-100)

Return valid JSON only.`;
}
