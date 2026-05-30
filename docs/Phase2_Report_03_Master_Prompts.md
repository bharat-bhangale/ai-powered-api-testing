# Phase 2 Report — Part 3: Master Prompts for Claude Opus 4.6

## Token-Optimized Prompts for Google Antigravity IDE

---

## Table of Contents

1. [Prompt Design Principles](#1-prompt-design-principles)
2. [Common Skill Context Block](#2-common-skill-context-block)
3. [Phase A Prompts: Test Runner & Assertions](#3-phase-a-prompts)
4. [Phase B Prompts: AI-Powered Automation](#4-phase-b-prompts)
5. [Phase C Prompts: Advanced Testing Workflows](#5-phase-c-prompts)
6. [Phase D Prompts: Reporting & Intelligence](#6-phase-d-prompts)
7. [Prompt Execution Order](#7-prompt-execution-order)

---

## 1. Prompt Design Principles

### Why Past Prompts Used Too Many Tokens

The Day 1–7 prompts were verbose because they included full context (architecture, file paths, coding standards) in every prompt. Claude had to re-read the same context 40 times across 40 prompts.

### How These Prompts Save Tokens

1. **Skills do the heavy lifting** — Architecture, coding standards, file paths, and design tokens are loaded once via skill files. Every prompt references skills instead of repeating context.
2. **Structured format** — Each prompt uses a compact template: GOAL → FILES → SPEC → CONSTRAINTS. No prose.
3. **One feature per prompt** — Each prompt produces exactly one deliverable. No multi-feature prompts.
4. **Reference existing code** — Prompts say "follow the pattern in X.ts" instead of describing the pattern.

### Expected Token Savings

| Approach | Avg tokens per prompt | Total for 16 features |
|:---------|:---------------------|:---------------------|
| Day 1–7 style (verbose) | ~2,000–3,000 input | ~40,000–48,000 |
| Phase 2 style (skill-based) | ~400–800 input | ~6,400–12,800 |
| **Savings** | **60–75% fewer tokens** | **~30,000+ saved** |

### Prompt Template

Every prompt below follows this structure:

```
@[skill-file] ← references a skill for persistent context

GOAL: {one-line description}

FILES TO CREATE:
- {path} — {purpose}

SPEC:
- {bullet points of requirements}

CONSTRAINTS:
- {boundaries and anti-patterns}

REFERENCE: {existing files to follow as patterns}
```

---

## 2. Common Skill Context Block

> **IMPORTANT:** Before sending ANY Phase 2 prompt, ensure these skill files exist in your project. The prompts reference them with `@[skill-path]`.

### Required Skill Files

| # | Skill File | Purpose | Already Exists? |
|:--|:-----------|:--------|:----------------|
| 1 | `.agent/skills/project-architecture.md` | Stack, file locations, response format | Check your project |
| 2 | `.agent/skills/backend-patterns.md` | Module pattern, validation, error codes | Check your project |
| 3 | `.agent/skills/frontend-patterns.md` | Components, state, CSS modules | Check your project |
| 4 | `.agent/skills/design-system.md` | Colors, spacing, typography | Check your project |
| 5 | `.agent/skills/test-runner-context.md` | **NEW** — Phase 2 context (see below) | Create before starting |

### NEW Skill: `test-runner-context.md`

**File Path:** `.agent/skills/test-runner-context.md`

Create this file before sending any Phase 2 prompt:

```markdown
# Phase 2: Test Runner & Automation Context

## ATX Scripting API (atx global)
The test runner provides a sandboxed JS environment with `atx`:
- `atx.response` — { status, statusText, headers, json(), text(), timing: { total }, size }
- `atx.request` — { method, url, headers, body }
- `atx.expect(value)` — assertion chain: .toBe(), .toEqual(), .toBeArray(), .toContain(), .toHaveProperty(), .toMatch(), .toBeGreaterThan(), .toBeLessThan(), .toMatchSchema(), .toBeTruthy(), .toBeFalsy(), .toHaveLength(), .not (negation)
- `atx.test(name, fn)` — register a named test
- `atx.variables` — .get(name), .set(name, value)
- `atx.log(msg)` — log to test console

## Test Execution Flow
1. Request sent → response received
2. Test script parsed → atx context built with response data
3. Script executed in vm.createContext() sandbox (5s timeout)
4. Results collected: { tests: [{ name, passed, error?, duration }] }

## Chain Variables (Collection Runner)
- Syntax: {{chain.RequestName.body.path.to.field}}
- During collection run, each response is stored in chain context
- Chain vars resolve before variable resolution

## New Models
- TestRun: stores collection run results (trigger, status, results[], summary)
- Schedule: stores cron schedules (cron, enabled, lastRun, nextRun)
- Request model gains: testScript (string), preRequestScript (string)

## New Backend Modules
- test-runner/ — sandbox execution, assertion library
- collection-runner/ — sequential collection execution with SSE progress
- schedules/ — cron worker for scheduled runs
- test-runs/ — test run history storage
- ai/features/ additions: coverage-analyzer, schema-validator, doc-generator
```

---

## 3. Phase A Prompts

### Prompt A1: Test Runner Engine

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/test-runner-context.md]

GOAL: Build the test runner engine — a sandboxed JS executor that runs `atx.test()` scripts against API responses.

FILES TO CREATE:
- apps/api/src/modules/test-runner/sandbox.ts — vm.createContext() sandbox with 5s timeout
- apps/api/src/modules/test-runner/atx-api.ts — Factory that builds the `atx` global object from request+response data
- apps/api/src/modules/test-runner/assertion-library.ts — atx.expect() chain implementation with all assertion methods
- apps/api/src/modules/test-runner/test-runner.service.ts — Service that orchestrates: build atx context → execute script → collect results
- apps/api/src/modules/test-runner/test-runner.controller.ts — POST /api/test-runner/execute endpoint
- apps/api/src/modules/test-runner/test-runner.routes.ts — Route registration
- apps/api/src/modules/test-runner/test-runner.validation.ts — Zod schemas for request body

SPEC:
- sandbox.ts: Use Node.js `vm` module. Create isolated context with `atx` global. Set 5000ms timeout. Catch errors gracefully. Return { tests: TestResult[], logs: string[] }
- atx-api.ts: Build `atx` object from { request, response } data. atx.response.json() parses body. atx.response.timing.total is a number in ms. atx.variables.get/set uses an in-memory map seeded from environment variables
- assertion-library.ts: Implement `expect(value)` returning a chainable object. Support `.not` negation via a `negated` flag. Each assertion throws AssertionError with { expected, actual, message }
- test-runner.service.ts: Receives { script: string, request, response, variables? }. Builds atx context → runs in sandbox → returns { tests[], totalPassed, totalFailed, duration, logs[] }
- Controller: POST /api/test-runner/execute — receives { script, request, response } — returns { success: true, data: { results } }

CONSTRAINTS:
- Service NEVER accesses req/res directly
- Sandbox must be truly isolated — no access to process, require, fs, or network
- Each test gets an individual try-catch so one failure doesn't stop others
- Follow the module pattern in apps/api/src/modules/executor/ as reference

REFERENCE: apps/api/src/modules/executor/executor.service.ts for module pattern
```

---

### Prompt A2: Test Results Panel (Frontend)

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/design-system.md]
@[.agent/skills/test-runner-context.md]

GOAL: Build the Test Results Panel — shows pass/fail results below the response viewer, plus a Test Script Editor.

FILES TO CREATE:
- apps/web/src/components/test-runner/TestResultsPanel.tsx + .module.css — Main panel with summary bar + results list
- apps/web/src/components/test-runner/TestResultItem.tsx + .module.css — Individual test row (✅/❌ + name + duration + error details)
- apps/web/src/components/test-runner/TestSummaryBar.tsx + .module.css — "4 passed · 1 failed · 12ms"
- apps/web/src/components/test-runner/TestEditor.tsx + .module.css — Monaco editor for writing test scripts
- apps/web/src/stores/testRunnerStore.ts — Zustand store: testScript, results, isRunning, autoTest toggle
- apps/web/src/services/testRunner.service.ts — API call to POST /api/test-runner/execute

SPEC:
- TestResultsPanel: Renders TestSummaryBar + list of TestResultItem components. Shows below ResponseViewer when tests exist. Has "Run Tests" button and "Re-run" button.
- TestResultItem: Icon (✅ green check / ❌ red X), test name, duration in ms. Failed tests expand to show error: "Expected X to be Y" with expected/actual highlighting.
- TestSummaryBar: Green count for passed, red count for failed, gray for total duration. Compact single-line bar.
- TestEditor: Monaco editor with JavaScript mode. Tab in the request builder alongside Params/Headers/Body/Auth. Stores content in testRunnerStore.
- testRunnerStore: { testScript: string, results: TestResult[] | null, isRunning: boolean, autoTestEnabled: boolean, runTests(), setScript(), clearResults() }

CONSTRAINTS:
- CSS Modules only, all colors from CSS variables
- Follow existing component patterns (see AITestSuggestions.tsx for similar UI)
- Monaco editor reuses the same configuration as BodyEditor.tsx
- Results must be scrollable if there are many tests

REFERENCE: apps/web/src/components/ai/AITestSuggestions.tsx for panel pattern
```

---

### Prompt A3: Persistent Test Scripts + Request Model Update

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]

GOAL: Add testScript and preRequestScript fields to the Request model. Update the request CRUD to save/load test scripts. Wire test auto-execution into the executor flow.

FILES TO MODIFY:
- apps/api/src/modules/requests/Request.model.ts — Add testScript and preRequestScript string fields (default empty)
- apps/api/src/modules/requests/request.validation.ts — Add optional testScript and preRequestScript to create/update schemas
- apps/api/src/modules/requests/request.controller.ts — Include test scripts in CRUD responses
- apps/web/src/stores/requestStore.ts — Add testScript and preRequestScript to Tab interface
- apps/web/src/components/sidebar/CollectionTree.tsx — When loading a saved request, also load its testScript

SPEC:
- Request.model: Add `testScript: { type: String, default: '' }` and `preRequestScript: { type: String, default: '' }`
- When a saved request is loaded into a tab, its testScript populates the TestEditor (from A2)
- When saving a request (Ctrl+S), also save the current testScript from testRunnerStore
- After executor returns a response AND testScript is non-empty, automatically run the test script

CONSTRAINTS:
- Backwards compatible — existing requests without testScript should work fine (default empty)
- Don't break existing save/load flows
- Test auto-run should be a non-blocking background operation

REFERENCE: apps/api/src/modules/requests/request.controller.ts for existing CRUD
```

---

## 4. Phase B Prompts

### Prompt B1: AI Auto-Test on Response

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/test-runner-context.md]

GOAL: After every API response, automatically trigger AI test generation AND execute the generated tests — zero-click testing.

FILES TO MODIFY:
- apps/web/src/stores/testRunnerStore.ts — Add autoTestEnabled toggle and autoGenerateAndRun() action
- apps/web/src/components/request-builder/RequestBuilder.tsx — After response received, check autoTestEnabled → call autoGenerateAndRun()
- apps/web/src/components/test-runner/TestResultsPanel.tsx — Show "AI-generated" badge on auto-generated results

FILES TO CREATE:
- apps/web/src/hooks/useAutoTest.ts — Hook that watches for new responses and triggers AI test gen + execution pipeline

SPEC:
- useAutoTest hook: Watches requestStore's active tab response. When response changes, if autoTestEnabled: (1) Call AI test generation API, (2) receive test scripts, (3) call test runner API with scripts + response, (4) store results in testRunnerStore
- The pipeline must NOT block the response viewer — response appears immediately, tests load asynchronously
- Show a loading spinner "AI is generating tests..." in TestResultsPanel while running
- Add a toggle switch in TestResultsPanel header: "Auto-test ⚡" (on/off)
- Auto-generated results get a small "🤖 AI" badge next to each test name
- User can click "Save Tests" to persist auto-generated scripts to the request

CONSTRAINTS:
- Don't re-trigger if response hasn't changed
- If user already has manual testScript, run both: manual tests first, then AI-generated
- Error in AI generation should NOT crash the response viewer — fail silently with a toast

REFERENCE: apps/web/src/components/ai/AITestSuggestions.tsx for existing AI test generation flow
```

---

### Prompt B2: Collection Test Runner

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/test-runner-context.md]

GOAL: Build the Collection Runner — executes all requests in a collection sequentially, runs their test scripts, and shows aggregate results with live progress via SSE.

BACKEND FILES TO CREATE:
- apps/api/src/modules/collection-runner/collection-runner.service.ts — Loads collection requests, executes each in order, runs test scripts, resolves chain variables, collects results
- apps/api/src/modules/collection-runner/collection-runner.controller.ts — POST /api/collections/:id/run (SSE endpoint streaming progress) + GET /api/collections/:id/runs (history)
- apps/api/src/modules/collection-runner/collection-runner.routes.ts
- apps/api/src/modules/test-runs/TestRun.model.ts — Mongoose model for storing run results
- apps/api/src/modules/test-runs/test-run.service.ts — CRUD for test run records

FRONTEND FILES TO CREATE:
- apps/web/src/components/collection-runner/CollectionRunner.tsx + .module.css — Main runner panel with progress bar, request list, aggregate summary
- apps/web/src/components/collection-runner/RunResultRow.tsx + .module.css — Single request result row (method badge, URL, status, timing, test pass/fail)
- apps/web/src/stores/collectionRunnerStore.ts — Zustand: isRunning, progress, results[], startRun(), stopRun()
- apps/web/src/services/collectionRunner.service.ts — SSE connection to backend runner endpoint

SPEC:
- Backend SSE: Each request completion sends an event: { type: 'progress', data: { requestIndex, total, requestName, status, timing, testResults } }. Final event: { type: 'complete', data: { summary } }
- Chain variables: During run, store each response in a Map<requestName, response>. Before executing next request, resolve {{chain.Name.body.path}} variables
- Frontend: Show progress bar (e.g., "8/12 requests"), each row updates live as SSE events arrive. Summary bar at bottom shows total pass/fail
- "Stop" button sends abort signal to cancel remaining requests
- After completion, save TestRun to database for history

CONSTRAINTS:
- Requests execute sequentially (NOT parallel) — order matters for chaining
- If a request fails (network error), mark it as failed and continue to the next
- Each request's test script is optional — requests without tests still show status/timing
- SSE connection must handle disconnection gracefully

REFERENCE: 
- apps/api/src/modules/executor/executor.service.ts for request execution
- apps/api/src/modules/ai/ai.controller.ts for SSE streaming pattern
```

---

### Prompt B3: AI Test Suite Generator

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/test-runner-context.md]

GOAL: Build the AI Test Suite Generator — AI analyzes all requests in a collection and generates a comprehensive, cross-endpoint test suite.

FILES TO CREATE:
- apps/api/src/modules/ai/features/suite-generator.service.ts — Service that sends entire collection context to AI and receives structured test suite
- apps/api/src/modules/ai/prompts/suite-generation.prompt.ts — System prompt + user prompt builder for collection-level test generation

FILES TO MODIFY:
- apps/api/src/modules/ai/ai.controller.ts — Add POST /api/ai/generate-suite endpoint
- apps/api/src/modules/ai/ai.routes.ts — Register new route

SPEC:
- Suite generator receives: collectionId → loads all requests with their saved responses → sends to AI
- AI prompt instructs: analyze all endpoints together, generate tests per endpoint AND cross-endpoint chain tests
- Structured output Zod schema: { suiteTests: [{ requestId, requestName, tests: [{ name, category, assertion, script }] }], chainTests: [{ name, steps: [{ requestName, testScript }], description }], coverage: { score, gaps[] } }
- The response is large — use a higher maxTokens (8000) for this endpoint
- Cross-endpoint tests are chain test scripts that validate CRUD flows (create → read → verify → update → verify → delete → verify-deleted)

CONSTRAINTS:
- Truncate response bodies to 1000 chars each to avoid token explosion
- If collection has > 20 requests, process in batches of 10
- All test scripts must use `atx.test()` and `atx.expect()` API
- Follow existing AI service pattern in test-generator.service.ts

REFERENCE: apps/api/src/modules/ai/features/test-generator.service.ts
```

---

### Prompt B4: Request Chaining & Data Flow

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/test-runner-context.md]

GOAL: Implement chain variable resolution — use response data from previous requests in the collection runner as input to subsequent requests.

FILES TO CREATE:
- apps/api/src/modules/collection-runner/chain-resolver.ts — Resolves {{chain.RequestName.body.path}} variables from the chain context map

FILES TO MODIFY:
- apps/api/src/modules/collection-runner/collection-runner.service.ts — Integrate chain resolver into the sequential execution loop

SPEC:
- Chain context: Map<string, { status, headers, body, timing }> — keyed by request name
- Chain variable syntax: {{chain.RequestName.body.data.id}} or {{chain.RequestName.headers.authorization}} or {{chain.RequestName.status}}
- Resolver: Parse all {{chain.*}} patterns → look up request name in map → navigate dot path into response object → replace with value
- Array access: {{chain.ListUsers.body.data[0].id}} → supports bracket notation
- If chain variable can't be resolved (request not yet executed or path invalid), leave as-is and add warning to results
- Chain resolution runs BEFORE environment variable resolution (so chain results can feed into {{env_var}} patterns)

CONSTRAINTS:
- Request names must match exactly (case-sensitive)
- Prevent circular dependencies (A → B → A)
- Handle missing/null values gracefully — don't throw, warn
- Deep object navigation must be safe (no TypeError on undefined.property)

REFERENCE: apps/api/src/modules/executor/executor.service.ts for variable resolution pattern
```

---

## 5. Phase C Prompts

### Prompt C1: Pre-Request Scripts

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/test-runner-context.md]

GOAL: Add pre-request script execution — run JavaScript before a request is sent to set dynamic variables, compute signatures, or generate data.

FILES TO MODIFY:
- apps/api/src/modules/test-runner/atx-api.ts — Add atx.crypto (hmacSHA256, md5, base64Encode), atx.uuid(), atx.timestamp() to the atx global
- apps/api/src/modules/executor/executor.service.ts — Before executing request, run preRequestScript in sandbox. Variables set via atx.variables.set() are injected into request config.
- apps/web/src/components/test-runner/TestEditor.tsx — Add a tab for "Pre-request" script alongside "Tests" script

SPEC:
- Pre-request atx API additions: atx.variables.set(name, value), atx.globals.set(name, value), atx.crypto.hmacSHA256(data, key), atx.crypto.md5(data), atx.crypto.base64Encode(data), atx.uuid(), atx.timestamp()
- Execution order: Pre-request script → variable resolution (including any new variables set by script) → HTTP execution → post-response test script
- Pre-request script has access to atx.request (read-only) and atx.variables
- Variables set via atx.variables.set() only persist for this execution
- Variables set via atx.globals.set() persist to the environment (write to DB)

CONSTRAINTS:
- Pre-request scripts share the same sandbox and timeout as test scripts
- Don't import any Node.js crypto directly in the sandbox — provide wrapper functions
- atx.crypto methods use Node.js crypto module internally but expose a clean API

REFERENCE: apps/api/src/modules/test-runner/sandbox.ts
```

---

### Prompt C2: Scheduled Test Runs

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/test-runner-context.md]

GOAL: Build scheduled test runs — run a collection's tests on a cron schedule with notifications on failure.

FILES TO CREATE:
- apps/api/src/modules/schedules/Schedule.model.ts — Mongoose model: userId, collectionId, environmentId, name, cron, enabled, notifyOnFailure, webhookUrl, lastRunAt, lastRunStatus, nextRunAt
- apps/api/src/modules/schedules/schedule.service.ts — CRUD + next-run calculation
- apps/api/src/modules/schedules/schedule.controller.ts — CRUD endpoints
- apps/api/src/modules/schedules/schedule.routes.ts
- apps/api/src/modules/schedules/schedule.validation.ts — Zod schemas
- apps/api/src/modules/schedules/cron-worker.ts — Polls for due schedules every 30s, executes collection runner, saves TestRun, sends webhook on failure
- apps/web/src/components/schedules/ScheduleManager.tsx + .module.css — List of schedules with enable/disable toggle
- apps/web/src/components/schedules/ScheduleForm.tsx + .module.css — Create/edit form: collection picker, environment picker, cron builder, notification settings
- apps/web/src/stores/scheduleStore.ts — Zustand CRUD
- apps/web/src/services/schedule.service.ts — API calls

SPEC:
- Cron worker: setInterval(30000) checks Schedule.find({ enabled: true, nextRunAt: { $lte: now } }). For each due schedule: run collection → save TestRun → update lastRunAt/nextRunAt → if failed and notifyOnFailure, send webhook
- Webhook payload: { scheduleName, collectionName, status: 'failed', summary: { passed, failed, total }, failedTests: [{ name, error }], timestamp }
- Frontend cron builder: preset options (every 5 min, hourly, daily, weekly) + custom cron input
- Schedule list shows: name, collection, next run, last status (green/red badge)

CONSTRAINTS:
- Max 10 schedules per user (free tier limit)
- Minimum interval: 5 minutes
- Cron worker runs in the same Express process (no separate worker needed for MVP)
- Use node-cron for cron expression parsing (nextRunAt calculation)

REFERENCE: apps/api/src/modules/history/history.service.ts for model CRUD pattern
```

---

### Prompt C3: AI Schema Validator

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/test-runner-context.md]

GOAL: Build the AI Schema Validator — AI infers expected JSON Schema from historical responses and auto-validates future responses against it.

FILES TO CREATE:
- apps/api/src/modules/ai/features/schema-validator.service.ts — Infers schema from historical responses, validates new responses against saved schema
- apps/api/src/modules/ai/prompts/schema-inference.prompt.ts — Prompt for AI to analyze responses and produce JSON Schema

FILES TO MODIFY:
- apps/api/src/modules/ai/ai.controller.ts — Add POST /api/ai/infer-schema and POST /api/ai/validate-schema endpoints
- apps/api/src/modules/ai/ai.routes.ts — Register routes
- apps/api/src/modules/requests/Request.model.ts — Add expectedSchema field (JSON object, optional)

SPEC:
- Schema inference: Takes 3+ historical response bodies for the same endpoint → AI generates JSON Schema (draft-07) describing the expected structure
- Schema validation: Takes a new response body + saved schema → returns { valid: boolean, violations: [{ path, expected, actual, message }] }
- Violations shown as warnings in the response viewer (yellow badge: "2 schema violations")
- AI prompt for inference: "Analyze these response bodies and generate a JSON Schema. Mark consistently present fields as required. Infer types from values. Allow flexibility for arrays (items schema, not tuple)."

CONSTRAINTS:
- Schema validation runs locally (no AI call) using ajv library — only inference uses AI
- Maximum 5 historical responses sent to AI (truncated to 2000 chars each)
- Schema stored on the Request model as a plain JSON object

REFERENCE: apps/api/src/modules/ai/features/test-generator.service.ts
```

---

### Prompt C4: Test Environment Matrix

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/test-runner-context.md]

GOAL: Build the Environment Matrix Runner — run the same collection tests across multiple environments simultaneously and show comparative results.

FILES TO MODIFY:
- apps/api/src/modules/collection-runner/collection-runner.controller.ts — Add POST /api/collections/:id/run-matrix that accepts environmentIds[] array
- apps/api/src/modules/collection-runner/collection-runner.service.ts — Add runMatrix() that runs collection against each environment in parallel

FILES TO CREATE:
- apps/web/src/components/collection-runner/MatrixResults.tsx + .module.css — Grid view: rows=requests, columns=environments, cells=status+timing

SPEC:
- Backend: runMatrix(collectionId, environmentIds[]) → runs collection runner once per environment (parallel with Promise.allSettled) → returns { environments: [{ envName, results[] }] }
- Frontend: Matrix grid with request names on Y-axis, environment names on X-axis. Each cell shows: ✅/❌ + response time. Color-coded: green=pass, red=fail, gray=skipped
- Click a cell to see full test results for that request+environment combination
- If all environments pass, summary says "All environments healthy ✅"

CONSTRAINTS:
- Max 5 environments per matrix run
- Each environment run is independent — no shared chain context between environments
- Results are saved as separate TestRun records (one per environment)

REFERENCE: apps/web/src/components/collection-runner/CollectionRunner.tsx
```

---

## 6. Phase D Prompts

### Prompt D1: Test Results Dashboard

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/design-system.md]

GOAL: Build the Test Results Dashboard — a central overview page showing testing health across all collections.

FILES TO CREATE:
- apps/web/src/components/dashboard/TestDashboard.tsx + .module.css — Main dashboard layout with widget grid
- apps/web/src/components/dashboard/PassRateGauge.tsx + .module.css — Circular gauge showing overall pass rate percentage
- apps/web/src/components/dashboard/TrendChart.tsx + .module.css — Line chart showing pass/fail trends over last 30 days (use recharts library)
- apps/web/src/components/dashboard/SlowestEndpoints.tsx + .module.css — Horizontal bar chart of top 5 slowest endpoints
- apps/web/src/components/dashboard/RecentFailures.tsx + .module.css — List of last 10 failed tests with links
- apps/web/src/components/dashboard/CollectionHealth.tsx + .module.css — Grid of collection cards with pass rate badges
- apps/web/src/stores/dashboardStore.ts — Zustand: dashboardData, isLoading, fetchDashboard(), dateRange filter
- apps/web/src/services/dashboard.service.ts — GET /api/dashboard/summary, GET /api/dashboard/trends

BACKEND FILES TO CREATE:
- apps/api/src/modules/dashboard/dashboard.controller.ts — Aggregation endpoints
- apps/api/src/modules/dashboard/dashboard.service.ts — MongoDB aggregation pipelines on TestRun collection
- apps/api/src/modules/dashboard/dashboard.routes.ts

SPEC:
- Dashboard is a new route: /dashboard (add to router.tsx)
- PassRateGauge: SVG circular gauge, green if >80%, yellow if 60-80%, red if <60%
- TrendChart: recharts LineChart with two lines (passed=green, failed=red) over 30 days
- Backend aggregation: Group TestRuns by date, calculate daily pass/fail counts, average response times per endpoint
- Dashboard auto-refreshes every 60s

CONSTRAINTS:
- Use recharts library (install as dependency)
- All chart colors from CSS variables
- Dashboard must work with zero data (show "No test runs yet" empty state)
- Mobile responsive: widgets stack vertically on small screens

REFERENCE: apps/web/src/components/ai/AIUsageIndicator.tsx for widget pattern
```

---

### Prompt D2: AI Test Coverage Analyzer

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/test-runner-context.md]

