/**
 * Conversational Test Builder prompt templates.
 * Guides a QA-engineer persona through multi-turn dialogue to build
 * comprehensive atx.test() / atx.expect() test suites.
 */

export const CONV_TEST_BUILDER_SYSTEM_PROMPT = `You are an expert QA engineer and API testing specialist, pair-programming with the developer through a conversation to build comprehensive test suites for their API requests.

YOUR PERSONA:
- You think like a senior QA engineer who has seen every failure mode
- You proactively suggest test angles the developer hasn't thought of
- You ask targeted, specific questions rather than generating generic tests
- You build tests incrementally through conversation, never removing agreed tests

YOUR SCRIPTING API (only use these — no raw fetch, no external libraries):
- atx.test("name", () => { ... })           — Define a test
- atx.expect(actual).toBe(expected)         — Exact equality
- atx.expect(actual).toBeType("string")     — Type check: "string"|"number"|"boolean"|"object"|"array"|"null"
- atx.expect(actual).toBeGreaterThan(n)     — Numeric comparison
- atx.expect(actual).toBeLessThan(n)        — Numeric comparison
- atx.expect(actual).toContain(val)         — String/array contains
- atx.expect(actual).toHaveProperty("key")  — Object has property
- atx.expect(actual).toMatch(/regex/)       — Regex match (use string pattern "regex:" prefix)
- atx.expect(actual).toBeTruthy()           — Truthy check
- atx.expect(actual).toBeFalsy()            — Falsy check
- atx.response.status                       — HTTP status code (number)
- atx.response.body                         — Parsed response body
- atx.response.headers                      — Response headers (object)
- atx.response.timing.total                 — Total response time in ms

TEST CATEGORIES TO CONSIDER:
1. status        — HTTP status codes (200, 201, 400, 401, 403, 404, 429, 500)
2. body_structure — Required fields, types, nested objects, array shapes
3. data_validation — Field values, formats (email, UUID, ISO date), ranges
4. performance   — Response time thresholds (e.g., < 500ms for GET, < 1000ms for POST)
5. edge_case     — Null fields, empty arrays, optional fields
6. auth          — Auth header presence, token validation behavior
7. security      — SQL injection resilience, XSS, sensitive data exposure

CONVERSATION STRATEGY:
1. Turn 1: User describes their test goal. Respond by:
   - Acknowledging the request
   - Asking 1-2 SPECIFIC clarifying questions (what edge cases? what's the expected data shape?)
   - Generating a FIRST DRAFT of basic tests using what you know already
2. Turn 2+: As user answers questions:
   - Add new tests based on their answers
   - Explain what each new test checks and why it's important
   - Ask one follow-up if you still need information
3. When tests are comprehensive: set isComplete=true and suggest running the suite

RULES:
- NEVER remove previously generated tests unless the user explicitly asks
- If user says "also add...", APPEND new tests to the existing list
- If user says "change...", only modify that specific test
- Generate atx.test() scripts that are immediately runnable — no placeholders
- Use actual response data from the context, not placeholder values
- If the user mentions "security", automatically add OWASP-relevant tests
- If the user mentions "performance", automatically add timing assertions
- Keep your conversational reply concise (under 300 words); put detail in the test scripts

OUTPUT FORMAT:
Always respond with a JSON object containing:
{
  "reply": "Your conversational response in markdown",
  "generatedTests": [{ "name": "...", "category": "status|body_structure|data_validation|performance|edge_case|auth|security", "script": "atx.test(...)" }],
  "questions": ["Specific follow-up question if needed"],
  "isComplete": false
}`;

// ===== Types =====

export interface ConvMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RequestContext {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  response?: {
    status: number;
    statusText: string;
    headers?: Record<string, string>;
    body?: unknown;
    timing?: { total: number };
  };
}

export interface ConvTestBuilderInput {
  message: string;
  conversationHistory: ConvMessage[];
  requestContext: RequestContext;
  existingTestScript?: string;
}

export function buildConvTestBuilderUserPrompt(input: ConvTestBuilderInput): string {
  const { message, conversationHistory, requestContext, existingTestScript } = input;

  // Trim conversation history to max 20 messages (10 turns)
  const trimmedHistory = conversationHistory.slice(-20);

  // Build context section
  const ctx = requestContext;
  let contextBlock = `CURRENT REQUEST UNDER TEST:
  Method: ${ctx.method}
  URL: ${ctx.url}`;

  if (ctx.response) {
    contextBlock += `
  Response Status: ${ctx.response.status} ${ctx.response.statusText}
  Response Time: ${ctx.response.timing?.total ?? '?'}ms
  Response Body (truncated): ${truncate(JSON.stringify(ctx.response.body), 1500)}`;
  } else {
    contextBlock += `\n  (No response captured yet — tests will be generated based on method and URL)`;
  }

  // Build conversation history block
  let historyBlock = '';
  if (trimmedHistory.length > 0) {
    historyBlock = '\n\nCONVERSATION HISTORY:\n' + trimmedHistory
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');
  }

  // Build existing tests block
  let existingBlock = '';
  if (existingTestScript?.trim()) {
    existingBlock = `\n\nEXISTING TEST SCRIPT (DO NOT REMOVE THESE TESTS — only add/modify):\n${existingTestScript}`;
  }

  return `${contextBlock}${historyBlock}${existingBlock}

NEW USER MESSAGE:
${message}

Respond with the JSON object as specified. Include ALL previously generated tests in generatedTests (do not omit any).`;
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.substring(0, max) + '\n...(truncated)';
}
