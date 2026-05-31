/**
 * Suite generation prompt templates.
 * Used by SuiteGeneratorService for collection-level AI test suite generation.
 */

export const SUITE_GEN_SYSTEM_PROMPT = `You are an expert API test automation engineer. You are given ALL endpoints in an API collection and must generate a COMPREHENSIVE test suite.

RULES:
1. Generate tests using the atx.test() and atx.expect() API
2. Each test must be a self-contained JavaScript function
3. Generate PER-ENDPOINT tests: status validation, response schema, data integrity, performance
4. Generate CROSS-ENDPOINT chain tests: CRUD flows that validate create → read → verify → update → verify → delete → verify-deleted
5. For chain tests, each step references a specific request by name and validates the flow
6. Use realistic assertion values based on the ACTUAL response data provided
7. Score test coverage from 0-100 and identify gaps

SCRIPTING API:
- atx.test("test name", () => { ... })          // Define a test
- atx.expect(actual).toBe(expected)              // Exact equality
- atx.expect(actual).toEqual(expected)            // Deep equality
- atx.expect(actual).toBeType("string")          // Type check
- atx.expect(actual).toBeArray()                  // Array check
- atx.expect(actual).toHaveLength(n)              // Length check
- atx.expect(actual).toBeGreaterThan(n)          // Numeric comparison
- atx.expect(actual).toBeLessThan(n)             // Numeric comparison
- atx.expect(actual).toContain(substring)        // String/array contains
- atx.expect(actual).toHaveProperty("key")       // Object has key
- atx.expect(actual).toMatch(/regex/)            // Regex match
- atx.expect(actual).toMatchSchema(schema)       // Schema validation
- atx.expect(actual).toBeTruthy()                // Truthy check
- atx.expect(actual).toBeFalsy()                 // Falsy check
- atx.expect(actual).not.toBe(value)             // Negation
- atx.response.status                            // Response status code
- atx.response.statusText                        // Response status text
- atx.response.body                              // Parsed response body
- atx.response.headers                           // Response headers object
- atx.response.timing.total                      // Total response time in ms
- atx.response.size                              // Response size in bytes
- atx.variables.get("name")                      // Get chain variable
- atx.variables.set("name", value)               // Set chain variable for next request

CHAIN TEST STRATEGY:
- For CRUD APIs: create a resource → read it → update it → read again → delete → verify 404
- For auth APIs: register → login → use token → refresh → verify
- Use atx.variables.set/get to pass data between chain steps
- Each chain test step is bound to a specific request name

OUTPUT QUALITY:
- Generate 5-10 tests per endpoint
- Generate 1-3 chain tests if CRUD patterns are detected
- Coverage score reflects how many endpoints and scenarios are tested
- Gaps identify untested scenarios (e.g., "no error case test for POST /users")
`;

/**
 * Build the user prompt for suite generation.
 * Includes all endpoints in the collection with their saved responses.
 */
export function buildSuiteGenUserPrompt(
  collectionName: string,
  endpoints: Array<{
    requestId: string;
    requestName: string;
    method: string;
    url: string;
    body?: { mode: string; content: string };
    responseStatus?: number;
    responseBody?: string;
  }>,
): string {
  let prompt = `Generate a comprehensive test suite for the "${collectionName}" API collection.\n\n`;
  prompt += `Total endpoints: ${endpoints.length}\n\n`;
  prompt += `ENDPOINTS:\n`;

  for (const ep of endpoints) {
    prompt += `\n--- ${ep.method} ${ep.url} (name: "${ep.requestName}") ---\n`;
    prompt += `Request ID: ${ep.requestId}\n`;

    if (ep.body?.mode === 'json' && ep.body?.content) {
      const bodyStr = ep.body.content.length > 500
        ? ep.body.content.substring(0, 500) + '... (truncated)'
        : ep.body.content;
      prompt += `Request Body: ${bodyStr}\n`;
    }

    if (ep.responseStatus) {
      prompt += `Last Response Status: ${ep.responseStatus}\n`;
    }

    if (ep.responseBody) {
      prompt += `Last Response Body: ${ep.responseBody}\n`;
    }
  }

  prompt += `\nGenerate per-endpoint tests AND cross-endpoint chain tests if CRUD patterns are detected.`;
  prompt += `\nAnalyze all endpoints together to find relationships and dependent flows.`;

  return prompt;
}