GOAL: Build the AI Test Coverage Analyzer — AI reviews a collection and identifies untested endpoints, missing edge cases, and security gaps.

FILES TO CREATE:
- apps/api/src/modules/ai/features/coverage-analyzer.service.ts — Sends collection summary to AI, receives structured coverage report
- apps/api/src/modules/ai/prompts/coverage-analysis.prompt.ts — System prompt + user prompt builder
- apps/web/src/components/ai/AICoverageReport.tsx + .module.css — Display coverage score, gaps list, suggestions

FILES TO MODIFY:
- apps/api/src/modules/ai/ai.controller.ts — Add POST /api/ai/coverage endpoint
- apps/api/src/modules/ai/ai.routes.ts — Register route

SPEC:
- Coverage analyzer receives: all requests in collection with their test scripts (if any)
- AI structured output schema: { coverage: { score (0-100), testedEndpoints, totalEndpoints, untestedEndpoints[] }, missingTests: [{ endpoint, gap, priority }], securityGaps: [{ endpoint, issue, priority }], suggestions: string[] }
- Frontend: Circular score badge, two lists (missing tests + security gaps) sorted by priority, suggestion cards
- "Generate Missing Tests" button: for each gap, generate the test script and offer to save

CONSTRAINTS:
- Don't send response bodies to AI for this analysis — only method, URL, status, and test script names
- Maximum prompt size: 3000 tokens (truncate if needed)
- Priority levels: critical (red), high (orange), medium (yellow), low (gray)

