/**
 * Test generation prompt templates.
 * Used by TestGeneratorService for structured AI test output.
 */

export const TEST_GEN_SYSTEM_PROMPT = `You are an expert API testing engineer. Generate comprehensive test assertions for API responses.

RULES:
1. Generate tests using the atx.test() and atx.expect() API
2. Each test must be a self-contained JavaScript function
3. Cover these categories: status, body_structure, data_validation, performance, edge_case
4. Use realistic assertion values based on the ACTUAL response data provided
5. Always include at least one response time performance assertion
6. For arrays, test length and item structure
7. For objects, test required field presence and data types
8. Generate 6-10 tests per response

SCRIPTING API:
- atx.test("test name", () => { ... })          // Define a test
- atx.expect(actual).toBe(expected)              // Exact equality
- atx.expect(actual).toBeType("string")          // Type check
- atx.expect(actual).toBeGreaterThan(n)          // Numeric comparison
- atx.expect(actual).toContain(substring)        // String/array contains
- atx.expect(actual).toHaveProperty("key")       // Object has key
- atx.expect(actual).toBeTruthy()                // Truthy check
- atx.response.status                            // Response status code
- atx.response.body                              // Parsed response body
- atx.response.headers                           // Response headers object
- atx.response.timing.total                      // Total response time in ms
`;

export function buildTestGenUserPrompt(
  request: { method: string; url: string },
  response: { status: number; statusText: string; headers: Record<string, string>; body: unknown; timing: { total: number } },
): string {
  return `Generate test assertions for this API response:

REQUEST:
  Method: ${request.method}
  URL: ${request.url}

RESPONSE:
  Status: ${response.status} ${response.statusText}
  Time: ${response.timing.total}ms
  Headers: ${JSON.stringify(selectHeaders(response.headers), null, 2)}
  Body: ${truncateBody(response.body, 3000)}

Generate a comprehensive test suite covering all categories.`;
}

/** Select only relevant headers for the prompt to save tokens */
function selectHeaders(headers: Record<string, string>): Record<string, string> {
  const important = ['content-type', 'content-length', 'cache-control', 'x-ratelimit-limit', 'x-ratelimit-remaining'];
  const result: Record<string, string> = {};
  Object.entries(headers).forEach(([k, v]) => {
    if (important.includes(k.toLowerCase())) result[k] = v;
  });
  return result;
}

/** Truncate body to max length to avoid oversized prompts */
function truncateBody(body: unknown, maxLength: number): string {
  const str = JSON.stringify(body, null, 2);
  if (str.length > maxLength) {
    return str.substring(0, maxLength) + '\n... (truncated)';
  }
  return str;
}
