# Phase 3 — Master AI Prompts for Building Unique Features

## Copy-Paste Prompts for Claude Opus 4.6 / Gemini in Antigravity IDE

---

## Table of Contents

1. [Prompt Structure & Usage Guide](#1-prompt-structure--usage-guide)
2. [Tier 1 Prompts: AI Autopilot (U1–U4)](#2-tier-1-prompts-ai-autopilot)
3. [Tier 2 Prompts: AI Intelligence (U5–U8)](#3-tier-2-prompts-ai-intelligence)
4. [Tier 3 Prompts: AI Security & Resilience (U9–U12)](#4-tier-3-prompts-ai-security--resilience)
5. [Desktop App Adaptation Notes](#5-desktop-app-adaptation-notes)
6. [Prompt Execution Order](#6-prompt-execution-order)

---

## 1. Prompt Structure & Usage Guide

### How to Use These Prompts

1. **Copy the entire prompt block** (everything inside the ``` markers)
2. **Paste into your AI coding assistant** (Antigravity IDE with Claude Opus 4.6, Cursor, or any AI IDE)
3. **Wait for the implementation plan** → review → approve
4. **Let the AI implement** → verify → commit

### Important Notes

- Each prompt is self-contained with full context
- Prompts reference skill files with `@[path]` — ensure skills exist first
- For the **Desktop App**: Replace `apps/web` with `src/renderer` and `apps/api` with `src/main` (see Section 5)
- Prompts are designed for both web app and desktop app — the AI services are identical

---

## 2. Tier 1 Prompts: AI Autopilot

### Prompt U1: Natural Language → API Request Conversion

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/prompt-engineering.md]

GOAL: Build the "Natural Language to API Request" feature — user types a plain English description of what they want to do, and AI converts it into a complete, ready-to-send API request.

BACKEND FILES TO CREATE:
- apps/api/src/modules/ai/features/nl-to-request.service.ts — Service that takes natural language + collection context and returns a structured request config
- apps/api/src/modules/ai/prompts/nl-to-request.prompt.ts — System prompt that instructs AI to convert natural language to API request config

BACKEND FILES TO MODIFY:
- apps/api/src/modules/ai/ai.controller.ts — Add POST /api/ai/nl-to-request endpoint
- apps/api/src/modules/ai/ai.routes.ts — Register the new route

FRONTEND FILES TO CREATE:
- apps/web/src/components/ai/NLRequestBar.tsx + .module.css — Input bar with sparkle icon above the URL bar. User types natural language, presses Enter or clicks "Generate"
- apps/web/src/components/ai/NLRequestPreview.tsx + .module.css — Preview panel showing the generated request with Accept/Edit/Discard buttons
- apps/web/src/hooks/useNLRequest.ts — Hook managing the NL→Request flow: submit text → call API → show preview → on accept, populate request builder

FRONTEND FILES TO MODIFY:
- apps/web/src/components/request-builder/RequestBuilder.tsx — Add NLRequestBar above the method+URL row
- apps/web/src/stores/requestStore.ts — Add populateFromAI(config) action that sets method, URL, headers, params, body from AI output

SPEC:
- NLRequestBar: Input with placeholder "✨ Describe your API request in plain English..."
  Keyboard: Enter submits, Escape clears. Shows loading spinner while AI processes.
  Position: Above the URL bar, collapsible (toggle with Ctrl+Shift+A or ✨ button)

- Backend service receives:
  {
    naturalLanguage: string,           // User's description
    collectionContext: {               // Existing requests for context
      requests: [{ method, url }],     // Max 20 requests (method + URL only)
      baseUrl?: string                 // Inferred from collection
    },
    environmentVariables: string[]     // Variable names only (not values)
  }

- Backend returns structured output (Zod schema):
  {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,                       // Full URL or {{base_url}}/path
    headers: [{ key: string, value: string }],
    queryParams: [{ key: string, value: string }],
    body: object | null,               // JSON body for POST/PUT/PATCH
    bodyType: 'none' | 'json' | 'form-data',
    authSuggestion: 'none' | 'bearer' | 'api-key' | 'basic',
    explanation: string                // AI explains what it generated and why
  }

- NLRequestPreview: Shows formatted preview with syntax highlighting
  Buttons: "✅ Use This Request" (populates builder) | "✏️ Edit" (switches to manual mode with values pre-filled) | "🗑️ Discard"

- AI prompt should instruct:
  1. Analyze the user's natural language intent
  2. Use collection context to infer URL patterns, base URL, naming conventions
  3. Use environment variable names to suggest {{variable}} placeholders where appropriate
  4. Generate appropriate Content-Type headers for POST/PUT
  5. If the intent is unclear, ask a clarifying question instead of guessing
  6. Generate body fields based on common API patterns for the resource type

CONSTRAINTS:
- NL input max length: 500 characters
- AI must return valid JSON — use completeStructured() with Zod schema
- Don't send environment variable VALUES to AI — only names (security)
- Collection context: send max 20 requests (method + URL only) to keep tokens low
- If AI cannot determine the intent, return { method: 'GET', url: '', explanation: 'Could not determine...' }
- Must work without collection context (e.g., new user with empty collection)

REFERENCE: apps/api/src/modules/ai/features/test-generator.service.ts for AI service pattern
```

---

### Prompt U2: AI Conversational Test Builder

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/test-runner-context.md]
@[.agent/skills/prompt-engineering.md]

GOAL: Build the "AI Conversational Test Builder" — a multi-turn chat interface where the user describes test scenarios in English and AI builds complete atx.test() scripts through back-and-forth refinement.

BACKEND FILES TO CREATE:
- apps/api/src/modules/ai/features/conversational-test-builder.service.ts — Multi-turn conversation service that maintains test-building context
- apps/api/src/modules/ai/prompts/conversational-test-builder.prompt.ts — System prompt for the test-building conversation

BACKEND FILES TO MODIFY:
- apps/api/src/modules/ai/ai.controller.ts — Add POST /api/ai/test-builder/message endpoint (accepts message + conversation history)
- apps/api/src/modules/ai/ai.routes.ts — Register route

FRONTEND FILES TO CREATE:
- apps/web/src/components/ai/TestBuilderChat.tsx + .module.css — Chat panel specifically for test building, separate from general AI chat. Shows conversation + generated test preview
- apps/web/src/components/ai/TestBuilderPreview.tsx + .module.css — Live preview of the test script being built, updates as conversation progresses
- apps/web/src/stores/testBuilderStore.ts — Zustand: conversationHistory[], generatedTests[], currentTestScript, addMessage(), clearConversation()

SPEC:
- TestBuilderChat: Split panel — left side is chat, right side is live test preview
  Chat input: "Describe what you want to test..."
  AI responds with: questions for clarification + generated test scripts
  Each AI response can include a test script block that updates the preview panel

- Multi-turn conversation flow:
  Turn 1: User describes high-level test scenario
  Turn 2: AI asks clarifying questions (what endpoint? edge cases? auth checks?)
  Turn 3: User answers → AI generates first version of test suite
  Turn 4: User requests changes ("also add a timeout test", "check for 429 rate limit")
  Turn 5: AI updates the test suite incrementally

- Backend service:
  Input: {
    message: string,
    conversationHistory: [{ role: 'user' | 'assistant', content: string }],
    requestContext: { method, url, headers, body, response },
    existingTestScript?: string
  }
  Output: {
    reply: string,                    // AI's conversational response (markdown)
    generatedTests: [{                // Current state of generated tests
      name: string,
      category: string,
      script: string                  // atx.test() code
    }],
    questions: string[],              // Follow-up questions AI wants to ask
    isComplete: boolean               // True when AI thinks test suite is comprehensive
  }

- TestBuilderPreview: Monaco editor (read-only) showing the composite test script
  Updates live as AI adds/modifies tests in conversation
  "Copy Script" and "Save to Request" buttons at bottom
  Shows test count: "7 tests generated"

- AI system prompt should instruct:
  1. Act as a QA engineer pair-programming with the user
  2. Proactively suggest test categories: status codes, body structure, error handling, auth, performance, edge cases, security
  3. Ask specific questions instead of generating generic tests
  4. Generate atx.test() and atx.expect() scripts that are immediately runnable
  5. If user mentions "security", generate OWASP-relevant tests
  6. If user mentions "performance", generate timing assertions
  7. Track which tests have been agreed upon — never remove tests unless user asks
  8. When isComplete=true, suggest running the full suite

CONSTRAINTS:
- Conversation history max: 20 messages (trim oldest if exceeded)
- Each AI response should be under 1500 tokens
- Test scripts must use atx.test() and atx.expect() API exclusively
- Store conversation in memory (testBuilderStore) — not persisted to DB
- Conversation is scoped to one request — switching tabs clears the conversation

REFERENCE:
- apps/api/src/modules/ai/features/chat.service.ts for streaming conversation pattern
- apps/web/src/components/ai/AIChatPanel.tsx for chat UI pattern
```

---

### Prompt U3: AI API Reverse Engineer

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/test-runner-context.md]

GOAL: Build the "AI API Reverse Engineer" — given a base API URL, AI intelligently probes common REST endpoint patterns, analyzes responses, discovers the full API surface, and builds a complete collection.

BACKEND FILES TO CREATE:
- apps/api/src/modules/ai/features/api-reverse-engineer.service.ts — Orchestrator: generates probe URLs → executes them → analyzes responses → discovers more endpoints → builds collection
- apps/api/src/modules/ai/prompts/api-reverse-engineer.prompt.ts — System prompt for analyzing responses and suggesting next endpoints to probe
- apps/api/src/modules/api-discovery/api-discovery.service.ts — Executes probe requests safely with rate limiting and timeout
- apps/api/src/modules/api-discovery/api-discovery.controller.ts — POST /api/discovery/start (SSE endpoint for streaming progress) + POST /api/discovery/stop
- apps/api/src/modules/api-discovery/api-discovery.routes.ts

FRONTEND FILES TO CREATE:
- apps/web/src/components/ai/APIDiscovery.tsx + .module.css — Discovery panel with URL input, progress display, discovered endpoints list, "Save as Collection" button
- apps/web/src/components/ai/DiscoveryResultRow.tsx + .module.css — Row showing: method badge, path, status code, response type, discovered fields
- apps/web/src/stores/discoveryStore.ts — Zustand: isDiscovering, baseUrl, discoveredEndpoints[], progress, startDiscovery(), stopDiscovery(), saveAsCollection()
- apps/web/src/services/discovery.service.ts — SSE connection to discovery backend

SPEC:
- Discovery process (backend, multi-phase):

  Phase 1 — Common REST patterns (AI generates initial probe list):
  AI receives baseUrl → generates list of 30-50 common endpoints to try:
  /users, /products, /orders, /auth/login, /auth/register, /categories,
  /posts, /comments, /api/v1/, /api/v2/, /health, /status, /docs, etc.

  Phase 2 — Response-driven discovery:
  For each successful response (2xx), AI analyzes the body:
  - If array response with "id" field → try GET /{resource}/1
  - If object with nested resource names → try GET /{nested_resource}
  - If response contains URLs → probe those URLs
  - If response has pagination → note pagination pattern

  Phase 3 — Method discovery:
  For each discovered GET endpoint → try POST, PUT, DELETE, PATCH
  Analyze 405 (Method Not Allowed) responses for "Allow" header

  Phase 4 — Collection building:
  Organize all discovered endpoints into a collection with folders by resource

- SSE events:
  { type: 'probing', data: { url, method } }
  { type: 'discovered', data: { method, path, status, responseType, fieldCount } }
  { type: 'phase', data: { phase: 1|2|3|4, description } }
  { type: 'complete', data: { totalEndpoints, collection } }
  { type: 'error', data: { url, error } }

- Frontend: Real-time endpoint list that fills as discovery progresses
  Each row: method badge | path | status | type (array/object/string) | fields
  Progress bar showing current phase
  "Stop" button to cancel
  "Save as Collection" creates a full collection with all discovered endpoints

CONSTRAINTS:
- Rate limit probing: max 5 requests/second to avoid overwhelming the target
- Timeout per probe: 5 seconds
- Max total probes: 200 requests per discovery session
- Only probe the given domain — never follow links to external domains
- Skip probing common non-API paths (/static, /assets, /images, /.well-known, /favicon.ico)
- Add User-Agent: "ATX-API-Discovery/1.0" header to all probes
- If auth is required (401 on most endpoints), prompt user for auth credentials
- SSRF protection: Don't probe internal IPs (127.0.0.1, 10.x, 192.168.x, etc.)

REFERENCE:
- apps/api/src/modules/executor/executor.service.ts for HTTP execution
- apps/api/src/modules/ai/ai.controller.ts for SSE streaming
```

---

### Prompt U4: AI Smart Mock Server Generator

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/frontend-patterns.md]

GOAL: Build the "AI Smart Mock Server" — AI generates a complete, stateful mock server from an existing collection for offline testing and development.

BACKEND FILES TO CREATE:
- apps/api/src/modules/mock-server/mock-server.service.ts — Generates mock server code from collection, manages mock server lifecycle (start/stop)
- apps/api/src/modules/mock-server/mock-server.controller.ts — POST /api/mock-server/generate, POST /api/mock-server/start, POST /api/mock-server/stop, GET /api/mock-server/status
- apps/api/src/modules/mock-server/mock-server.routes.ts
- apps/api/src/modules/mock-server/mock-data-generator.ts — AI-powered realistic data generation based on field names and types
- apps/api/src/modules/ai/features/mock-generator.service.ts — AI generates mock response templates and route handlers
- apps/api/src/modules/ai/prompts/mock-generation.prompt.ts — System prompt for generating mock server configuration

FRONTEND FILES TO CREATE:
- apps/web/src/components/mock-server/MockServerPanel.tsx + .module.css — Panel showing mock server status, endpoints, controls
- apps/web/src/components/mock-server/MockEndpointRow.tsx + .module.css — Row per mock endpoint: method, path, status, response preview
- apps/web/src/components/mock-server/MockServerSettings.tsx + .module.css — Settings: port, delay simulation, error simulation toggle
- apps/web/src/stores/mockServerStore.ts — Zustand: isRunning, port, endpoints[], generate(), start(), stop()
- apps/web/src/services/mockServer.service.ts — API calls to mock server endpoints

SPEC:
- Mock server generation flow:
  1. User selects a collection → clicks "Generate Mock Server"
  2. Backend loads all requests + their saved responses from the collection
  3. AI analyzes the collection and generates:
     a. Route handlers for each unique endpoint
     b. Realistic mock data based on field names (names, emails, dates, etc.)
     c. CRUD state management (in-memory store)
     d. Error response templates
  4. Mock server starts on a configurable port (default: 3001)

- AI-generated mock features:
  - STATEFUL: POST creates → GET returns it → PUT updates it → DELETE removes it
  - Realistic data: AI infers field semantics (name→"John Smith", email→"john@example.com")
  - Pagination: Supports ?page=X&limit=Y with proper meta
  - Filtering: Supports ?field=value query params
  - Error simulation: ?_error=500 forces error response, ?_delay=2000 adds latency
  - Dynamic IDs: POST generates UUID, returns it in response

- Mock server configuration JSON (generated by AI):
  {
    port: 3001,
    routes: [{
      method: 'GET',
      path: '/api/users',
      response: { status: 200, body: [...], headers: {} },
      pagination: true,
      filtering: ['name', 'email']
    }, {
      method: 'POST',
      path: '/api/users',
      response: { status: 201, bodyTemplate: { id: '{{uuid}}', ...received_body } },
      stateful: true
    }],
    initialData: {
      users: [{ id: '...', name: '...', ... }, ...]
    }
  }

- Frontend: Live status indicator (green dot = running, gray = stopped)
  Endpoint list with copy-able URLs
  "Test Endpoint" button to send a request to the mock server from ATX itself

CONSTRAINTS:
- Mock server runs in the same Node.js process (using Express Router on a different port)
- Max 50 endpoints per mock server
- In-memory state only — resets on restart
- Only one mock server can run at a time per user
- Port must be different from the main API server (8000)
- Generate max 100 mock data records per resource

REFERENCE:
- apps/api/src/modules/executor/executor.service.ts for request data structure
- apps/api/src/modules/ai/features/doc-generator.service.ts for collection analysis pattern
```

---

## 3. Tier 2 Prompts: AI Intelligence

### Prompt U5: AI Anomaly Detection Engine

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/test-runner-context.md]

GOAL: Build the "AI Anomaly Detection Engine" — learns normal API behavior from historical responses and automatically detects deviations (timing anomalies, schema changes, status code changes, size anomalies).

BACKEND FILES TO CREATE:
- apps/api/src/modules/anomaly-detection/anomaly-detection.service.ts — Calculates baselines from history, compares new responses against baselines, detects anomalies
- apps/api/src/modules/anomaly-detection/anomaly-detection.controller.ts — GET /api/anomalies/:requestId (anomalies for a specific request), POST /api/anomalies/analyze (analyze a response against baseline)
- apps/api/src/modules/anomaly-detection/anomaly-detection.routes.ts
- apps/api/src/modules/anomaly-detection/Baseline.model.ts — Mongoose model storing learned baselines per endpoint
- apps/api/src/modules/ai/features/anomaly-explainer.service.ts — AI explains detected anomalies in natural language
- apps/api/src/modules/ai/prompts/anomaly-explanation.prompt.ts — System prompt for anomaly explanation

FRONTEND FILES TO CREATE:
- apps/web/src/components/anomaly/AnomalyBanner.tsx + .module.css — Banner in ResponseViewer showing anomaly alerts (yellow/red bar with count)
- apps/web/src/components/anomaly/AnomalyDetailPanel.tsx + .module.css — Expandable panel with anomaly details, explanation, and recommended actions
- apps/web/src/components/anomaly/AnomalyIndicator.tsx + .module.css — Small icon next to response status showing anomaly count
- apps/web/src/stores/anomalyStore.ts — Zustand: anomalies[], baseline, analyzeResponse(), dismissAnomaly()

SPEC:
- Baseline model stores per endpoint (method + URL path normalized):
  {
    userId: ObjectId,
    endpointKey: string,              // "GET:/api/users" (method + path)
    sampleCount: number,              // How many responses contributed to baseline
    responseTime: { avg: number, stdDev: number, min: number, max: number },
    responseSize: { avg: number, stdDev: number },
    statusCodes: { [code: string]: number },  // frequency map: { "200": 45, "404": 2 }
    fields: [{                        // Expected response body fields
      path: string,                   // "data.users[].name"
      type: string,                   // "string"
      presence: number                // 0-1 (1 = always present)
    }],
    updatedAt: Date
  }

- Anomaly detection rules (no AI needed — deterministic):
  1. TIMING: Response time > avg + 2*stdDev → "Response 3x slower than usual"
  2. SIZE: Response size > avg + 3*stdDev or < avg - 3*stdDev → "Response unusually large/small"
  3. STATUS: Status code not in historical statusCodes map → "Unexpected status code"
  4. FIELD_MISSING: Expected field (presence > 0.9) not in response → "Expected field missing"
  5. FIELD_NEW: Field in response not in baseline → "New field detected"
  6. TYPE_CHANGE: Field type differs from baseline → "Field type changed"

- Anomaly object:
  {
    type: 'timing' | 'size' | 'status' | 'field_missing' | 'field_new' | 'type_change',
    severity: 'warning' | 'critical',
    message: string,
    details: { expected: any, actual: any },
    explanation?: string              // AI-generated explanation (lazy-loaded)
  }

- AI explanation (triggered when user clicks "Explain"):
  AI receives: anomaly type + endpoint + baseline stats + actual values
  AI returns: plain English explanation of what might have caused the anomaly + recommended actions

- Baseline update: After each successful response (2xx), update baseline using exponential moving average (alpha=0.1)
  Baseline becomes active after 5+ samples (sampleCount >= 5)

CONSTRAINTS:
- Anomaly detection runs synchronously after every response — must be fast (< 50ms)
- AI explanation is lazy — only called when user clicks "Explain this anomaly"
- Don't detect anomalies until baseline has 5+ samples
- Normalize endpoint paths: /api/users/123 → /api/users/:id (replace UUIDs and numbers with :param)
- Maximum 10 anomalies displayed per response (sorted by severity)
- Baseline update is non-blocking (fire-and-forget to DB)

REFERENCE:
- apps/api/src/modules/history/history.service.ts for historical data access
- apps/web/src/components/response-viewer/ResponseViewer.tsx for response display integration
```

---

### Prompt U6: AI Performance Profiler & Bottleneck Detector

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/test-runner-context.md]
@[.agent/skills/prompt-engineering.md]

GOAL: Build the "AI Performance Profiler" — AI analyzes response time patterns across a collection's test history and identifies performance bottlenecks, slow queries, and optimization opportunities.

BACKEND FILES TO CREATE:
- apps/api/src/modules/ai/features/performance-profiler.service.ts — Aggregates timing data from test runs and history, sends to AI for analysis
- apps/api/src/modules/ai/prompts/performance-profiler.prompt.ts — System prompt for performance analysis

BACKEND FILES TO MODIFY:
- apps/api/src/modules/ai/ai.controller.ts — Add POST /api/ai/performance-profile endpoint
- apps/api/src/modules/ai/ai.routes.ts — Register route

FRONTEND FILES TO CREATE:
- apps/web/src/components/ai/PerformanceProfiler.tsx + .module.css — Main profiler panel with performance score gauge, bottleneck list, optimization cards
- apps/web/src/components/ai/PerformanceGauge.tsx + .module.css — Circular gauge showing overall performance score (0-100)
- apps/web/src/components/ai/BottleneckCard.tsx + .module.css — Card showing: endpoint, avg time, issue description, suggestion, severity badge

SPEC:
- Backend aggregation (before AI call):
  Collect from TestRun history + Request History:
  - Per-endpoint: average response time, p50, p95, p99, min, max, sample count
  - Overall: average across all endpoints, total request count
  - Time series: response times over last 7 days (detect trends)

- AI receives aggregated data (NOT raw responses — keep tokens low):
  {
    endpoints: [{
      method: string, path: string,
      timing: { avg, p50, p95, p99, min, max, samples },
      responseSize: { avg },
      hasNestedData: boolean,          // Response contains nested arrays/objects
      hasPagination: boolean           // Response has pagination metadata
    }],
    overallStats: { avgTime, totalEndpoints, totalRequests }
  }

- AI returns structured output:
  {
    performanceScore: number,          // 0-100
    bottlenecks: [{
      endpoint: string,
      avgTime: number,
      issue: string,                   // "N+1 query pattern detected"
      suggestion: string,              // "Add pagination or separate endpoint"
      severity: 'critical' | 'high' | 'medium' | 'low'
    }],
    optimizations: [{
      type: 'caching' | 'compression' | 'pagination' | 'batching' | 'async',
      endpoint: string,
      observation: string,
      suggestion: string
    }],
    trends: [{
      endpoint: string,
      trend: 'improving' | 'degrading' | 'stable',
      changePercent: number            // +15% means 15% slower
    }]
  }

- Frontend: Accessible from collection context menu: "📊 Performance Profile"
  Shows: gauge + bottleneck list (sorted by severity) + optimization cards

CONSTRAINTS:
- Minimum 3 test runs required before profiling is available
- Truncate endpoint list to 30 endpoints max for AI analysis
- Performance score formula suggested but AI can adjust:
  score = 100 - (criticalBottlenecks * 15) - (highBottlenecks * 8) - (mediumBottlenecks * 3)
- Don't send actual response bodies to AI — only timing and structural metadata

REFERENCE: apps/api/src/modules/ai/features/coverage-analyzer.service.ts for collection analysis pattern
```

---

### Prompt U7: AI API Diff & Breaking Change Detector

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/frontend-patterns.md]

GOAL: Build the "AI API Diff & Breaking Change Detector" — compares API responses from different time periods and detects breaking changes, deprecations, schema drift, and enhancements.

BACKEND FILES TO CREATE:
- apps/api/src/modules/api-diff/api-diff.service.ts — Loads historical responses for two time points, performs structural diff, sends to AI for analysis
- apps/api/src/modules/api-diff/api-diff.controller.ts — POST /api/diff/analyze (accepts collectionId + baselineDate + currentDate)
- apps/api/src/modules/api-diff/api-diff.routes.ts
- apps/api/src/modules/ai/features/diff-analyzer.service.ts — AI analyzes the structural diff and categorizes changes
- apps/api/src/modules/ai/prompts/diff-analyzer.prompt.ts — System prompt for change categorization

FRONTEND FILES TO CREATE:
- apps/web/src/components/api-diff/APIDiffPanel.tsx + .module.css — Main panel: date range selector, diff results organized by category
- apps/web/src/components/api-diff/DiffCategory.tsx + .module.css — Collapsible section for each category (breaking, deprecation, drift, enhancement)
- apps/web/src/components/api-diff/DiffItem.tsx + .module.css — Individual change item with path, old value, new value, and diff highlighting
- apps/web/src/stores/diffStore.ts — Zustand: diffResults, isAnalyzing, baselineDate, analyze()
- apps/web/src/services/diff.service.ts — API calls

SPEC:
- Diff analysis process:
  1. Load baseline responses: earliest saved responses for each endpoint (or user-selected date)
  2. Load current responses: most recent responses for each endpoint
  3. Structural comparison (deterministic, no AI):
     - Field presence: field added, removed, or renamed
     - Type changes: string→number, object→array, etc.
     - Status code changes: 200→201, 200→500, etc.
     - Header changes: new headers, removed headers
     - Response size changes: significant size increase/decrease
  4. AI categorization: Send structural diff to AI → categorize as breaking/deprecation/drift/enhancement

- AI structured output:
  {
    breakingChanges: [{
      endpoint: string,
      change: string,                  // "Field 'phone' removed from response"
      impact: string,                  // "Clients accessing user.phone will get undefined"
      migration: string               // "Use 'contact.phone_number' instead"
    }],
    deprecations: [{
      endpoint: string,
      signal: string,                  // "X-Deprecation header detected"
      alternative: string,
      deadline?: string
    }],
    drifts: [{
      endpoint: string,
      change: string,
      risk: 'high' | 'medium' | 'low'
    }],
    enhancements: [{
      endpoint: string,
      change: string
    }],
    summary: string,                   // "3 breaking changes, 1 deprecation, 5 enhancements"
    migrationGuide?: string            // Markdown migration guide for breaking changes
  }

CONSTRAINTS:
- Compare max 30 endpoints per diff
- Structural diff is deterministic (no AI needed) — AI only categorizes and explains
- Date picker: show available dates from history (don't allow dates with no data)
- Response bodies compared structurally (keys + types), not by exact values
- Deep comparison: up to 5 levels of nesting

REFERENCE: apps/api/src/modules/history/history.service.ts for historical data access
```

---

### Prompt U8: AI Request Optimizer

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/prompt-engineering.md]

GOAL: Build the "AI Request Optimizer" — AI analyzes the current request configuration and proactively suggests improvements for performance, correctness, security, and best practices.

BACKEND FILES TO CREATE:
- apps/api/src/modules/ai/features/request-optimizer.service.ts — Analyzes request config + response and returns optimization suggestions
- apps/api/src/modules/ai/prompts/request-optimizer.prompt.ts — System prompt for request optimization analysis

BACKEND FILES TO MODIFY:
- apps/api/src/modules/ai/ai.controller.ts — Add POST /api/ai/optimize-request endpoint
- apps/api/src/modules/ai/ai.routes.ts — Register route

FRONTEND FILES TO CREATE:
- apps/web/src/components/ai/RequestOptimizer.tsx + .module.css — Panel showing optimization suggestions grouped by category
- apps/web/src/components/ai/OptimizationCard.tsx + .module.css — Individual suggestion card with: title, description, code fix, "Apply" button
- apps/web/src/hooks/useRequestOptimizer.ts — Hook that auto-analyzes after response and shows indicator

SPEC:
- AI receives:
  {
    request: { method, url, headers, params, body },
    response: { status, headers, body (truncated to 2000 chars), timing, size }
  }

- AI returns structured output:
  {
    optimizations: [{
      category: 'headers' | 'performance' | 'security' | 'best_practices' | 'correctness',
      title: string,
      description: string,
      currentValue?: string,
      suggestedValue?: string,
      severity: 'info' | 'warning' | 'critical',
      autoFixable: boolean,           // Can ATX apply this fix automatically?
      fix?: {                         // If autoFixable
        type: 'add_header' | 'change_method' | 'add_param' | 'modify_body',
        key?: string,
        value?: string
      }
    }],
    score: number                     // 0-100 request quality score
  }

- Optimization categories and examples:
  HEADERS:
  - Missing Content-Type for POST/PUT/PATCH
  - Missing Accept header
  - Sending sensitive data in URL params (should be in body)
  - Missing Accept-Encoding for compression
  
  PERFORMANCE:
  - Large response without pagination (suggest ?page=1&limit=50)
  - No If-None-Match/ETag for cacheable responses
  - Requesting all fields when only a few needed (suggest field selection)
  
  SECURITY:
  - API key in URL query params (should be in header)
  - Basic auth over HTTP (should use HTTPS)
  - Missing Authorization header for protected endpoints (based on 401 response)
  
  BEST PRACTICES:
  - Using POST when PATCH is more appropriate (partial update)
  - Missing idempotency key for POST requests
  - Inconsistent URL naming (camelCase vs snake_case)

- Frontend integration:
  Small 💡 lightbulb indicator in request builder toolbar
  Appears after response is received with optimization count
  Click opens the optimization panel
  "Apply" button on auto-fixable suggestions directly modifies the request builder

CONSTRAINTS:
- Analysis runs only when explicitly triggered (click the 💡 button) — not automatic
- Max 10 suggestions per analysis
- Auto-fix only for safe changes (add header, change method) — never modify body automatically
- AI prompt max: 2000 tokens (truncate response body)

REFERENCE: apps/api/src/modules/ai/features/debug-assistant.service.ts for analysis pattern
```

---

## 4. Tier 3 Prompts: AI Security & Resilience

### Prompt U9: AI Security Scanner (OWASP API Top 10)

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/test-runner-context.md]

GOAL: Build the "AI Security Scanner" — automated security testing based on OWASP API Security Top 10. AI generates attack payloads, executes them against the API, and reports vulnerabilities with remediation guidance.

BACKEND FILES TO CREATE:
- apps/api/src/modules/security-scanner/security-scanner.service.ts — Orchestrates security tests: generates payloads → executes → analyzes responses → reports
- apps/api/src/modules/security-scanner/security-scanner.controller.ts — POST /api/security/scan (SSE for progress), GET /api/security/reports/:id
- apps/api/src/modules/security-scanner/security-scanner.routes.ts
- apps/api/src/modules/security-scanner/attack-payloads.ts — Library of pre-built attack payloads for each OWASP category
- apps/api/src/modules/security-scanner/SecurityReport.model.ts — Mongoose model for storing scan results
- apps/api/src/modules/ai/features/security-analyzer.service.ts — AI analyzes scan results and generates remediation guidance
- apps/api/src/modules/ai/prompts/security-analysis.prompt.ts — System prompt for security analysis

FRONTEND FILES TO CREATE:
- apps/web/src/components/security/SecurityScanner.tsx + .module.css — Main scanner panel: start scan button, progress, results
- apps/web/src/components/security/SecurityReportCard.tsx + .module.css — Card per vulnerability: OWASP category, severity, endpoint, description, remediation
- apps/web/src/components/security/SecurityScore.tsx + .module.css — Overall security score gauge with OWASP category breakdown
- apps/web/src/stores/securityStore.ts — Zustand: isScanning, progress, report, startScan(), stopScan()
- apps/web/src/services/security.service.ts — API calls + SSE connection

SPEC:
- Security scan process (per collection):
  For each endpoint in the collection, run applicable OWASP checks:

  API1 — BOLA (Broken Object Level Authorization):
  - Take a valid request with object ID → change the ID to a different ID
  - If response is 200 → VULNERABLE (can access other users' data)
  - Expected: 403 or 404

  API2 — Broken Authentication:
  - Send requests WITHOUT auth token → should get 401
  - Send requests with EXPIRED token → should get 401
  - Send requests with INVALID token → should get 401
  - If any returns 200 → VULNERABLE

  API3 — Broken Object Property Level Authorization:
  - For POST/PUT endpoints: add extra fields (role: 'admin', is_admin: true, permissions: ['*'])
  - If these fields are accepted (reflected in GET response) → VULNERABLE

  API4 — Unrestricted Resource Consumption:
  - Send 50 rapid requests to same endpoint
  - If no 429 (Too Many Requests) response → WARNING (no rate limiting)

  API5 — Broken Function Level Authorization:
  - Probe common admin paths: /admin, /api/admin/*, /api/internal/*
  - If accessible with regular auth → VULNERABLE

  API7 — Security Misconfiguration:
  - Force errors (malformed JSON body, invalid params)
  - Check if error response contains stack traces, file paths, or debug info
  - Check security headers: CORS, X-Content-Type-Options, X-Frame-Options

- Each test sends real HTTP requests via the executor service
- Results are streamed via SSE as each check completes

- AI analysis (after all checks complete):
  AI receives: all vulnerability findings with evidence
  AI returns: {
    securityScore: number,
    vulnerabilities: [{
      owaspCategory: 'API1' | 'API2' | ... | 'API10',
      endpoint: string,
      severity: 'critical' | 'high' | 'medium' | 'low' | 'info',
      title: string,
      description: string,
      evidence: string,
      remediation: string,
      codeExample?: string
    }],
    summary: string,
    recommendations: string[]
  }

CONSTRAINTS:
- Rate limit attack requests: max 10 req/sec to avoid being blocked
- Timeout per attack request: 3 seconds
- Security scan requires at least one working (2xx) request in the collection as baseline
- User must explicitly start the scan — never auto-run
- Show clear disclaimer: "This performs active security testing against the target API. Only scan APIs you own or have permission to test."
- Don't perform destructive tests (don't actually delete production data)
- Store scan reports for history (SecurityReport model)

REFERENCE:
- apps/api/src/modules/executor/executor.service.ts for HTTP execution
- apps/api/src/modules/ai/ai.controller.ts for SSE streaming pattern
```

---

### Prompt U10: AI Chaos / Fuzz Testing

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/test-runner-context.md]

GOAL: Build "AI Chaos / Fuzz Testing" — AI generates intelligent adversarial payloads (boundary values, malformed data, injection strings, Unicode edge cases) and tests API resilience.

BACKEND FILES TO CREATE:
- apps/api/src/modules/fuzz-testing/fuzz-testing.service.ts — Generates fuzz payloads based on request schema, executes them, analyzes responses
- apps/api/src/modules/fuzz-testing/fuzz-testing.controller.ts — POST /api/fuzz/run (SSE for progress), GET /api/fuzz/reports/:id
- apps/api/src/modules/fuzz-testing/fuzz-testing.routes.ts
- apps/api/src/modules/fuzz-testing/payload-generators.ts — Payload generation functions for each fuzz category
- apps/api/src/modules/ai/features/fuzz-analyzer.service.ts — AI generates context-aware fuzz payloads based on field semantics
- apps/api/src/modules/ai/prompts/fuzz-generation.prompt.ts — System prompt for intelligent fuzz payload generation

FRONTEND FILES TO CREATE:
- apps/web/src/components/fuzz/FuzzTestRunner.tsx + .module.css — Main panel: fuzz categories selector, progress, results
- apps/web/src/components/fuzz/FuzzResultRow.tsx + .module.css — Row: payload sent, expected vs actual status, verdict (pass/fail/crash)
- apps/web/src/components/fuzz/FuzzCategorySelector.tsx + .module.css — Checkbox grid to select which fuzz categories to run
- apps/web/src/stores/fuzzStore.ts — Zustand: isRunning, selectedCategories, results[], startFuzz(), stopFuzz()
- apps/web/src/services/fuzz.service.ts — API calls + SSE

SPEC:
- Fuzz payload categories (each generates 5-15 payloads per field):

  1. BOUNDARY VALUES:
  - Numbers: 0, -1, 1, -2147483648, 2147483647, Number.MAX_SAFE_INTEGER, NaN, Infinity, 0.1, 99999999999
  - Strings: "", " ", "a"×10000, null character (\0)
  - Arrays: [], [null], array with 10000 items, deeply nested array

  2. TYPE CONFUSION:
  - String where number expected: "abc", "123abc", "true"
  - Number where string expected: 42, 0, -1
  - Array where object expected: []
  - Object where array expected: {}
  - null for every field, undefined for every field

  3. SQL/NoSQL INJECTION:
  - SQL: "'; DROP TABLE users;--", "' OR '1'='1", "1; SELECT * FROM users"
  - NoSQL: {"$gt": ""}, {"$ne": null}, {"$where": "sleep(5000)"}
  - Command: "; ls -la", "| cat /etc/passwd", "`whoami`"

  4. XSS PAYLOADS:
  - "<script>alert(1)</script>", "<img onerror=alert(1) src=x>", "javascript:alert(1)"
  - SVG: "<svg onload=alert(1)>", "data:text/html,<script>alert(1)</script>"

  5. UNICODE & ENCODING:
  - Zero-width space: \u200B, RTL override: \u202E
  - Emoji: "😀🎉", "💩" (surrogate pairs)
  - Null bytes: "hello\x00world"
  - UTF-8 overlong encoding

  6. FORMAT VIOLATIONS:
  - Invalid email: "not-an-email", "@missing.com", "a@.com"
  - Invalid date: "2025-13-32", "not-a-date", "0000-00-00"
  - Invalid UUID: "not-a-uuid", "00000000-0000-0000-0000-000000000000"
  - Invalid JSON: '{"key": }', '{incomplete'

  7. SIZE ATTACKS:
  - 1MB string payload, deeply nested JSON (100 levels), body with 1000 fields

- AI-enhanced payloads:
  AI analyzes field names to generate CONTEXTUALLY RELEVANT fuzz payloads:
  - "email" field → SQL injection in email format: "admin'--@test.com"
  - "age" field → boundary: -1, 0, 150, 999
  - "password" field → special chars, unicode, length attacks

- Fuzz result analysis:
  For each fuzz payload, check:
  - Did the API crash (500 Internal Server Error)? → CRITICAL
  - Did the API accept invalid data (200 OK)? → HIGH (should validate)
  - Did the API return proper error (400 Bad Request)? → PASS
  - Did the API leak error details (stack trace in response)? → MEDIUM
  - Did the API timeout? → HIGH (possible DoS vulnerability)

- SSE events:
  { type: 'payload', data: { field, category, payload, status, verdict } }
  { type: 'complete', data: { totalPayloads, passed, failed, crashed } }

CONSTRAINTS:
- Max 200 payloads per fuzz run (configurable)
- Rate limit: 5 requests/second
- Timeout per request: 5 seconds
- User selects which categories to run (not all by default)
- Only fuzz the current active request — not entire collection
- Show disclaimer: "Fuzz testing sends malicious payloads. Only test APIs you own."
- Size attack payloads capped at 1MB to prevent browser/network issues

REFERENCE:
- apps/api/src/modules/executor/executor.service.ts for execution
- apps/api/src/modules/security-scanner/security-scanner.service.ts for similar pattern (if already built)
```

---

### Prompt U11: AI Smart Data Generator

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/prompt-engineering.md]

GOAL: Build the "AI Smart Data Generator" — AI generates contextually realistic test data based on field names, types, and relationships. Not random data — coherent, semantically appropriate data.

BACKEND FILES TO CREATE:
- apps/api/src/modules/ai/features/data-generator.service.ts — AI generates realistic test data based on request body schema/structure
- apps/api/src/modules/ai/prompts/data-generation.prompt.ts — System prompt for contextual data generation

BACKEND FILES TO MODIFY:
- apps/api/src/modules/ai/ai.controller.ts — Add POST /api/ai/generate-data endpoint
- apps/api/src/modules/ai/ai.routes.ts — Register route

FRONTEND FILES TO CREATE:
- apps/web/src/components/ai/DataGenerator.tsx + .module.css — Panel with "Generate Data" button, shows generated body, allows regeneration with different "personas"
- apps/web/src/components/ai/DataPresets.tsx + .module.css — Preset buttons: "Happy Path", "Edge Cases", "International", "Minimal", "Maximum"

SPEC:
- Data generation flow:
  1. User has a request body (from body editor or from saved request)
  2. User clicks "🎲 Generate Smart Data" button in body editor toolbar
  3. AI analyzes field names and structure → generates contextually appropriate values
  4. User can select presets for different data variations

- AI receives:
  {
    bodyStructure: object,             // Current body with field names (values may be empty)
    method: string,                    // POST/PUT/PATCH
    url: string,                      // For context (e.g., /api/users → user data)
    preset: 'happy_path' | 'edge_cases' | 'international' | 'minimal' | 'maximum' | 'custom',
    customInstruction?: string         // User's additional instruction
  }

- AI returns:
  {
    generatedBody: object,             // Complete body with realistic values
    explanation: string,               // "Generated a US-based user with consistent address"
    variations: [{                     // 3 alternative data sets
      name: string,
      body: object,
      description: string
    }]
  }

- Preset behaviors:
  HAPPY_PATH: Valid, realistic data that should pass all validation
  EDGE_CASES: Boundary values, empty strings, special characters (but still valid types)
  INTERNATIONAL: Non-English names, international addresses, different phone formats
  MINIMAL: Only required fields with minimal values
  MAXIMUM: All fields filled, long strings, large numbers, many array items

- Contextual intelligence examples:
  Field "email" + field "name" = "John Doe" → email = "john.doe@example.com"
  Field "city" + field "state" + field "zip" → internally consistent (SF, CA, 94102)
  Field "created_at" + field "updated_at" → updated_at > created_at
  Field "price" → realistic product price, not random number
  Field "phone" → valid phone format based on country code field

CONSTRAINTS:
- AI call should return in <3 seconds
- Generated data should be valid JSON
- Max body size: 50 fields (if more, only generate for first 50)
- Don't generate data for file upload fields
- Cache recent generations (3 per request) for quick preset switching

REFERENCE: apps/api/src/modules/ai/features/test-generator.service.ts for AI service pattern
```

---

### Prompt U12: AI API Health Score & Recommendations

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/prompt-engineering.md]

GOAL: Build the "AI API Health Score" — a comprehensive 0-100 health score combining performance, security, reliability, test coverage, and documentation quality with actionable recommendations.

BACKEND FILES TO CREATE:
- apps/api/src/modules/ai/features/health-score.service.ts — Aggregates data from all modules (anomalies, security, test runs, coverage, docs) and sends to AI for holistic assessment
- apps/api/src/modules/ai/prompts/health-score.prompt.ts — System prompt for health assessment

BACKEND FILES TO MODIFY:
- apps/api/src/modules/ai/ai.controller.ts — Add POST /api/ai/health-score endpoint
- apps/api/src/modules/ai/ai.routes.ts — Register route

FRONTEND FILES TO CREATE:
- apps/web/src/components/dashboard/HealthScore.tsx + .module.css — Main health score widget: large gauge + 5 category breakdown bars
- apps/web/src/components/dashboard/HealthCategory.tsx + .module.css — Individual category bar: name, score, mini issues list
- apps/web/src/components/dashboard/HealthRecommendations.tsx + .module.css — Prioritized list of AI recommendations
- apps/web/src/components/dashboard/HealthTrend.tsx + .module.css — Line chart showing health score over last 30 days

SPEC:
- Health score aggregation (backend, deterministic calculations):
  1. PERFORMANCE (0-100): Based on avg response time, p95, timeout rate
     100 if avg < 100ms, 80 if < 300ms, 60 if < 500ms, 40 if < 1000ms, 20 if < 3000ms, 0 if > 3000ms
  2. SECURITY (0-100): Based on security scan results (if available)
     -15 per critical vulnerability, -8 per high, -3 per medium
  3. RELIABILITY (0-100): Based on success rate from test runs
     100 if > 99%, 80 if > 95%, 60 if > 90%, 40 if > 80%, 0 if < 80%
  4. TEST COVERAGE (0-100): Based on coverage analyzer results
     Percentage of endpoints with test scripts
  5. DOCUMENTATION (0-100): Based on doc generator output
     Percentage of endpoints with generated docs

  OVERALL = weighted average:
  Performance (25%) + Security (30%) + Reliability (20%) + Coverage (15%) + Documentation (10%)

- AI enhancement (after deterministic scoring):
  AI receives: all 5 category scores + list of specific issues
  AI returns:
  {
    overallScore: number,
    categoryScores: {
      performance: { score, issues: string[] },
      security: { score, issues: string[] },
      reliability: { score, issues: string[] },
      coverage: { score, issues: string[] },
      documentation: { score, issues: string[] }
    },
    recommendations: [{
      priority: 'critical' | 'high' | 'medium' | 'low',
      title: string,
      description: string,
      impact: string,                 // "Would improve score by ~8 points"
      effort: 'low' | 'medium' | 'high',
      category: string
    }],
    trend: 'improving' | 'stable' | 'declining',
    summary: string                   // "Your API is in good health but has 2 critical security issues"
  }

- Health score is stored per collection per date for trend tracking
- Dashboard widget shows: large gauge (color-coded), 5 category bars, top 3 recommendations

CONSTRAINTS:
- Health score calculation must work even if only 1-2 categories have data
- Categories without data show "N/A" instead of 0
- Store daily health scores for 90-day trend tracking
- AI call only for recommendations — scoring is deterministic for consistency
- Dashboard auto-refreshes every 5 minutes

REFERENCE:
- apps/web/src/components/dashboard/TestDashboard.tsx for dashboard integration
- apps/api/src/modules/ai/features/coverage-analyzer.service.ts for aggregation pattern
```

---

## 5. Desktop App Adaptation Notes

### Path Mappings

All prompts above use web app paths. For the **Desktop App** (Electron/Tauri), apply these substitutions:

| Web App Path | Desktop App Path |
|:-------------|:----------------|
| `apps/api/src/modules/` | `src/main/modules/` or `src/backend/modules/` |
| `apps/web/src/components/` | `src/renderer/components/` |
| `apps/web/src/stores/` | `src/renderer/stores/` |
| `apps/web/src/services/` | `src/renderer/services/` |
| `apps/web/src/hooks/` | `src/renderer/hooks/` |

### Desktop-Specific Considerations

1. **Mock Server (U4):** In Electron, the mock server can run in the main process — no need for a separate port allocation issue. Use `electron.net` module for the internal server.

2. **API Discovery (U3):** Desktop app can bypass CORS restrictions when probing — direct HTTP calls from the main process.

3. **Security Scanner (U9):** Desktop app has no CORS constraints — can send attack payloads directly. Better performance than the web proxy.

4. **Fuzz Testing (U10):** Desktop can handle larger payloads (1MB+) without browser memory issues.

5. **Data Storage:** Desktop uses SQLite or local file system instead of MongoDB Atlas. Adjust model references accordingly.

### Desktop App Prompt Prefix

Add this to the beginning of any prompt when using it for the desktop app:

```
NOTE: This is for the DESKTOP APP (Electron/Tauri).
- Backend runs in the main process (src/main/)
- Frontend runs in the renderer process (src/renderer/)
- Use IPC (ipcMain/ipcRenderer) instead of HTTP API calls
- Use local SQLite database instead of MongoDB
- File paths follow the desktop app structure, not the web monorepo
```

---

## 6. Prompt Execution Order

### Recommended Sequence

```
PHASE 3A: AUTOPILOT (Weeks 1-2)
├── Day 1-2:  Prompt U1 (NL → API Request)            ← Highest wow factor
├── Day 3-4:  Prompt U2 (Conversational Test Builder)  ← Core differentiator
├── Day 5:    Prompt U11 (Smart Data Generator)        ← Quick win, high utility
└── Day 6-7:  Prompt U4 (Smart Mock Server)            ← Complex but high value

PHASE 3B: INTELLIGENCE (Weeks 3-4)
├── Day 8-9:  Prompt U5 (Anomaly Detection)            ← Foundation for U12
├── Day 10-11: Prompt U7 (API Diff / Breaking Changes) ← Unique competitive advantage
├── Day 12:   Prompt U6 (Performance Profiler)         ← Builds on test run data
└── Day 13:   Prompt U8 (Request Optimizer)            ← Quick AI feature

PHASE 3C: SECURITY (Weeks 5-6)
├── Day 14-16: Prompt U9 (Security Scanner OWASP)      ← Complex, high enterprise value
├── Day 17-18: Prompt U10 (Chaos / Fuzz Testing)       ← Builds on security scanner
├── Day 19-20: Prompt U12 (API Health Score)           ← Aggregates everything
└── Day 21-22: Prompt U3 (API Reverse Engineer)        ← Complex discovery feature
```

---

*This document contains all 12 copy-paste prompts. See Phase3_03 for Multi-Agent Skills and Hooks configuration.*