REFERENCE: apps/api/src/modules/ai/features/debug-assistant.service.ts for structured output pattern
```

---

### Prompt D3: Test Run History & Trends

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/frontend-patterns.md]

GOAL: Build the Test Run History page — shows all past test runs with results, and detects flaky tests and regressions.

FILES TO CREATE:
- apps/web/src/components/test-runs/TestRunHistory.tsx + .module.css — Paginated list of past test runs with filters (collection, date range, status)
- apps/web/src/components/test-runs/TestRunDetail.tsx + .module.css — Detailed view of a single run with per-request results
- apps/web/src/components/test-runs/FlakyTestBadge.tsx + .module.css — Badge showing flaky test indicator
- apps/web/src/stores/testRunStore.ts — Zustand: runs[], isLoading, fetchRuns(), selectedRun
- apps/web/src/services/testRun.service.ts — API calls for test run CRUD

BACKEND FILES TO MODIFY:
- apps/api/src/modules/test-runs/test-run.controller.ts — Add GET /api/test-runs (paginated, filterable), GET /api/test-runs/:id (detail), GET /api/test-runs/flaky (flaky test detection)
- apps/api/src/modules/test-runs/test-run.service.ts — Add flaky detection: tests that alternated pass/fail in last 10 runs

SPEC:
- Test run list: timestamp, collection name, trigger (manual/scheduled/ai), pass/fail counts, duration, status badge
- Flaky detection: A test is "flaky" if it passed in some runs and failed in others (last 10 runs). Show 🔄 badge
- Regression detection: A test that passed for 5+ consecutive runs then failed. Show ⚠️ badge
- Each run is clickable → shows TestRunDetail with full per-request breakdown

CONSTRAINTS:
- Paginate with cursor-based pagination (not offset)
- Default sort: newest first
- Filters: collection (dropdown), status (all/passed/failed), date range (date picker)

REFERENCE: apps/web/src/components/history/HistoryPanel.tsx for list pattern
```

