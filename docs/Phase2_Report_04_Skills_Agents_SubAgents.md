# Phase 2 Report — Part 4: Skills, Multi-Agents & Sub-Agents Configuration

## Optimizing Claude Opus 4.6 in Google Antigravity for Token Efficiency

---

## Table of Contents

1. [Why Skills, Agents & Sub-Agents Matter](#1-why-skills-agents--sub-agents-matter)
2. [Complete Skill Files (6 Skills)](#2-complete-skill-files)
3. [AGENTS.md — Updated for Phase 2](#3-agentsmd--updated-for-phase-2)
4. [Multi-Agent Delegation Strategy](#4-multi-agent-delegation-strategy)
5. [Sub-Agent Prompts for Each Feature](#5-sub-agent-prompts-for-each-feature)
6. [Step-by-Step Usage Guide](#6-step-by-step-usage-guide)
7. [Token Budget Strategy](#7-token-budget-strategy)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Why Skills, Agents & Sub-Agents Matter

### The Token Problem

Each Claude Opus 4.6 prompt includes:
- Your message (~500 tokens)
- Conversation history (~2,000–10,000 tokens)
- Skill files loaded by Antigravity (~1,000 tokens)
- File contents Claude reads (~3,000–5,000 tokens)
- Claude's response (~2,000–8,000 tokens)

**Total per interaction: 8,000–25,000 tokens**

### The Solution: Layered Context

```
Layer 1: AGENTS.md           ← Loaded ALWAYS (rules, constraints)
Layer 2: Skill files          ← Loaded when referenced (@[skill])
Layer 3: Prompt               ← Your specific request (minimal)
Layer 4: Sub-agent delegation ← Splits work across smaller, cheaper calls
```

**How this saves tokens:**

| Without Skills | With Skills |
|:---------------|:------------|
| "Use TypeScript strict mode. Use CSS Modules, not Tailwind. Backend services never access req/res. Use Zod for validation..." (repeated in every prompt = ~200 tokens × 16 prompts = 3,200 wasted tokens) | Skills load once. Prompts just say `@[skill]`. Saves 3,000+ tokens over 16 features. |

### How Antigravity Sub-Agents Work

When you delegate a task to a sub-agent, Antigravity:
1. Creates a new conversation with its own context window
2. Loads only the relevant skill files
3. Executes the task independently
4. Returns results to the parent agent

**Benefits:**
- Parallel execution — multiple sub-agents work simultaneously
- Smaller context — each sub-agent only sees what it needs
- Failure isolation — one sub-agent crashing doesn't affect others

---

## 2. Complete Skill Files

### Skill 1: `project-architecture.md` (UPDATE existing)

**File Path:** `.agent/skills/project-architecture.md`

```markdown
# Project: AI-Powered API Testing Tool (ATX)

## Stack
- Monorepo: npm workspaces (root package.json)
- Frontend: apps/web — React 19, Vite 6, TypeScript strict
- Backend: apps/api — Express 5, TypeScript strict, Mongoose 8
- Shared types: packages/shared/src/types/
- Database: MongoDB Atlas (Mongoose ODM)
- AI: Gemini API via @google/genai (structured outputs with Zod + zodToGeminiSchema)
- LLM Gateway: apps/api/src/modules/ai/llm-gateway.ts (singleton, 3 methods: complete, completeStructured, stream)

## Response Format (ALL endpoints)
Success: { success: true, data: { ... } }
Error: { success: false, error: { code: "ERROR_CODE", message: "Human message" } }

## Auth Architecture
- Access token: JWT, 15min, sent in Authorization: Bearer header
- Refresh token: JWT, 7 days, sent in HTTP-only secure cookie
- Middleware: authenticate.ts verifies JWT, sets req.userId

## File Locations
- Backend modules: apps/api/src/modules/{name}/{name}.controller.ts, .service.ts, .routes.ts, .validation.ts
- Backend models: apps/api/src/modules/{name}/{Name}.model.ts (co-located with module)
- Frontend components: apps/web/src/components/{feature}/{ComponentName}.tsx + .module.css
- Frontend stores: apps/web/src/stores/{name}Store.ts (Zustand)
- Frontend services: apps/web/src/services/{name}.service.ts
- Frontend hooks: apps/web/src/hooks/use{Name}.ts
- AI services: apps/api/src/modules/ai/features/{name}.service.ts
- AI prompts: apps/api/src/modules/ai/prompts/{name}.prompt.ts
- CSS variables: apps/web/src/styles/variables.css

## Environment Variables (apps/api/.env)
PORT, NODE_ENV, MONGODB_URI, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, FRONTEND_URL, GEMINI_API_KEY, GEMINI_MODEL

## Key Dependencies
- Frontend: zustand, @tanstack/react-query, axios, react-router-dom, lucide-react, sonner, @monaco-editor/react
- Backend: express, mongoose, zod, jsonwebtoken, bcryptjs, cors, helmet, cookie-parser, @google/genai
```

---

### Skill 2: `backend-patterns.md` (No changes needed)

Use the existing file from Phase 1. See `docs/Skills_and_Agents_Configuration.md` Skill 2.

---

### Skill 3: `frontend-patterns.md` (No changes needed)

Use the existing file from Phase 1. See `docs/Skills_and_Agents_Configuration.md` Skill 3.

---

### Skill 4: `design-system.md` (No changes needed)

Use the existing file from Phase 1. See `docs/Skills_and_Agents_Configuration.md` Skill 4.

---

### Skill 5: `test-runner-context.md` (NEW — Phase 2)

**File Path:** `.agent/skills/test-runner-context.md`

```markdown
# Phase 2: Test Runner & Automation Context

## ATX Scripting API (atx global)
- atx.response: { status, statusText, headers, json(), text(), timing: { total }, size }
- atx.request: { method, url, headers, body }
- atx.expect(value): assertion chain → .toBe(), .toEqual(), .toBeArray(), .toContain(), .toHaveProperty(), .toMatch(regex), .toBeGreaterThan(), .toBeLessThan(), .toMatchSchema(schema), .toBeTruthy(), .toBeFalsy(), .toHaveLength(), .not (negation prefix)
- atx.test(name, fn): register named test case
- atx.variables: .get(name), .set(name, value)
- atx.log(msg): log to test console
- atx.crypto: .hmacSHA256(data, key), .md5(data), .base64Encode(data)
- atx.uuid(): UUID v4
- atx.timestamp(): Unix ms

## Test Execution
1. Request sent → response received
2. atx context built with response data
3. Script executed in vm.createContext() sandbox (5s timeout)
4. Results: { tests: [{ name, passed, error?, duration }], totalPassed, totalFailed }

## Chain Variables
- Syntax: {{chain.RequestName.body.path.to.field}}
- Stored in Map<requestName, response> during collection run
- Resolved before environment variables

## Models
- TestRun: { userId, collectionId, environmentId, trigger, status, results[], summary }
- Schedule: { userId, collectionId, cron, enabled, lastRunAt, nextRunAt }
- Request gains: testScript (string), preRequestScript (string), expectedSchema (object)

## New Modules
- test-runner/: sandbox, assertion-library, atx-api
- collection-runner/: sequential execution, chain resolver, SSE progress
- schedules/: cron worker, CRUD
- test-runs/: TestRun CRUD, aggregation, flaky detection
- ai/features/: coverage-analyzer, schema-validator, doc-generator, suite-generator
```

---

### Skill 6: `prompt-engineering.md` (NEW — for AI feature prompts)

**File Path:** `.agent/skills/prompt-engineering.md`

```markdown
# AI Prompt Engineering Standards

## Structured Output Pattern
All AI features that return structured data use:
1. Define Zod schema for expected output
2. Call llmGateway.completeStructured({ responseSchema, schemaName, ... })
3. Gateway converts Zod to Gemini schema, requests JSON output, validates with Zod

## Prompt Template for AI Services
System prompt: Define role, capabilities, constraints (keep under 500 tokens)
User prompt: Provide context data + specific instruction (keep data truncated)

## Token Management
- Truncate response bodies to max 2000 chars in prompts
- Use JSON.stringify(body).substring(0, 2000)
- Don't include full headers — only relevant ones (Content-Type, Authorization type)
- For collections: send method+URL+status only, not full request/response

## Error Handling
- If AI fails to parse, throw: "AI response could not be parsed into the expected format"
- If AI key is missing, throw: "GEMINI_API_KEY is required to use AI features"
- Always wrap AI calls in try-catch in the controller
```

---

## 3. AGENTS.md — Updated for Phase 2

**File Path:** `AGENTS.md` (project root — OVERWRITE existing)

```markdown
# Agent Instructions — AI-Powered API Testing Tool (ATX)

## Rules (MANDATORY)
1. TypeScript strict mode in ALL files
2. CSS Modules + CSS Variables only — NO Tailwind CSS
3. Validate ALL request bodies with Zod schemas
4. Backend services NEVER access req/res — receive typed params only
5. ALL API responses: { success: boolean, data?: any, error?: { code: string, message: string } }
6. ALL colors/spacing/borders from CSS variables in variables.css
7. Components: self-contained with co-located .module.css files
8. Backend module pattern: controller (thin) → service (thick) → routes
9. Named exports only — no default exports for components
10. Use crypto.randomUUID() for client-side IDs
11. AI structured outputs: Zod schema → llmGateway.completeStructured()
12. Test scripts use atx.test() and atx.expect() API
13. Sandbox execution via Node.js vm module with 5s timeout

## Available Scripts
- npm run dev — Start frontend + backend
- npm run dev:web — Frontend only (port 5173)
- npm run dev:api — Backend only (port 8000)
- npm run build --workspace=apps/web — Frontend production build
- npm run build --workspace=apps/api — Backend TypeScript compile
- npx vitest run — Run all tests

## Architecture
- State: Zustand (client) + TanStack Query (server)
- Auth: JWT access (15min) + refresh cookie (7 days)
- AI: Gemini structured outputs with Zod → zodToGeminiSchema()
- Executor: Server-side proxy with SSRF guard
- Test runner: vm.createContext() sandbox with atx global API
```

---

## 4. Multi-Agent Delegation Strategy

### For Each Feature, Use 3 Specialized Sub-Agents

When building a feature, Antigravity can delegate to sub-agents. Here's how to split work:

```
Main Agent (you talk to this one)
├── Backend Sub-Agent    ← Creates: model, service, controller, routes, validation
├── Frontend Sub-Agent   ← Creates: components, CSS, stores, services, hooks
└── Integration Sub-Agent ← Wires frontend to backend, tests, fixes issues
```

### Sub-Agent Prompt Templates

**Backend Sub-Agent:**
```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]

Build the backend for {FEATURE_NAME}.

Create these files:
- apps/api/src/modules/{module}/{module}.service.ts
- apps/api/src/modules/{module}/{module}.controller.ts
- apps/api/src/modules/{module}/{module}.routes.ts
- apps/api/src/modules/{module}/{module}.validation.ts
{- apps/api/src/modules/{module}/{Model}.model.ts (if new model)}

Follow the pattern in apps/api/src/modules/executor/
Register routes in apps/api/src/app.ts
```

**Frontend Sub-Agent:**
```
@[.agent/skills/project-architecture.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/design-system.md]

Build the frontend for {FEATURE_NAME}.

Create these files:
- apps/web/src/components/{feature}/{Component}.tsx + .module.css
- apps/web/src/stores/{feature}Store.ts
- apps/web/src/services/{feature}.service.ts

Follow the component pattern in apps/web/src/components/ai/
Use CSS variables from variables.css
```

**Integration Sub-Agent:**
```
Wire {FEATURE_NAME} frontend to backend.

Connect:
- {feature}Store.ts actions → {feature}.service.ts → backend endpoints
- Register in router.tsx (if new page)
- Add to sidebar/navigation (if needed)
- Run npm run dev and verify in browser
- Fix any TypeScript errors
```

---

## 5. Sub-Agent Prompts for Each Feature

### Which Features Need Sub-Agents vs. Single Agent

| Feature | Backend | Frontend | Integration | Recommendation |
|:--------|:--------|:---------|:------------|:---------------|
| A1: Test Runner Engine | Heavy | None | Light | **2 agents**: Backend + Integration |
| A2: Test Results Panel | None | Heavy | Light | **1 agent**: Frontend only |
| A3: Persistent Scripts | Light | Light | Medium | **1 agent**: Single prompt |
| B1: AI Auto-Test | Light | Medium | Medium | **1 agent**: Single prompt |
| B2: Collection Runner | Heavy | Heavy | Heavy | **3 agents**: Backend + Frontend + Integration |
| B3: AI Suite Generator | Heavy | Light | Light | **2 agents**: Backend AI + Frontend |
| B4: Request Chaining | Medium | None | Medium | **1 agent**: Single prompt |
| C1: Pre-Request Scripts | Medium | Light | Medium | **1 agent**: Single prompt |
| C2: Scheduled Runs | Heavy | Medium | Medium | **2 agents**: Backend + Frontend |
| C3: Schema Validator | Medium | Light | Light | **1 agent**: Single prompt |
| C4: Env Matrix | Light | Medium | Light | **1 agent**: Single prompt |
| D1: Dashboard | Medium | Heavy | Light | **2 agents**: Backend + Frontend |
| D2: Coverage Analyzer | Medium | Medium | Light | **1 agent**: Single prompt |
| D3: Run History | Light | Medium | Light | **1 agent**: Single prompt |
| D4: API Doc Generator | Medium | Medium | Light | **1 agent**: Single prompt |

### Feature B2 Example: 3-Agent Split

**Agent 1 (Backend):**
```
@[.agent/skills/project-architecture.md]
@[.agent/skills/backend-patterns.md]
@[.agent/skills/test-runner-context.md]

Build the Collection Runner backend:

1. apps/api/src/modules/collection-runner/collection-runner.service.ts
   - loadCollectionRequests(collectionId) → fetches all requests with testScripts
   - runCollection(collectionId, environmentId, userId) → executes each request sequentially:
     a. Resolve chain variables from previous responses
     b. Resolve environment variables
     c. Execute via executor service
     d. Run test script via test runner
     e. Store response in chain context map
     f. Collect results
   - Returns { results[], summary }

2. apps/api/src/modules/collection-runner/collection-runner.controller.ts
   - POST /api/collections/:id/run — SSE endpoint
   - For each completed request, send SSE event: { type: 'progress', data: { index, total, result } }
   - Final event: { type: 'complete', data: { summary } }

3. apps/api/src/modules/collection-runner/collection-runner.routes.ts
4. Register in app.ts: app.use('/api/collections', collectionRunnerRoutes)

5. apps/api/src/modules/test-runs/TestRun.model.ts — Mongoose model per spec in test-runner-context skill
6. apps/api/src/modules/test-runs/test-run.service.ts — save() and find() methods

Follow executor module pattern. Service never accesses req/res.
```

**Agent 2 (Frontend):**
```
@[.agent/skills/project-architecture.md]
@[.agent/skills/frontend-patterns.md]
@[.agent/skills/design-system.md]

Build the Collection Runner frontend:

1. apps/web/src/components/collection-runner/CollectionRunner.tsx + .module.css
   - Full-height panel with: header (collection name + Run/Stop buttons), progress bar, request list, summary footer
   - Opens as an overlay/modal from the sidebar

2. apps/web/src/components/collection-runner/RunResultRow.tsx + .module.css
   - Row: method badge, URL, status code, timing, test pass/fail counts
   - States: pending (gray), running (spinner), passed (green), failed (red)
   - Expandable: shows individual test results on click

3. apps/web/src/stores/collectionRunnerStore.ts
   - State: isRunning, progress: { current, total }, results[], summary
   - Actions: startRun(collectionId), stopRun(), clearResults()

4. apps/web/src/services/collectionRunner.service.ts
   - SSE connection to POST /api/collections/:id/run
   - Uses EventSource or fetch with ReadableStream
   - Calls store actions on each SSE event

Use CSS variables. Follow AITestSuggestions.tsx pattern for result rows.
```

**Agent 3 (Integration):**
```
Wire the Collection Runner:

1. Add "Run Collection" button to sidebar collection context menu
2. Add "Run All" button to collection header in the sidebar
3. When clicked, open CollectionRunner panel and call startRun(collectionId)
4. After run completes, save TestRun to backend
5. Show toast: "Collection run complete: 8/10 passed"
6. Run npm run dev and verify the full flow works
7. Fix any TypeScript errors
```

---

## 6. Step-by-Step Usage Guide

### Initial Setup (Do Once, Before Any Phase 2 Work)

```
STEP 1: Create/Update Skill Files
─────────────────────────────────
Open Antigravity and send this prompt:

"Create the following skill files with the content specified in
docs/Phase2_Report_04_Skills_Agents_SubAgents.md, Section 2:

1. UPDATE .agent/skills/project-architecture.md (Section 2, Skill 1)
2. CREATE .agent/skills/test-runner-context.md (Section 2, Skill 5)
3. CREATE .agent/skills/prompt-engineering.md (Section 2, Skill 6)
4. UPDATE AGENTS.md with Phase 2 content (Section 3)"


STEP 2: Verify Skills Are Working
──────────────────────────────────
Ask Claude: "What is the atx.expect() assertion API?"
If it answers correctly → skills are loaded.
If not → check file paths are correct.
```

### Daily Workflow (For Each Feature)

```
STEP 1: Pick the Next Feature
──────────────────────────────
Open docs/Phase2_Report_03_Master_Prompts.md
Follow the execution order in Section 7
Pick the next prompt

STEP 2: Send the Prompt
────────────────────────
Copy the prompt EXACTLY from the report
Paste into Antigravity chat
Wait for Claude to create an implementation plan

STEP 3: Review the Plan
────────────────────────
Read Claude's plan
Check: are the file paths correct? Does it match the spec?
If yes → approve ("Looks good, implement it")
If no → request changes ("Change X to Y")

STEP 4: Let Claude Implement
─────────────────────────────
Claude creates/modifies files
Watch for any errors in the terminal
If Claude asks questions → answer briefly

STEP 5: Verify
───────────────
Run: npm run dev
Test the feature manually in the browser
Run: npm run build --workspace=apps/web
Run: npm run build --workspace=apps/api
Fix any build errors

STEP 6: Commit
──────────────
git add -A
git commit -m "feat: {feature name}"
git push

STEP 7: Move to Next Feature
─────────────────────────────
Repeat from Step 1
```

### When to Use Sub-Agents

```
IF feature has BOTH heavy backend AND heavy frontend work:
   → Use the 3-agent split (see Section 5)
   → Send Backend Agent prompt first
   → Then send Frontend Agent prompt
   → Then send Integration Agent prompt

IF feature is backend-only OR frontend-only:
   → Use the single master prompt from Part 3
   → No sub-agents needed
```

---

## 7. Token Budget Strategy

### Estimated Token Usage Per Feature

| Feature | Prompts | Est. Input Tokens | Est. Output Tokens | Total |
|:--------|:--------|:-----------------|:-------------------|:------|
| A1: Test Runner | 1 | 800 | 4,000 | 4,800 |
| A2: Test Panel | 1 | 700 | 3,500 | 4,200 |
| A3: Persistent Scripts | 1 | 500 | 2,000 | 2,500 |
| B1: AI Auto-Test | 1 | 600 | 2,500 | 3,100 |
| B2: Collection Runner | 3 (sub-agents) | 2,100 | 9,000 | 11,100 |
| B3: AI Suite Gen | 1 | 700 | 3,000 | 3,700 |
| B4: Chaining | 1 | 600 | 2,500 | 3,100 |
| C1: Pre-Request | 1 | 500 | 2,000 | 2,500 |
| C2: Scheduled Runs | 2 | 1,200 | 5,000 | 6,200 |
| C3: Schema Validator | 1 | 600 | 2,500 | 3,100 |
| C4: Env Matrix | 1 | 500 | 2,000 | 2,500 |
| D1: Dashboard | 2 | 1,200 | 6,000 | 7,200 |
| D2: Coverage | 1 | 600 | 2,500 | 3,100 |
| D3: Run History | 1 | 600 | 2,500 | 3,100 |
| D4: API Docs | 1 | 600 | 2,500 | 3,100 |
| **TOTAL** | **~19** | **~11,300** | **~51,500** | **~62,800** |

### Comparison with Day 1–7 Approach

| Metric | Day 1–7 (verbose) | Phase 2 (skill-based) | Savings |
|:-------|:-----------------|:---------------------|:--------|
| Total prompts | ~40 | ~19 | 52% fewer |
| Avg input tokens/prompt | 2,500 | 595 | 76% less |
| Total estimated tokens | ~150,000 | ~63,000 | 58% less |

### Token-Saving Tips

1. **Don't repeat context** — If Claude already read a file in this session, reference it by name instead of asking it to read it again
2. **Use `@[skill]` references** — Always reference skills instead of typing context
3. **Keep follow-ups short** — "Fix the TypeScript error in line 42" uses fewer tokens than re-explaining the entire feature
4. **Approve quickly** — The implementation plan response costs tokens too. If the plan looks fine, approve immediately instead of requesting changes
5. **Batch small fixes** — If you have 3 small bugs, report them in one message instead of three

---

## 8. Troubleshooting

### Common Issues and Solutions

| Issue | Cause | Solution |
|:------|:------|:---------|
| Claude doesn't know about the `atx` API | `test-runner-context.md` skill not loaded | Verify file exists at `.agent/skills/test-runner-context.md` |
| Claude uses Tailwind CSS | AGENTS.md not loaded or outdated | Update AGENTS.md with Phase 2 content from Section 3 |
| "Module not found" errors | Routes not registered in app.ts | Check that new routes are added to `apps/api/src/app.ts` |
| Claude generates very long responses | Not using skills efficiently | Start prompt with `@[skill]` references to provide context |
| Sub-agent doesn't know about previous agent's work | Each sub-agent has isolated context | Include "Read the file at {path}" in the sub-agent prompt |
| Build fails after feature | TypeScript errors from new code | Run `npm run build --workspace=apps/api` and `npm run build --workspace=apps/web` after each feature |

### Recovery Prompts

**If Claude gets confused:**
```
STOP. Read AGENTS.md and all files in .agent/skills/. 
Then re-read my last request and try again.
```

**If a feature is half-implemented:**
```
The {feature} implementation is incomplete. 
Read the existing files I'll list, then complete the missing pieces:
- {file1} — exists, needs {change}
- {file2} — missing, create it
```

**If you need to restart a feature from scratch:**
```
Delete all files in apps/api/src/modules/{module}/ and 
apps/web/src/components/{feature}/. Then re-implement {feature} 
following the spec in docs/Phase2_Report_02_AI_Automation_Features_Spec.md.
```

---

*This completes the Phase 2 documentation. The four report files are:*

| # | File | Content |
|:--|:-----|:--------|
| 1 | `Phase2_Report_01_Completed_Features_Summary.md` | All 24 features from the 7-day sprint |
| 2 | `Phase2_Report_02_AI_Automation_Features_Spec.md` | 16 new features specification |
| 3 | `Phase2_Report_03_Master_Prompts.md` | Token-optimized prompts for Claude |
| 4 | `Phase2_Report_04_Skills_Agents_SubAgents.md` | Skills, agents, sub-agents, workflow guide |
