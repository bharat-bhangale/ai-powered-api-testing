# Phase 2 Report — Part 2: New AI & Automation Features Specification

## Transforming ATX into an Automated API Testing Tool

---

## Table of Contents

1. [Vision & Goals](#1-vision--goals)
2. [Feature List — 16 New Features (4 Phases)](#2-feature-list--16-new-features-4-phases)
3. [Phase A: Test Runner & Assertions Engine (4 Features)](#3-phase-a-test-runner--assertions-engine)
4. [Phase B: AI-Powered Automation (4 Features)](#4-phase-b-ai-powered-automation)
5. [Phase C: Advanced Testing Workflows (4 Features)](#5-phase-c-advanced-testing-workflows)
6. [Phase D: Reporting & Intelligence (4 Features)](#6-phase-d-reporting--intelligence)
7. [Technical Architecture Changes](#7-technical-architecture-changes)
8. [New Database Models](#8-new-database-models)

---

## 1. Vision & Goals

### Current State (After 7-Day Sprint)

ATX is a **manual** API testing tool. A user:
1. Builds a request → sends it → views the response
2. Can ask AI for test suggestions (but cannot run them)
3. Can ask AI to debug errors (but cannot auto-fix them)

### Target State (After Phase 2)

ATX becomes an **automated** API testing platform. The tool:
1. **Executes tests automatically** — user clicks "Run All" and gets pass/fail results
2. **Generates complete test suites** — AI creates comprehensive tests for entire collections
3. **Chains requests** — create → read → update → delete flows run sequentially with data passing
4. **Monitors continuously** — scheduled test runs catch regressions before users do
5. **Reports intelligently** — dashboards show test coverage, trends, and AI-suggested improvements

### Guiding Principle

> **Every test the AI generates should be immediately runnable** — no copy-paste, no manual setup, no external tools. The loop is: AI generates → ATX runs → user sees results.

---

## 2. Feature List — 16 New Features (4 Phases)

### Phase A: Test Runner & Assertions Engine (Foundation for Automation)

| # | Feature | What It Does | Priority |
|:--|:--------|:-------------|:---------|
| A1 | **Test Runner Engine** | Executes test scripts (`atx.test()`, `atx.expect()`) against responses and returns pass/fail results | 🔴 Critical |
| A2 | **Assertion Library** | Built-in assertion API: status checks, body structure, data types, response time, headers, JSON Schema | 🔴 Critical |
| A3 | **Test Results Panel** | Visual display of test results — pass ✅ / fail ❌ with details, timing, and error messages | 🔴 Critical |
| A4 | **Persistent Test Scripts** | Save test scripts per request — automatically run whenever the request is executed | 🟠 High |

### Phase B: AI-Powered Automation (Core Differentiator)

| # | Feature | What It Does | Priority |
|:--|:--------|:-------------|:---------|
| B1 | **AI Auto-Test on Response** | After every response, AI automatically generates AND runs tests — zero-click testing | 🔴 Critical |
| B2 | **Collection Test Runner** | "Run All Tests" button — executes every request in a collection sequentially, runs all tests, shows aggregate results | 🔴 Critical |
| B3 | **AI Test Suite Generator** | AI analyzes an entire collection and generates a comprehensive test suite covering edge cases, auth flows, and error scenarios | 🟠 High |
| B4 | **Request Chaining & Data Flow** | Chain requests: use response data from Request A as input to Request B (e.g., `{{response.body.id}}`) | 🟠 High |

### Phase C: Advanced Testing Workflows (Power User Features)

| # | Feature | What It Does | Priority |
|:--|:--------|:-------------|:---------|
| C1 | **Pre-Request Scripts** | Run JavaScript before each request — set variables, generate timestamps, compute HMAC signatures | 🟠 High |
| C2 | **Scheduled Test Runs** | Run a collection's tests on a schedule (every 5 min / hourly / daily) — background monitoring | 🟡 Medium |
| C3 | **AI Schema Validator** | AI infers the expected JSON Schema from past responses and auto-validates future responses against it | 🟡 Medium |
| C4 | **Test Environment Matrix** | Run the same test suite across multiple environments (Dev → Staging → Prod) simultaneously | 🟡 Medium |

### Phase D: Reporting & Intelligence (Visibility & Insights)

| # | Feature | What It Does | Priority |
|:--|:--------|:-------------|:---------|
| D1 | **Test Results Dashboard** | Overview: total tests, pass rate, failure trends, slowest endpoints, test duration chart | 🟠 High |
| D2 | **AI Test Coverage Analyzer** | AI reviews your collection and identifies untested endpoints, missing edge cases, and security gaps | 🟡 Medium |
| D3 | **Test Run History & Trends** | Store every test run with results — show pass/fail trends over time, detect flaky tests | 🟡 Medium |
| D4 | **AI-Generated API Documentation** | AI reads all requests+responses in a collection and generates OpenAPI/Swagger documentation | 🟢 Nice-to-have |

---

## 3. Phase A: Test Runner & Assertions Engine

### A1: Test Runner Engine

**Purpose:** Execute JavaScript test scripts against API responses and produce pass/fail results.

**Detailed Specification:**

The test runner provides a sandboxed JavaScript execution environment with the `atx` global API. When a user (or AI) writes a test, it uses `atx.test()` and `atx.expect()`:

```javascript
atx.test("Status code is 200", () => {
  atx.expect(atx.response.status).toBe(200);
});

atx.test("Response has user array", () => {
  const body = atx.response.json();
  atx.expect(body.data).toBeArray();
  atx.expect(body.data.length).toBeGreaterThan(0);
});

atx.test("Response time under 500ms", () => {
  atx.expect(atx.response.timing.total).toBeLessThan(500);
});
```

**`atx` Global API:**

| Object | Properties/Methods |
|:-------|:-------------------|
| `atx.response` | `.status`, `.statusText`, `.headers`, `.json()`, `.text()`, `.timing.total`, `.size` |
| `atx.request` | `.method`, `.url`, `.headers`, `.body` |
| `atx.expect(value)` | `.toBe(v)`, `.toEqual(v)`, `.toBeArray()`, `.toContain(v)`, `.toBeGreaterThan(v)`, `.toBeLessThan(v)`, `.toHaveProperty(key)`, `.toMatchSchema(schema)`, `.toBeTruthy()`, `.toBeFalsy()`, `.toHaveLength(n)`, `.toMatch(regex)` |
| `atx.test(name, fn)` | Registers a named test case |
| `atx.variables` | `.get(name)`, `.set(name, value)` — read/write environment variables |
| `atx.log(msg)` | Logs a message to the test console |

**Backend Implementation:**

- New module: `apps/api/src/modules/test-runner/`
- The runner uses `vm.createContext()` (Node.js `vm` module) to sandbox script execution
- Each test gets a 5-second timeout to prevent infinite loops
- Results schema: `{ tests: [{ name, passed, error?, duration }], totalPassed, totalFailed, totalDuration }`

**Frontend Implementation:**

- Test scripts are edited in a Monaco editor below the response viewer
- Results are shown in the Test Results Panel (A3)

---

### A2: Assertion Library

**Purpose:** Provide a comprehensive set of assertion methods in the `atx.expect()` chain.

**Full Assertion List:**

| Method | Description | Example |
|:-------|:------------|:--------|
| `.toBe(value)` | Strict equality (`===`) | `atx.expect(status).toBe(200)` |
| `.toEqual(value)` | Deep equality (objects/arrays) | `atx.expect(body).toEqual({ id: 1 })` |
| `.toBeTruthy()` | Value is truthy | `atx.expect(body.active).toBeTruthy()` |
| `.toBeFalsy()` | Value is falsy | `atx.expect(body.deleted).toBeFalsy()` |
| `.toBeNull()` | Value is null | `atx.expect(body.error).toBeNull()` |
| `.toBeDefined()` | Value is not undefined | `atx.expect(body.id).toBeDefined()` |
| `.toBeArray()` | Value is an array | `atx.expect(body.items).toBeArray()` |
| `.toBeObject()` | Value is a plain object | `atx.expect(body.user).toBeObject()` |
| `.toBeString()` | Value is a string | `atx.expect(body.name).toBeString()` |
| `.toBeNumber()` | Value is a number | `atx.expect(body.count).toBeNumber()` |
| `.toHaveLength(n)` | Array/string has exact length | `atx.expect(body.items).toHaveLength(10)` |
| `.toContain(item)` | Array includes item / string includes substring | `atx.expect(body.tags).toContain("api")` |
| `.toHaveProperty(key)` | Object has a property | `atx.expect(body).toHaveProperty("id")` |
| `.toHaveProperty(key, value)` | Object has property with specific value | `atx.expect(body).toHaveProperty("type", "user")` |
| `.toMatch(regex)` | String matches regex | `atx.expect(body.email).toMatch(/@/)` |
| `.toMatchSchema(schema)` | Object conforms to JSON Schema | `atx.expect(body).toMatchSchema(userSchema)` |
| `.toBeGreaterThan(n)` | Number > n | `atx.expect(body.count).toBeGreaterThan(0)` |
| `.toBeLessThan(n)` | Number < n | `atx.expect(timing).toBeLessThan(500)` |
| `.toBeGreaterThanOrEqual(n)` | Number >= n | `atx.expect(status).toBeGreaterThanOrEqual(200)` |
| `.toBeLessThanOrEqual(n)` | Number <= n | `atx.expect(status).toBeLessThanOrEqual(299)` |
| `.not` | Negates the next assertion | `atx.expect(body.error).not.toBeDefined()` |

---

### A3: Test Results Panel

**Purpose:** Visual display of test execution results below the response viewer.

**UI Specification:**

```
┌─────────────────────────────────────────────────────────────┐
│ Tests   4 passed  1 failed   Duration: 12ms                │
├─────────────────────────────────────────────────────────────┤
│ ✅ Status code is 200                               2ms    │
│ ✅ Response has user array                           3ms    │
│ ✅ Response time under 500ms                         1ms    │
│ ❌ User email is valid format                        6ms    │
│    └── Expected "john" to match /^[^@]+@[^@]+$/            │
│ ✅ Response has pagination                           0ms    │
└─────────────────────────────────────────────────────────────┘
```

**Key elements:**
- Summary bar: total passed (green), total failed (red), total duration
- Each test: icon (✅/❌) + name + duration
- Failed tests: expandable to show error message and expected vs. actual values
- "Re-run Tests" button to re-execute without re-sending the request
- "Copy Results" button to copy results as text

---

### A4: Persistent Test Scripts

**Purpose:** Save test scripts alongside saved requests so they run automatically on every execution.

**How it works:**
- Each saved request in a collection gains a `testScript` field (string of JavaScript)
- When a request is sent, the response is automatically passed to the test runner with the saved script
- The test results appear in the Test Results Panel without the user clicking anything
- AI-generated tests can be "accepted" and permanently saved to the request

**Database change:**
- Add `testScript: string` field to the `Request` model
- Add `preRequestScript: string` field (for Phase C)

---

## 4. Phase B: AI-Powered Automation

### B1: AI Auto-Test on Response

**Purpose:** After every API response, AI automatically generates AND executes tests — zero human effort.

**Flow:**
1. User sends request → backend executes → response returned
2. Frontend detects new response → triggers AI test generation in background
3. AI returns structured test suite → test runner executes all tests
4. Results appear in Test Results Panel with a "Generated by AI" badge
5. User can accept (save to request) or dismiss individual tests

**Key design decisions:**
- Auto-test runs as a background process — does NOT block the response viewer
- Tests have an "AI-generated" badge to distinguish from manual tests
- A toggle in settings allows users to disable auto-testing
- AI uses the existing `test-generator.service.ts` — no new AI service needed

---

### B2: Collection Test Runner

**Purpose:** Run every request in a collection sequentially, execute all associated tests, and show aggregate results.

**UI Specification:**

```
┌──────────────────────────────────────────────────────────────┐
│ Collection Runner: "User API Tests"                          │
│ ─────────────────────────────────────────────────────────────│
│ Progress: ████████████░░░░  8/12 requests  │ Stop │ Run All │
├──────────────────────────────────────────────────────────────┤
│ ✅ GET /api/users           200  156ms   3/3 tests passed   │
│ ✅ POST /api/users          201   89ms   4/4 tests passed   │
│ ✅ GET /api/users/:id       200   45ms   3/3 tests passed   │
│ ❌ PUT /api/users/:id       500  234ms   2/4 tests failed   │
│    ├── ❌ Status code is 200 — got 500                      │
│    └── ❌ Response has updated user — got error object       │
│ ⏳ DELETE /api/users/:id    ...  Running...                  │
│ ⬚ GET /api/users/stats     ...  Pending                    │
├──────────────────────────────────────────────────────────────┤
│ Summary: 8 run · 6 passed · 2 failed · 524ms total          │
└──────────────────────────────────────────────────────────────┘
```

**Backend implementation:**
- New endpoint: `POST /api/collections/:id/run`
- Executes requests in order, runs test scripts, collects results
- Returns aggregate: `{ results: [{ requestId, status, timing, tests: [{ name, passed }] }], summary }`
- Uses Server-Sent Events (SSE) to stream progress updates to the frontend

---

### B3: AI Test Suite Generator

**Purpose:** AI analyzes an entire collection and generates a comprehensive test suite.

**What makes this different from F21 (single-request test gen):**
- Analyzes ALL requests in the collection together
- Understands relationships between endpoints (CRUD flows)
- Generates cross-request validation (e.g., "after POST, verify GET returns the created item")
- Identifies missing test scenarios (edge cases, error paths, boundary values)
- Generates tests for auth flows (unauthorized access, expired tokens)

**Flow:**
1. User opens collection → clicks "AI: Generate Test Suite"
2. AI receives all requests with their saved responses
3. AI returns a structured plan: which tests for each endpoint + cross-endpoint chains
4. User reviews the plan → approves → tests are saved to each request

---

### B4: Request Chaining & Data Flow

**Purpose:** Use response data from one request as input to the next request.

**Chain variable syntax:** `{{chain.previousRequestName.body.fieldPath}}`

**Example flow:**
```
Step 1: POST /api/users  →  body: { name: "John" }
        Response: { id: "abc123", name: "John" }

Step 2: GET /api/users/{{chain.Create User.body.id}}
        Resolves to: GET /api/users/abc123

Step 3: PUT /api/users/{{chain.Create User.body.id}}
        body: { name: "Jane" }

Step 4: DELETE /api/users/{{chain.Create User.body.id}}
```

**How chain variables work:**
- During collection run, each request's response is stored in a chain context map
- Key = request name (from saved request), Value = full response object
- Chain variables resolve at execution time using dot-path navigation
- `{{chain.RequestName.body.data.items[0].id}}` → navigates into nested response

---

## 5. Phase C: Advanced Testing Workflows

### C1: Pre-Request Scripts

**Purpose:** Run JavaScript before a request is sent — useful for dynamic values.

**Use cases:**
- Generate timestamps: `atx.variables.set("timestamp", Date.now())`
- Compute HMAC signatures for auth
- Generate random test data
- Set conditional headers based on environment

**Pre-request `atx` API additions:**

| Object | Methods |
|:-------|:--------|
| `atx.variables` | `.set(name, value)` — write variable for this execution |
| `atx.globals` | `.set(name, value)` — write global variable persisted across requests |
| `atx.crypto` | `.hmacSHA256(data, key)`, `.md5(data)`, `.base64Encode(data)` |
| `atx.uuid()` | Generate UUID v4 |
| `atx.timestamp()` | Current Unix timestamp (ms) |

---

### C2: Scheduled Test Runs

**Purpose:** Run collection tests on a recurring schedule for continuous API monitoring.

**Implementation:**
- New model: `Schedule` (collectionId, cron expression, enabled, lastRun, nextRun)
- Backend cron worker processes schedules using `node-cron`
- Results are saved to `TestRun` model with full pass/fail data
- Email/webhook notification on failures (configurable)

**Schedule options:**
| Interval | Cron | Use Case |
|:---------|:-----|:---------|
| Every 5 minutes | `*/5 * * * *` | Critical API health check |
| Every hour | `0 * * * *` | Staging environment validation |
| Daily at midnight | `0 0 * * *` | Full regression suite |
| Weekly | `0 0 * * 0` | Comprehensive API audit |

---

### C3: AI Schema Validator

**Purpose:** AI automatically infers the expected JSON Schema from historical responses and validates future responses against it.

**How it works:**
1. After 3+ successful responses for the same endpoint, AI infers the stable schema
2. Schema is saved as a "contract" for that endpoint
3. On every future response, the schema validator checks for:
   - Missing required fields
   - Type changes (string → number)
   - New unexpected fields
   - Null values in previously non-null fields
4. Violations are shown as warnings in the response viewer

---

### C4: Test Environment Matrix

**Purpose:** Run the same test suite across multiple environments simultaneously.

**UI:** Dropdown to select environments → "Run on Dev + Staging + Prod" → matrix results:

```
              Dev        Staging     Prod
GET /users    ✅ 45ms    ✅ 120ms    ✅ 89ms
POST /users   ✅ 89ms    ❌ 500ms    ✅ 102ms
GET /users/:id ✅ 32ms   ✅ 78ms     ✅ 67ms
```

---

## 6. Phase D: Reporting & Intelligence

### D1: Test Results Dashboard

**Purpose:** Central dashboard showing testing health across all collections.

**Dashboard widgets:**
- **Pass Rate Gauge:** 87% (circular progress)
- **Test Trend Chart:** Pass/fail over the last 30 days (line chart)
- **Slowest Endpoints:** Top 5 endpoints by avg response time (bar chart)
- **Recent Failures:** List of last 10 failed tests with links to the request
- **Collection Health:** Grid of collections with pass rate and last run time

---

### D2: AI Test Coverage Analyzer

**Purpose:** AI reviews your collection and identifies gaps.

**AI output structure:**
```json
{
  "coverage": {
    "score": 72,
    "testedEndpoints": 8,
    "totalEndpoints": 11,
    "untestedEndpoints": ["DELETE /api/users/:id", "PATCH /api/users/:id", "GET /api/users/search"]
  },
  "missingTests": [
    { "endpoint": "POST /api/users", "gap": "No validation for duplicate email error (409)", "priority": "high" },
    { "endpoint": "GET /api/users", "gap": "No test for empty results (0 users)", "priority": "medium" }
  ],
  "securityGaps": [
    { "endpoint": "DELETE /api/users/:id", "issue": "No test for unauthorized access (missing auth token)", "priority": "critical" }
  ],
  "suggestions": [
    "Add rate limiting tests for POST endpoints",
    "Test with invalid JSON body to verify error handling",
    "Add boundary tests for pagination (page=0, page=-1, page=999999)"
  ]
}
```

---

### D3: Test Run History & Trends

**Purpose:** Store every test run result and visualize trends over time.

**Data model:** `TestRun` — stores timestamp, collection, environment, all results, duration, pass/fail counts.

**Features:**
- "Flaky test" detection: tests that alternate between pass/fail
- Regression alerts: a test that was passing for 7 days suddenly fails
- Performance degradation: response time increased >50% from baseline

---

### D4: AI-Generated API Documentation

**Purpose:** AI reads all requests+responses and generates OpenAPI 3.0 documentation.

**Output:** A downloadable YAML/JSON file + rendered documentation page with:
- Endpoint list with methods and paths
- Request parameters, headers, body schemas (inferred from saved requests)
- Response schemas (inferred from actual responses)
- Authentication requirements
- Example request/response pairs

---

## 7. Technical Architecture Changes

### New Backend Modules

```
apps/api/src/modules/
├── test-runner/              # NEW — Sandboxed JS executor + assertion library
│   ├── test-runner.controller.ts
│   ├── test-runner.service.ts
│   ├── test-runner.routes.ts
│   ├── assertion-library.ts  # atx.expect() implementation
│   ├── sandbox.ts            # vm.createContext() execution environment
│   └── atx-api.ts            # atx global object factory
├── collection-runner/        # NEW — Sequential collection execution
│   ├── collection-runner.controller.ts
│   ├── collection-runner.service.ts
│   └── collection-runner.routes.ts
├── schedules/                # NEW — Cron-based scheduled test runs
│   ├── schedule.controller.ts
│   ├── schedule.service.ts
│   ├── schedule.routes.ts
│   ├── Schedule.model.ts
│   └── cron-worker.ts
├── test-runs/                # NEW — Test run history + analytics
│   ├── test-run.controller.ts
│   ├── test-run.service.ts
│   ├── test-run.routes.ts
│   └── TestRun.model.ts
└── ai/
    ├── features/
    │   ├── chat.service.ts           # existing
    │   ├── test-generator.service.ts # existing (enhanced)
    │   ├── debug-assistant.service.ts # existing
    │   ├── coverage-analyzer.service.ts  # NEW
    │   ├── schema-validator.service.ts   # NEW
    │   └── doc-generator.service.ts      # NEW
    └── prompts/
        ├── test-generation.prompt.ts     # existing (enhanced)
        ├── debug-analysis.prompt.ts      # existing
        ├── coverage-analysis.prompt.ts   # NEW
        ├── schema-inference.prompt.ts    # NEW
        └── doc-generation.prompt.ts      # NEW
```

### New Frontend Components

```
apps/web/src/components/
├── test-runner/                 # NEW
│   ├── TestEditor.tsx           # Monaco editor for test scripts
│   ├── TestResultsPanel.tsx     # Pass/fail results display
│   ├── TestResultItem.tsx       # Individual test result row
│   └── TestSummaryBar.tsx       # Summary: "4 passed, 1 failed"
├── collection-runner/           # NEW
│   ├── CollectionRunner.tsx     # Main runner UI with progress
│   ├── RunnerProgress.tsx       # Progress bar with live updates
│   └── RunResultRow.tsx         # Individual request run result
├── dashboard/                   # NEW
│   ├── TestDashboard.tsx        # Overview dashboard
│   ├── PassRateGauge.tsx        # Circular progress widget
│   ├── TrendChart.tsx           # Line chart (recharts)
│   └── FailureList.tsx          # Recent failures list
└── schedules/                   # NEW
    ├── ScheduleManager.tsx      # CRUD for scheduled runs
    └── ScheduleForm.tsx         # Create/edit schedule form
```

### New Zustand Stores

```
apps/web/src/stores/
├── testRunnerStore.ts           # NEW — test script state, results, auto-test toggle
├── collectionRunnerStore.ts     # NEW — running state, progress, results
├── dashboardStore.ts            # NEW — dashboard data, filters
└── scheduleStore.ts             # NEW — schedule CRUD
```

---

## 8. New Database Models

### TestRun Model

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  collectionId: ObjectId,
  environmentId: ObjectId,
  trigger: 'manual' | 'scheduled' | 'ai',
  status: 'running' | 'completed' | 'failed' | 'cancelled',
  results: [{
    requestId: ObjectId,
    requestName: string,
    method: string,
    url: string,
    responseStatus: number,
    responseTiming: number,
    tests: [{
      name: string,
      passed: boolean,
      error?: string,
      duration: number,
    }],
  }],
  summary: {
    totalRequests: number,
    totalTests: number,
    passed: number,
    failed: number,
    duration: number,
  },
  createdAt: Date,
}
```

### Schedule Model

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  collectionId: ObjectId,
  environmentId: ObjectId,
  name: string,
  cron: string,
  enabled: boolean,
  notifyOnFailure: boolean,
  notifyEmail?: string,
  webhookUrl?: string,
  lastRunAt?: Date,
  lastRunStatus?: 'passed' | 'failed',
  nextRunAt: Date,
  createdAt: Date,
}
```

### Request Model Updates

```typescript
// Add these fields to the existing Request model:
{
  testScript: string,       // Post-response test script
  preRequestScript: string, // Pre-request script
  expectedSchema?: object,  // AI-inferred JSON Schema
}
```

---

*This document specifies all 16 new features. See Part 3 for implementation prompts, skills, and agent configuration.*