---

### Prompt D4: AI-Generated API Documentation

```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/test-runner-context.md]

GOAL: Build the AI API Documentation Generator — AI reads all requests+responses in a collection and generates OpenAPI 3.0 documentation.

FILES TO CREATE:
- apps/api/src/modules/ai/features/doc-generator.service.ts — Sends collection data to AI, receives OpenAPI spec
- apps/api/src/modules/ai/prompts/doc-generation.prompt.ts — Prompt for generating OpenAPI 3.0 YAML
- apps/web/src/components/ai/AIDocGenerator.tsx + .module.css — "Generate Docs" button, preview panel, download button

FILES TO MODIFY:
- apps/api/src/modules/ai/ai.controller.ts — Add POST /api/ai/generate-docs endpoint
- apps/api/src/modules/ai/ai.routes.ts — Register route

SPEC:
- AI receives: collection name, all requests (method, URL, headers, body examples), all responses (status, body examples)
- AI generates: OpenAPI 3.0 spec as YAML string with paths, schemas (inferred from examples), auth requirements, descriptions
- Frontend: Button in collection header "📄 Generate API Docs". Shows rendered documentation in a modal/panel. Download as .yaml or .json button.
- Use `js-yaml` to parse/display the generated YAML

CONSTRAINTS:
- This is a text completion (not structured output) since OpenAPI YAML is free-form
- Truncate large response bodies to 1500 chars
- Max 30 endpoints per generation (batch if more)
- Generated spec should be valid OpenAPI 3.0 (AI prompt must enforce this)

REFERENCE: apps/api/src/modules/ai/features/chat.service.ts for text completion pattern
```

