# Phase 3 — Multi-Agent Skills & Hooks Configuration

## Skills, Agents, Sub-Agents, and Lifecycle Hooks for 12 Unique AI Features

---

## Table of Contents

1. [New Skill Files for Phase 3](#1-new-skill-files-for-phase-3)
2. [AGENTS.md Update for Phase 3](#2-agentsmd-update-for-phase-3)
3. [Multi-Agent Delegation Strategy](#3-multi-agent-delegation-strategy)
4. [Sub-Agent Prompts for Complex Features](#4-sub-agent-prompts-for-complex-features)
5. [Lifecycle Hooks Architecture](#5-lifecycle-hooks-architecture)
6. [Hook Implementation Details](#6-hook-implementation-details)
7. [Event-Driven Agent Communication](#7-event-driven-agent-communication)
8. [Step-by-Step Setup Guide](#8-step-by-step-setup-guide)

---

## 1. New Skill Files for Phase 3

### Skill 7: `ai-features-context.md` (NEW — Phase 3)

**File Path:** `.agent/skills/ai-features-context.md`

```markdown
# Phase 3: Unique AI Features Context

## Feature Registry
- U1: NL-to-Request — Natural language → API request conversion
- U2: Conversational Test Builder — Multi-turn AI test creation
- U3: API Reverse Engineer — Endpoint discovery from base URL
- U4: Smart Mock Server — AI-generated stateful mock servers
- U5: Anomaly Detection — Behavioral baseline learning + deviation alerts
- U6: Performance Profiler — Cross-endpoint performance analysis
- U7: API Diff — Breaking change detection between time periods
- U8: Request Optimizer — Proactive request improvement suggestions
- U9: Security Scanner — OWASP API Top 10 automated testing
- U10: Chaos/Fuzz Testing — Adversarial payload generation + resilience testing
- U11: Smart Data Generator — Contextually realistic test data
- U12: Health Score — Holistic API quality metric (0-100)

## AI Service Pattern
All new AI features follow this pattern:
1. Feature service: apps/api/src/modules/ai/features/{name}.service.ts
2. Prompt file: apps/api/src/modules/ai/prompts/{name}.prompt.ts
3. Controller addition: New endpoint in ai.controller.ts
4. Route registration: New route in ai.routes.ts
5. Zod schema: Define structured output schema in service file
6. LLM Gateway: Use llmGateway.completeStructured() for all structured outputs

## New Backend Module Pattern (non-AI)
For features with their own modules (anomaly-detection, security-scanner, fuzz-testing, api-diff, mock-server, api-discovery):
- apps/api/src/modules/{name}/{name}.service.ts
- apps/api/src/modules/{name}/{name}.controller.ts
- apps/api/src/modules/{name}/{name}.routes.ts
- apps/api/src/modules/{name}/{Model}.model.ts (if persistent data)
- Register routes in apps/api/src/app.ts

## Frontend Component Pattern
- apps/web/src/components/{feature}/{Component}.tsx + .module.css
- apps/web/src/stores/{feature}Store.ts (Zustand)
- apps/web/src/services/{feature}.service.ts
- apps/web/src/hooks/use{Feature}.ts (if needed)

## SSE Pattern (for long-running features: U3, U9, U10)
Controller:
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  // Send events: res.write(`data: ${JSON.stringify(event)}\n\n`)
  // On complete: res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`); res.end()
Frontend:
  Use EventSource or fetch() with ReadableStream
  Parse SSE events and update Zustand store

## Baseline Model (U5 Anomaly Detection)
{
  userId, endpointKey (method+path normalized),
  sampleCount, responseTime: { avg, stdDev, min, max },
  responseSize: { avg, stdDev },
  statusCodes: Map, fields: [{ path, type, presence }]
}

## Security Report Model (U9)
{
  userId, collectionId, scanDate,
  securityScore, vulnerabilities: [{
    owaspCategory, endpoint, severity, title, description, evidence, remediation
  }]
}
```

---

### Skill 8: `security-testing-context.md` (NEW — Phase 3)

**File Path:** `.agent/skills/security-testing-context.md`

```markdown
# Phase 3: Security & Resilience Testing Context

## OWASP API Security Top 10 (2023) — ATX Coverage
API1: Broken Object Level Authorization (BOLA)
  → Test: Change object IDs in requests, check for 403/404
API2: Broken Authentication
  → Test: Send without auth, with expired/invalid tokens
API3: Broken Object Property Level Authorization
  → Test: Add extra fields (role, is_admin) to POST/PUT
API4: Unrestricted Resource Consumption
  → Test: Send 50+ rapid requests, check for 429
API5: Broken Function Level Authorization
  → Test: Probe admin routes with regular user auth
API6: Server-Side Request Forgery
  → Test: Submit internal URLs in URL-type fields
API7: Security Misconfiguration
  → Test: Force errors, check for stack traces/debug info
API8: Lack of Protection from Automated Threats
  → Test: Automated scraping patterns
API9: Improper Inventory Management
  → Test: Probe /v1/, /v2/, /old/ paths
API10: Unsafe API Consumption
  → Test: Malicious payloads in webhook/callback fields

## Fuzz Payload Categories
1. Boundary: 0, -1, MAX_INT, empty, null
2. Type confusion: wrong types for each field
3. Injection: SQL, NoSQL, command injection
4. XSS: script tags, event handlers, SVG
5. Unicode: zero-width, RTL, emoji, null bytes
6. Format: invalid dates, emails, UUIDs
7. Size: 1MB strings, deep nesting, many fields

## Attack Execution Rules
- Rate limit: 5-10 req/sec max
- Timeout: 3-5 seconds per request
- Only test APIs the user owns
- Don't perform destructive actions (DELETE with valid IDs)
- Always show disclaimer before scanning
- Log all attack attempts for audit
```

---

### Skill 9: `data-generation-context.md` (NEW — Phase 3)

**File Path:** `.agent/skills/data-generation-context.md`

```markdown
# Phase 3: Smart Data Generation Context

## Data Presets
- HAPPY_PATH: Valid, realistic data passing all validation
- EDGE_CASES: Boundary values, special chars (still valid types)
- INTERNATIONAL: Non-English names, international formats
- MINIMAL: Only required fields, minimal values
- MAXIMUM: All fields, long strings, max values

## Field Semantics → Generated Values
- name/first_name/last_name → Realistic human names
- email → Matches name: "john.doe@example.com"
- phone → Valid format based on country context
- address/city/state/zip → Internally consistent
- date/created_at/updated_at → Chronologically valid
- price/amount/cost → Realistic product/transaction prices
- age → 18-90 range
- password → Strong password meeting common requirements
- url/website → Valid URL format
- id/uuid → Valid UUID v4

## Contextual Consistency Rules
1. Email domain should match company name if both present
2. City/state/zip must be geographically consistent
3. updated_at must be after created_at
4. End date must be after start date
5. Nested objects should be internally consistent
6. Arrays should have consistent item types
```

---

## 2. AGENTS.md Update for Phase 3

**File Path:** `AGENTS.md` (project root — APPEND to existing)

```markdown
## Phase 3: Unique AI Features

### New Module Categories
1. AI Autopilot: NL-to-Request, Conversational Test Builder, API Discovery, Mock Server
2. AI Intelligence: Anomaly Detection, Performance Profiler, API Diff, Request Optimizer
3. AI Security: Security Scanner (OWASP), Chaos/Fuzz Testing, Smart Data Generator, Health Score

### Additional Rules (Phase 3)
14. Security features MUST show disclaimer before active scanning
15. Fuzz/attack payloads are sent via executor service with rate limiting (5-10 req/sec)
16. Anomaly baselines require 5+ samples before activation
17. AI features with long execution use SSE for real-time progress streaming
18. Mock servers run on separate ports (3001-3010) from main API (8000)
19. Health scores use weighted averages: Performance 25%, Security 30%, Reliability 20%, Coverage 15%, Docs 10%
20. All AI analysis features truncate response bodies to 2000 chars max in prompts

### New Skill Files
- .agent/skills/ai-features-context.md — Feature registry and patterns
- .agent/skills/security-testing-context.md — OWASP checks and fuzz categories
- .agent/skills/data-generation-context.md — Smart data generation rules
```

---

## 3. Multi-Agent Delegation Strategy

### Feature Complexity Classification

| Feature | Backend | Frontend | AI Service | Recommended Agents |
|:--------|:--------|:---------|:-----------|:-------------------|
| U1: NL→Request | Light | Medium | Heavy | **1 agent**: Single prompt |
| U2: Conversational Tests | Medium | Heavy | Heavy | **2 agents**: Backend AI + Frontend |
| U3: API Reverse Engineer | Heavy | Heavy | Medium | **3 agents**: Backend + Frontend + Integration |
| U4: Mock Server | Heavy | Medium | Medium | **3 agents**: Backend + Frontend + Integration |
| U5: Anomaly Detection | Heavy | Medium | Light | **2 agents**: Backend + Frontend |
| U6: Performance Profiler | Medium | Medium | Heavy | **1 agent**: Single prompt |
| U7: API Diff | Heavy | Heavy | Medium | **2 agents**: Backend + Frontend |
| U8: Request Optimizer | Light | Medium | Heavy | **1 agent**: Single prompt |
| U9: Security Scanner | Heavy | Heavy | Medium | **3 agents**: Backend + Frontend + Integration |
| U10: Chaos/Fuzz | Heavy | Heavy | Medium | **3 agents**: Backend + Frontend + Integration |
| U11: Data Generator | Light | Medium | Heavy | **1 agent**: Single prompt |
| U12: Health Score | Medium | Heavy | Medium | **2 agents**: Backend + Frontend |

### When to Use Multiple Agents

```
Use 1 Agent (Single Prompt) when:
├── Feature is primarily an AI service + simple UI
├── Backend and frontend are both lightweight
└── No new standalone module needed

Use 2 Agents when:
├── Feature has a new backend module + significant frontend
├── OR feature has heavy AI service + complex UI
└── Split: Backend/AI first → Frontend second

Use 3 Agents when:
├── Feature creates a new standalone backend module
├── AND has complex frontend with multiple components
├── AND requires integration/wiring work
└── Split: Backend → Frontend → Integration
```

---

## 4. Sub-Agent Prompts for Complex Features

### U3: API Reverse Engineer — 3-Agent Split

**Agent 1 (Backend + API Discovery):**
```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/ai-features-context.md]

Build the API Discovery backend:

1. apps/api/src/modules/api-discovery/api-discovery.service.ts
   - generateProbeList(baseUrl) → AI generates 30-50 common endpoints
   - executeProbe(url, method) → safe HTTP request with timeout + rate limiting
   - analyzeResponse(response) → extract resource info, discover linked endpoints
   - buildCollection(discoveredEndpoints) → create collection structure
   - Rate limiter: max 5 requests/second using a simple delay queue

2. apps/api/src/modules/api-discovery/api-discovery.controller.ts
   - POST /api/discovery/start — SSE endpoint streaming discovery progress
   - POST /api/discovery/stop — Abort ongoing discovery

3. apps/api/src/modules/ai/features/api-reverse-engineer.service.ts
   - AI service for generating probe URLs and analyzing response patterns

4. apps/api/src/modules/ai/prompts/api-reverse-engineer.prompt.ts
   - System prompt for REST API pattern analysis

Register routes in app.ts. Follow executor service pattern.
SSRF guard must block internal IPs.
```

**Agent 2 (Frontend):**
```
@[.agent/skills/project-architecture.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/design-system.md]

Build the API Discovery frontend:

1. apps/web/src/components/ai/APIDiscovery.tsx + .module.css
   - URL input bar with "Start Discovery" button
   - Progress display: phase indicator + progress bar
   - Live endpoint list that fills as SSE events arrive
   - "Save as Collection" button at bottom

2. apps/web/src/components/ai/DiscoveryResultRow.tsx + .module.css
   - Row: method badge, path, status code, type (array/object), field count
   - States: probing (spinner), discovered (green), failed (red), not found (gray)

3. apps/web/src/stores/discoveryStore.ts
   - State: isDiscovering, baseUrl, discoveredEndpoints[], phase, progress
   - Actions: startDiscovery(url), stopDiscovery(), saveAsCollection()

4. apps/web/src/services/discovery.service.ts
   - SSE connection to POST /api/discovery/start
   - Parse events, update store

Follow AIChatPanel.tsx component pattern. Use CSS variables.
```

**Agent 3 (Integration):**
```
Wire the API Discovery feature:

1. Add "🔍 Discover API" button to the top toolbar or sidebar
2. When clicked, open APIDiscovery panel as a modal/overlay
3. On "Save as Collection":
   - Create a new collection with discovered endpoints
   - Organize by resource (e.g., "Users" folder with all /users endpoints)
   - Each endpoint becomes a saved request in the collection
4. Show success toast: "Discovered 15 endpoints — saved to collection 'API Name'"
5. After save, open the new collection in the sidebar
6. Fix any TypeScript errors
7. Verify with npm run dev
```

---

### U9: Security Scanner — 3-Agent Split

**Agent 1 (Backend — Security Engine):**
```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/security-testing-context.md]

Build the Security Scanner backend:

1. apps/api/src/modules/security-scanner/security-scanner.service.ts
   - runSecurityScan(collectionId, userId) → orchestrates all OWASP checks
   - For each OWASP category (API1-API10), run specific checks:
     API1: Modify object IDs in GET/PUT/DELETE → check for 403
     API2: Remove/invalidate auth → check for 401
     API3: Add admin fields to POST/PUT → check if accepted
     API4: Send 50 rapid requests → check for 429
     API7: Send malformed body → check for stack traces in response
   - Each check returns: { category, endpoint, passed, evidence, severity }

2. apps/api/src/modules/security-scanner/attack-payloads.ts
   - Pre-built payload library for each OWASP category
   - SQL injection strings, XSS payloads, admin fields, etc.

3. apps/api/src/modules/security-scanner/SecurityReport.model.ts
   - Mongoose model: userId, collectionId, scanDate, securityScore, vulnerabilities[]

4. apps/api/src/modules/security-scanner/security-scanner.controller.ts
   - POST /api/security/scan — SSE endpoint streaming scan progress
   - GET /api/security/reports — List past scan reports

5. apps/api/src/modules/ai/features/security-analyzer.service.ts
   - AI analyzes raw findings → generates remediation guidance

Register routes. Rate limit attack requests: max 10/sec via delay queue.
Service never accesses req/res.
```

**Agent 2 (Frontend — Security Dashboard):**
```
@[.agent/skills/project-architecture.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/design-system.md]

Build the Security Scanner frontend:

1. apps/web/src/components/security/SecurityScanner.tsx + .module.css
   - Main panel: "Run Security Scan" button (with disclaimer), progress bar,
     OWASP category grid showing check status
   - Disclaimer text: "Only scan APIs you own or have permission to test"

2. apps/web/src/components/security/SecurityReportCard.tsx + .module.css
   - Card: OWASP badge (API1-API10), severity (color-coded), endpoint,
     description, evidence snippet, remediation text

3. apps/web/src/components/security/SecurityScore.tsx + .module.css
   - Circular gauge with color: green (80+), yellow (60-79), red (<60)
   - OWASP category breakdown below gauge

4. apps/web/src/stores/securityStore.ts
   - State: isScanning, progress, report, scanHistory
   - Actions: startScan(collectionId), stopScan(), loadReports()

5. apps/web/src/services/security.service.ts
   - SSE connection + report CRUD API calls

Follow TestDashboard.tsx pattern. Use CSS variables.
Severity colors: critical=--color-error, high=--color-warning, medium=--color-caution, low=--color-info.
```

---

### U10: Chaos/Fuzz Testing — 3-Agent Split

**Agent 1 (Backend — Fuzz Engine):**
```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/security-testing-context.md]

Build the Fuzz Testing backend:

1. apps/api/src/modules/fuzz-testing/payload-generators.ts
   - Functions for each category: generateBoundaryPayloads(fieldType),
     generateTypeConfusionPayloads(fieldType), generateInjectionPayloads(),
     generateXSSPayloads(), generateUnicodePayloads(), generateFormatPayloads(format),
     generateSizePayloads()
   - Each returns: [{ payload: any, description: string, category: string }]

2. apps/api/src/modules/fuzz-testing/fuzz-testing.service.ts
   - runFuzzTest(requestConfig, categories[], maxPayloads) →
     for each selected category, generate payloads → substitute into request body fields →
     execute via executor service → analyze response → classify result
   - Result classification: CRASH (500), ACCEPTED (200 for invalid data), PASS (400), LEAK (stack trace)

3. apps/api/src/modules/fuzz-testing/fuzz-testing.controller.ts
   - POST /api/fuzz/run — SSE endpoint streaming fuzz results
   - POST /api/fuzz/stop — Abort

4. apps/api/src/modules/ai/features/fuzz-analyzer.service.ts
   - AI generates CONTEXT-AWARE payloads based on field names
   - e.g., "email" field → email-shaped SQL injection: "admin'--@test.com"

Rate limit: 5 req/sec. Timeout: 5s per request. Max 200 payloads total.
```

**Agent 2 (Frontend — Fuzz UI):**
```
@[.agent/skills/project-architecture.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/design-system.md]

Build the Fuzz Testing frontend:

1. apps/web/src/components/fuzz/FuzzTestRunner.tsx + .module.css
   - Main panel: category selector (checkboxes), "Start Fuzz" button, progress, results table
   - Disclaimer: "Fuzz testing sends adversarial payloads. Only test APIs you own."

2. apps/web/src/components/fuzz/FuzzCategorySelector.tsx + .module.css
   - Checkbox grid: Boundary, Type Confusion, Injection, XSS, Unicode, Format, Size
   - Each category shows payload count estimate

3. apps/web/src/components/fuzz/FuzzResultRow.tsx + .module.css
   - Row: field name, category, payload (truncated), status code, verdict badge
   - Verdict: PASS (green), FAIL (red), CRASH (purple), LEAK (orange)
   - Expandable: full payload, full response on click

4. apps/web/src/stores/fuzzStore.ts
   - State: isRunning, selectedCategories[], results[], progress
   - Actions: startFuzz(), stopFuzz(), toggleCategory()

5. apps/web/src/services/fuzz.service.ts
   - SSE connection to fuzz endpoint

Follow SecurityScanner.tsx pattern.
```

---

## 5. Lifecycle Hooks Architecture

### What Are Hooks?

Hooks are specific points in the ATX request/response lifecycle where AI features automatically trigger. They allow features to run without explicit user action.

### Hook Points in the Request Lifecycle

```
┌─────────────────────────────────────────────────────┐
│                  ATX Request Lifecycle               │
│                                                     │
│  1. PRE_REQUEST_HOOK                                │
│     ├── U8: Request Optimizer (suggestions)         │
│     ├── U11: Smart Data Generator (auto-fill)       │
│     └── Pre-request script execution                │
│                                                     │
│  2. REQUEST EXECUTION                               │
│     └── Executor service sends HTTP request          │
│                                                     │
│  3. POST_RESPONSE_HOOK                              │
│     ├── U5: Anomaly Detection (compare to baseline) │
│     ├── Baseline update (async)                     │
│     ├── Test script execution                       │
│     └── AI auto-test (if enabled)                   │
│                                                     │
│  4. COLLECTION_RUN_COMPLETE_HOOK                    │
│     ├── U6: Performance Profiler (triggered)        │
│     ├── U12: Health Score update                    │
│     └── Test run record saved                       │
│                                                     │
│  5. PERIODIC_HOOK (every 24 hours)                  │
│     ├── U7: API Diff detection                      │
│     └── U12: Health Score daily snapshot             │
│                                                     │
│  6. COLLECTION_CHANGE_HOOK                          │
│     ├── U4: Mock Server regeneration prompt         │
│     └── U12: Coverage recalculation                 │
│                                                     │
│  7. MANUAL_TRIGGER_HOOK                             │
│     ├── U1: NL→Request (user types in NL bar)      │
│     ├── U2: Conversational Test Builder (user opens)│
│     ├── U3: API Reverse Engineer (user starts)      │
│     ├── U9: Security Scanner (user initiates)       │
│     └── U10: Fuzz Testing (user initiates)          │
└─────────────────────────────────────────────────────┘
```

### Hook Trigger Classification

| Hook | Trigger | Features | Blocking? |
|:-----|:--------|:---------|:----------|
| PRE_REQUEST | Before every request execution | U8, U11 | No (suggestions only) |
| POST_RESPONSE | After every response received | U5 | No (async analysis) |
| COLLECTION_RUN_COMPLETE | After collection runner finishes | U6, U12 | No (background) |
| PERIODIC | Cron-based (daily) | U7, U12 | No (background worker) |
| COLLECTION_CHANGE | Request added/modified/deleted | U4, U12 | No (prompt only) |
| MANUAL_TRIGGER | User explicitly clicks button | U1-U3, U9, U10 | Yes (user initiated) |

---

## 6. Hook Implementation Details

### Hook Registry (Backend)

**File Path:** `apps/api/src/modules/hooks/hook-registry.ts`

```typescript
// Hook Registry — Central registration for lifecycle hooks
// Each hook is a function that receives context and returns void (fire-and-forget)

export type HookName =
  | 'pre_request'
  | 'post_response'
  | 'collection_run_complete'
  | 'periodic_daily'
  | 'collection_change'
  | 'manual_trigger';

export interface HookContext {
  userId: string;
  requestId?: string;
  collectionId?: string;
  request?: RequestConfig;
  response?: ResponseData;
  trigger?: string;
}

export type HookHandler = (context: HookContext) => Promise<void>;

class HookRegistry {
  private hooks: Map<HookName, HookHandler[]> = new Map();

  register(hookName: HookName, handler: HookHandler): void {
    const handlers = this.hooks.get(hookName) || [];
    handlers.push(handler);
    this.hooks.set(hookName, handlers);
  }

  async trigger(hookName: HookName, context: HookContext): Promise<void> {
    const handlers = this.hooks.get(hookName) || [];
    // Run all handlers in parallel (non-blocking)
    await Promise.allSettled(handlers.map(h => h(context)));
  }
}

export const hookRegistry = new HookRegistry();
```

### Hook Registration (in app.ts startup)

```typescript
// Register Phase 3 hooks during server startup
import { hookRegistry } from './modules/hooks/hook-registry';
import { anomalyDetectionService } from './modules/anomaly-detection/anomaly-detection.service';

// POST_RESPONSE hook: Anomaly detection
hookRegistry.register('post_response', async (ctx) => {
  if (ctx.response && ctx.userId) {
    await anomalyDetectionService.analyzeAndUpdateBaseline(
      ctx.userId, ctx.request!, ctx.response
    );
  }
});

// COLLECTION_RUN_COMPLETE hook: Performance profiler trigger
hookRegistry.register('collection_run_complete', async (ctx) => {
  // Update health score cache
  // Trigger performance analysis if enough data
});

// PERIODIC hook: API diff detection (registered in cron worker)
// Runs daily at midnight
```

### Hook Integration Points

**In executor.service.ts:**
```typescript
// After executing the request and receiving response:
await hookRegistry.trigger('post_response', {
  userId,
  requestId,
  request: requestConfig,
  response: responseData
});
```

**In collection-runner.service.ts:**
```typescript
// After collection run completes:
await hookRegistry.trigger('collection_run_complete', {
  userId,
  collectionId,
  trigger: 'manual'
});
```

---

## 7. Event-Driven Agent Communication

### Frontend Hook System (React)

For frontend features that need to react to lifecycle events, use a custom event system:

**File Path:** `apps/web/src/hooks/useLifecycleHooks.ts`

```typescript
// Custom event system for frontend lifecycle hooks
type FrontendHook =
  | 'response:received'
  | 'request:sent'
  | 'collection:run:complete'
  | 'anomaly:detected'
  | 'test:complete';

const eventBus = new EventTarget();

export function emitHook(hook: FrontendHook, detail: any) {
  eventBus.dispatchEvent(new CustomEvent(hook, { detail }));
}

export function useHook(hook: FrontendHook, handler: (detail: any) => void) {
  useEffect(() => {
    const listener = (e: Event) => handler((e as CustomEvent).detail);
    eventBus.addEventListener(hook, listener);
    return () => eventBus.removeEventListener(hook, listener);
  }, [hook, handler]);
}
```

### Usage in Components

```typescript
// In RequestBuilder.tsx — emit when response received
emitHook('response:received', { requestId, response });

// In AnomalyBanner.tsx — listen for responses
useHook('response:received', async ({ requestId, response }) => {
  const anomalies = await anomalyService.analyze(requestId, response);
  if (anomalies.length > 0) {
    setAnomalies(anomalies);
    emitHook('anomaly:detected', { requestId, anomalies });
  }
});

// In RequestOptimizer.tsx — listen for responses
useHook('response:received', async ({ response }) => {
  const suggestions = await optimizerService.analyze(request, response);
  setSuggestions(suggestions);
});
```

---

## 8. Step-by-Step Setup Guide

### Initial Setup (Before Any Phase 3 Work)

```
STEP 1: Create Phase 3 Skill Files
───────────────────────────────────
Send this prompt to your AI assistant:

"Create the following skill files with the content from
docs/Phase3_03_Multi_Agent_Skills_and_Hooks.md, Section 1:

1. CREATE .agent/skills/ai-features-context.md (Skill 7)
2. CREATE .agent/skills/security-testing-context.md (Skill 8)
3. CREATE .agent/skills/data-generation-context.md (Skill 9)
4. APPEND Phase 3 rules to AGENTS.md (Section 2)"


STEP 2: Create Hook Registry
─────────────────────────────
Send this prompt:

"Create the hook registry system:
1. apps/api/src/modules/hooks/hook-registry.ts — from Section 6
2. apps/web/src/hooks/useLifecycleHooks.ts — from Section 7
3. Integrate hooks into executor.service.ts and collection-runner.service.ts"


STEP 3: Verify Setup
─────────────────────
Ask: "What are the 12 Phase 3 unique AI features?"
If it lists them correctly → skills are loaded.

Ask: "What hooks fire after a response is received?"
If it mentions anomaly detection → hooks context is loaded.
```

### Daily Workflow

```
STEP 1: Pick the next feature from Phase3_02_Master_AI_Prompts.md
STEP 2: Check if it needs 1, 2, or 3 agents (see Section 3 table)
STEP 3: For single-agent → paste the master prompt
         For multi-agent → paste sub-agent prompts in order
STEP 4: Review plan → approve → implement
STEP 5: Register any hooks in app.ts startup
STEP 6: Verify with npm run dev
STEP 7: git commit -m "feat(phase3): U{N} - {feature name}"
```

### Feature Dependencies

```
Features with NO dependencies (can build in any order):
├── U1: NL→Request
├── U8: Request Optimizer
├── U11: Smart Data Generator
└── U2: Conversational Test Builder

Features with dependencies:
├── U5: Anomaly Detection → needs history module (exists)
├── U6: Performance Profiler → needs test runs (Phase 2)
├── U7: API Diff → needs history module (exists)
├── U3: API Reverse Engineer → needs executor (exists)
├── U4: Mock Server → needs collections (exists)
├── U9: Security Scanner → needs executor (exists)
├── U10: Fuzz Testing → needs executor (exists)
└── U12: Health Score → needs U5 + U9 + test runs + coverage (build last)
```

---

*This document configures all skills, agents, and hooks for Phase 3 features. See Phase3_04 for AI system prompts used by the features themselves.*