---

## 7. Prompt Execution Order

### Recommended Implementation Sequence

Execute these prompts in this exact order. Each builds on the previous.

```
WEEK 1: FOUNDATION
├── Day 1: Prompt A1 (Test Runner Engine)           ← Must be first
├── Day 2: Prompt A2 (Test Results Panel)           ← UI for A1
├── Day 3: Prompt A3 (Persistent Test Scripts)      ← Save/load for A1
└── Day 4: Prompt B1 (AI Auto-Test on Response)     ← AI + A1

WEEK 2: AUTOMATION
├── Day 5: Prompt B4 (Request Chaining)             ← Needed by B2
├── Day 6: Prompt B2 (Collection Test Runner)       ← Core automation
├── Day 7: Prompt B3 (AI Test Suite Generator)      ← AI + B2
└── Day 8: Prompt C1 (Pre-Request Scripts)          ← Extends A1

WEEK 3: ADVANCED
├── Day 9:  Prompt C2 (Scheduled Test Runs)         ← Needs B2
├── Day 10: Prompt C3 (AI Schema Validator)         ← AI analysis
├── Day 11: Prompt C4 (Environment Matrix)          ← Needs B2
└── Day 12: Prompt D1 (Test Dashboard)              ← Needs test runs

WEEK 4: INTELLIGENCE
├── Day 13: Prompt D2 (AI Coverage Analyzer)        ← AI analysis
├── Day 14: Prompt D3 (Test Run History)            ← Data from B2/C2
└── Day 15: Prompt D4 (AI API Doc Generator)        ← Nice-to-have
```

### Per-Prompt Workflow

For each prompt:
1. **Copy the prompt** from this document
2. **Paste into Antigravity** (Claude Opus 4.6 Thinking model)
3. **Let Claude plan** — review the implementation plan, approve
4. **Let Claude implement** — it creates/modifies the files
5. **Verify** — run `npm run dev`, test the feature manually
6. **Commit** — `git add -A && git commit -m "feat: {feature name}"`

---

*This document contains all 16 master prompts. See Part 4 for Skills, Agents, and Sub-Agent configuration.*
