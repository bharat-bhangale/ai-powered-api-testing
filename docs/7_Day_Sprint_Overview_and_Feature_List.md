# 7-Day Sprint: AI-Powered API Testing Tool

## Complete Implementation Guide — Overview & Feature List

**Developer:** Bharat Bhangale  
**Sprint Duration:** May 23–30, 2026 (7 Days)  
**Tool:** Google Antigravity IDE with Claude Opus 4.6  
**Stack:** React 19 + TypeScript (Vite) | Express.js 5 + TypeScript | MongoDB Atlas | Redis

---

## Table of Contents

1. [Sprint Philosophy](#1-sprint-philosophy)
2. [Essential Features for 7-Day Sprint](#2-essential-features-for-7-day-sprint)
3. [Day-by-Day Execution Plan](#3-day-by-day-execution-plan)
4. [Google Antigravity Productivity Guide](#4-google-antigravity-productivity-guide)
5. [Skills, Hooks & Sub-Agents Configuration](#5-skills-hooks--sub-agents-configuration)
6. [Report File Index](#6-report-file-index)

---

## 1. Sprint Philosophy

### Core Principle: Build the "Request → Response" Loop First

The #1 mistake in building an API testing tool is starting with secondary features (collections, environments, AI). Instead, follow this priority chain:

```
Day 1-2: Can a user SEND a request and SEE a response?      ← MUST
Day 3:   Can a user ORGANIZE requests into collections?      ← MUST
Day 4:   Can a user SWITCH environments and use variables?   ← MUST
Day 5:   Can a user SEE request history?                     ← SHOULD
Day 5:   Can a user IMPORT from cURL/Postman?                ← SHOULD
Day 6:   Can the AI GENERATE tests and DEBUG errors?         ← DIFFERENTIATOR
Day 7:   Is the app POLISHED and DEPLOYABLE?                 ← LAUNCH
```

### Why This Order Works

| Order | Reasoning |
|:------|:----------|
| **Request Builder FIRST** | This is the core product. Without it, nothing else matters. Every minute spent here pays 10x dividends in user value. |
| **Collections SECOND** | Once users can send requests, they need to save and organize them. This creates "stickiness" — users invest in your tool. |
| **Environments THIRD** | Variables like `{{base_url}}` and `{{auth_token}}` transform one-off requests into reusable test suites. |
| **History + Import FOURTH** | History creates a safety net ("I can always find my past request"). Import removes migration friction. |
| **AI Features FIFTH** | This is your differentiator — but it only shines when the foundation is solid. AI on a broken request builder is useless. |
| **Polish + Deploy LAST** | Dark mode, animations, error handling, and deployment. Ship it. |

---

## 2. Essential Features for 7-Day Sprint

### Feature List (24 Features — Prioritized for 7 Days)

#### 🔴 Day 1–2: Foundation (7 features)

| # | Feature | What It Does | Why It's Essential |
|:--|:--------|:-------------|:-------------------|
| 1 | **Project Setup (Monorepo)** | Initialize Vite React frontend + Express TypeScript backend with npm workspaces | Everything depends on this scaffolding |
| 2 | **Request Builder UI** | Method selector (GET/POST/PUT/PATCH/DELETE), URL input bar, Send button | Core product — the primary user interaction |
| 3 | **Key-Value Editors** | Tabbed editors for Headers, Query Params (enable/disable toggles, bulk edit) | Required for every API call beyond simple GETs |
| 4 | **Body Editor (Monaco)** | Monaco-based code editor for JSON/Raw body input with syntax highlighting | Professional editing experience; can't test POST APIs without it |
| 5 | **Backend Proxy/Executor** | Express route that receives request config, executes HTTP call, returns response | Solves CORS — browsers can't make arbitrary cross-origin requests |
| 6 | **Response Viewer** | Display status badge (color-coded), response time, size, pretty-printed JSON body, response headers | Users need to SEE what the API returned |
| 7 | **Multi-Tab Interface** | Open multiple requests in browser-style tabs, switch between them | Developers always test multiple endpoints simultaneously |

#### 🟠 Day 3: Organization (4 features)

| # | Feature | What It Does | Why It's Essential |
|:--|:--------|:-------------|:-------------------|
| 8 | **JWT Authentication** | Register/Login with email+password, JWT access tokens, HTTP-only refresh cookies | Users need accounts to save data; security baseline |
| 9 | **Collections CRUD** | Create/Read/Update/Delete collections; create folders within collections | Without organization, saved requests become an unmanageable mess |
| 10 | **Sidebar Collection Tree** | Collapsible tree view showing Collections → Folders → Requests with method badges | Navigation — users need to find and select their saved requests |
| 11 | **Save Request to Collection** | Save the current request builder state to a collection/folder | The "save" action — converts throwaway work into persistent assets |

#### 🟡 Day 4: Variables & Auth (4 features)

| # | Feature | What It Does | Why It's Essential |
|:--|:--------|:-------------|:-------------------|
| 12 | **Environment Variables** | Create environments (Dev/Staging/Prod); add key-value variables; switch active environment | One request config works across all environments — massive time saver |
| 13 | **Variable Resolution** | Replace `{{variable_name}}` in URL, headers, body before sending | The engine that makes environments actually useful |
| 14 | **Variable Auto-Complete** | Typing `{{` shows dropdown of available variables from active environment | Prevents typos; accelerates workflow |
| 15 | **Auth Configuration Panel** | Built-in support for API Key, Bearer Token, and Basic Auth with form inputs | Auth is required for 95%+ of real-world APIs |

#### 🟢 Day 5: History & Import (4 features)

| # | Feature | What It Does | Why It's Essential |
|:--|:--------|:-------------|:-------------------|
| 16 | **Request History** | Auto-save every sent request+response with timestamp; searchable list | Safety net — "What did I send 2 hours ago that worked?" |
| 17 | **cURL Import** | Paste a cURL command → auto-populate request builder | cURL is how developers share API calls; instant adoption enabler |
| 18 | **cURL Export** | Generate cURL command from current request config | Sharing — lets users share requests with non-users |
| 19 | **Postman Collection Import** | Upload Postman JSON (v2.1) → create collection with all requests | Removes migration barrier — the #1 reason users don't switch tools |

#### 🔵 Day 6: AI Features (3 features)

| # | Feature | What It Does | Why It's Essential |
|:--|:--------|:-------------|:-------------------|
| 20 | **AI Chat Panel** | Persistent sidebar chat — user asks questions about current request/response context | Your core differentiator — AI integrated into the testing workflow |
| 21 | **AI Test Generation** | After getting a response, click "Generate Tests" → AI produces test assertions | Saves 20+ minutes of manual test writing per endpoint |
| 22 | **AI Debug Assistant** | On 4xx/5xx errors, AI analyzes the request+response and suggests fixes | Beginners waste hours on "401 Unauthorized" — AI solves it in seconds |

#### ⚪ Day 7: Polish & Deploy (2 features)

| # | Feature | What It Does | Why It's Essential |
|:--|:--------|:-------------|:-------------------|
| 23 | **Dark/Light Theme** | Toggle between dark and light mode; respect OS preference; persist choice | Developer tools MUST have dark mode — it's expected |
| 24 | **Deployment** | Deploy frontend to Vercel, backend to Railway; connect to MongoDB Atlas | A product that isn't deployed doesn't exist |

---

## 3. Day-by-Day Execution Plan

### Day 1 (Friday, May 23): Project Setup + Request Builder

| Block | Duration | Task | Deliverable |
|:------|:---------|:-----|:------------|
| Morning | 2 hrs | Project scaffolding: Vite + React + TS frontend, Express + TS backend, npm workspaces, MongoDB Atlas connection | Working monorepo with `npm run dev` starting both apps |
| Morning | 1 hr | Design system: CSS variables, dark theme defaults, fonts (Inter), color palette | `variables.css` with complete design tokens |
| Afternoon | 3 hrs | Request Builder: Method selector, URL input, Send button, tab bar (Params/Headers/Body/Auth) | User can type a URL and click Send |
| Afternoon | 2 hrs | Key-Value Editors: Headers editor, Params editor with enable/disable toggles | User can add custom headers and query params |
| Evening | 1 hr | Monaco Body Editor: JSON editing with syntax highlighting | User can write JSON request bodies |

**End of Day 1 Deliverable:** A user can build a GET/POST request with URL, headers, params, and JSON body — but it doesn't send yet.

---

### Day 2 (Saturday, May 24): Execution Engine + Response Viewer

| Block | Duration | Task | Deliverable |
|:------|:---------|:-----|:------------|
| Morning | 3 hrs | Backend Executor: `POST /api/execute` route that receives request config, executes via `undici`/`axios`, captures timing, returns response | Backend can execute arbitrary HTTP requests |
| Morning | 1 hr | SSRF Guard: Block requests to internal IPs (127.0.0.1, 10.x, 172.x, 169.254.x) | Security baseline for the executor |
| Afternoon | 3 hrs | Response Viewer: Status badge (color-coded), response time, payload size, pretty-printed JSON body with collapsible tree, response headers table | User sees a beautiful, formatted response |
| Afternoon | 1 hr | Multi-Tab Interface: Open/close tabs, switch between them, persist tab state | User can work on multiple requests simultaneously |
| Evening | 1 hr | Connect frontend → backend: Wire up Send button to call executor API | **MILESTONE: User sends a real request and sees the response** |

**End of Day 2 Deliverable:** ✅ **The core product works** — user can build a request, send it, and see the response.

---

### Day 3 (Sunday, May 25): Auth + Collections

| Block | Duration | Task | Deliverable |
|:------|:---------|:-----|:------------|
| Morning | 2 hrs | Backend Auth: User model (bcrypt), Register/Login endpoints, JWT access + refresh tokens, HTTP-only cookies | Auth API works |
| Morning | 1.5 hrs | Frontend Auth: Login/Register pages, auth store (Zustand), protected routes, auto-refresh interceptor | User can sign up and log in |
| Afternoon | 2 hrs | Backend Collections: Collection/Request Mongoose models, CRUD endpoints, folder support | Collections API works |
| Afternoon | 2.5 hrs | Frontend Sidebar: Collection tree (collapsible folders), create collection modal, save request to collection, click-to-load request | User can organize and retrieve saved requests |
| Evening | 1 hr | Request duplication, drag-and-drop reordering (basic) | Polish and UX refinements |

**End of Day 3 Deliverable:** User can register, login, create collections, save requests, and load them from the sidebar.

---

### Day 4 (Monday, May 26): Environments + Variable System + Auth Panel

| Block | Duration | Task | Deliverable |
|:------|:---------|:-----|:------------|
| Morning | 2 hrs | Backend Environments: Environment model, CRUD endpoints, variable encryption for secrets | Environments API works |
| Morning | 2 hrs | Frontend Environment Manager: Create/edit environments, variable key-value editor, environment selector dropdown | User can create and manage environments |
| Afternoon | 2 hrs | Variable Resolution Engine: Backend resolves `{{var}}` in URL, headers, params, body before executing | Variables actually work in requests |
| Afternoon | 1.5 hrs | Variable Auto-Complete: Typing `{{` in URL or header value shows dropdown of available variables | Professional DX; prevents typos |
| Evening | 1.5 hrs | Auth Configuration Panel: API Key (header/query), Bearer Token, Basic Auth form inputs; auth injection in executor | User can configure auth without manually typing headers |

**End of Day 4 Deliverable:** User can switch between Dev/Staging/Prod environments, use `{{variables}}`, and configure auth.

---

### Day 5 (Tuesday, May 27): History + Import/Export

| Block | Duration | Task | Deliverable |
|:------|:---------|:-----|:------------|
| Morning | 2 hrs | Backend History: Auto-save on every execution, paginated list endpoint, search/filter | History API works |
| Morning | 1.5 hrs | Frontend History Panel: Searchable history list (grouped by time), click to replay, "Save to Collection" button | User can browse and replay past requests |
| Afternoon | 1.5 hrs | cURL Parser: Paste cURL → parse method, URL, headers, body, auth → populate request builder | cURL import works |
| Afternoon | 1 hr | cURL Export: Generate cURL command from current request state → copy to clipboard | Users can share requests |
| Afternoon | 2 hrs | Postman Import: Upload Postman Collection v2.1 JSON → parse into collections with folders + requests | Postman migration works |
| Evening | 1 hr | Polish: Loading states, error handling, empty states, toast notifications | Professional feel |

**End of Day 5 Deliverable:** User can import from cURL/Postman, see full request history, and share requests as cURL.

---

### Day 6 (Wednesday, May 28): AI Features

| Block | Duration | Task | Deliverable |
|:------|:---------|:-----|:------------|
| Morning | 2 hrs | Backend AI: LLM Gateway (OpenAI provider), prompt templates, structured output schemas, AI route handlers | AI API works |
| Morning | 2 hrs | AI Chat Panel: Sidebar chat UI, message bubbles, context-aware system prompt (current request+response), streaming | User can chat with AI about their API |
| Afternoon | 2 hrs | AI Test Generation: "Generate Tests" button → AI analyzes response → shows test suggestions as checklist → user accepts/rejects | User generates comprehensive tests in seconds |
| Afternoon | 2 hrs | AI Debug Assistant: On 4xx/5xx, show "Debug" button → AI diagnoses error → shows cause + fix suggestions | User gets instant debugging help |
| Evening | 1 hr | AI Usage Tracking: Daily usage counter per user, "45/50 AI requests used" badge | Cost management; plan enforcement |

**End of Day 6 Deliverable:** ✅ **AI differentiator works** — chat, test generation, and debugging.

---

### Day 7 (Thursday, May 29): Polish + Dark Mode + Deploy

| Block | Duration | Task | Deliverable |
|:------|:---------|:-----|:------------|
| Morning | 2 hrs | Dark/Light Theme: CSS variable-based theming, theme toggle, OS preference detection, localStorage persistence | Beautiful dark mode |
| Morning | 1.5 hrs | UI Polish: Micro-animations, hover effects, keyboard shortcuts (Ctrl+Enter to send, Ctrl+S to save), responsive layout | Premium feel |
| Afternoon | 1.5 hrs | Error Handling: Global error boundary, API error formatting, offline detection, graceful degradation | App doesn't crash |
| Afternoon | 2 hrs | Deployment: Frontend → Vercel, Backend → Railway, MongoDB Atlas (free M0), environment variables, CORS config | App is live |
| Evening | 2 hrs | End-to-End Testing: Test all features manually, fix critical bugs, write README.md | **LAUNCH** 🚀 |

**End of Day 7 Deliverable:** ✅ **Product is live** — deployed, polished, with dark mode and AI features.

---

## 4. Google Antigravity Productivity Guide

### How to Use Claude Opus 4.6 in Antigravity for Maximum Speed

#### 4.1 Planning Mode vs. Fast Mode

| Mode | When to Use | How |
|:-----|:------------|:----|
| **Planning Mode** | Day 1 setup, architecture decisions, module design | Antigravity defaults to planning mode for complex requests. Let it create an implementation plan, review it, then approve. |
| **Fast Mode / Direct Coding** | Individual components, bug fixes, small features | For tasks like "Build the MethodSelector component", the agent should code directly without a multi-step plan. |

#### 4.2 Effective Prompting Patterns

**Bad prompt (vague):**
> "Build the request builder"

**Good prompt (specific, bounded):**
> "Build the MethodSelector component at `apps/web/src/components/request-builder/MethodSelector.tsx`. It should be a dropdown showing HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS). Each method should have a color: GET=green, POST=orange, PUT=blue, PATCH=purple, DELETE=red. Use CSS modules for styling. The component accepts `method` and `onChange` props."

**Optimal prompt (with context + constraints):**
> "Build the MethodSelector component. Follow the project structure from our research reports. Use Zustand for state (`requestStore.ts`). Use CSS modules with CSS variables from `variables.css`. TypeScript strict mode. No external UI library — use vanilla CSS with our design tokens."

#### 4.3 Multi-Agent Workflow for Each Day

**Recommended daily workflow:**

```
1. START OF DAY
   └── Open Antigravity → Give it the day's task list from this report
   
2. PLANNING PHASE (10 minutes)
   └── Let Claude create an implementation plan for the day's features
   └── Review → Approve
   
3. EXECUTION PHASE (parallel sub-agents)
   └── Agent 1: Backend module (routes, controller, service, model)
   └── Agent 2: Frontend components (UI, styling, state)
   └── Agent 3: Integration (connecting frontend to backend)
   
4. VERIFICATION PHASE
   └── Manual testing in browser
   └── Fix any bugs
   └── Commit to Git
```

#### 4.4 Sub-Agent Delegation Strategy

When building a feature, delegate to specialized sub-agents:

| Sub-Agent | Focus | Example Prompt |
|:----------|:------|:---------------|
| **Backend Agent** | Routes, controllers, services, models, validation | "Create the Collections module following our backend module pattern: controller → service → routes → validation. Include Zod schemas for all request bodies." |
| **Frontend Agent** | React components, Zustand stores, hooks, CSS | "Build the CollectionTree sidebar component with expandable folders, request items showing method badges, and a context menu for rename/delete." |
| **Integration Agent** | API service layer, wiring frontend to backend | "Create `collection.service.ts` with Axios calls for all CRUD operations. Create the `useCollections` hook using TanStack Query." |
| **Testing Agent** | Unit tests, integration tests | "Write unit tests for the VariableResolver service covering: simple replacement, nested variables, missing variables, recursive variables." |

---

## 5. Skills, Hooks & Sub-Agents Configuration

### 5.1 Antigravity Skills File

Create this file at your project root to give Antigravity persistent context:

**File: `.agent/skills/project-context.md`**

```markdown
# Project: AI-Powered API Testing Tool

## Architecture
- Monorepo: apps/web (React+Vite+TS) and apps/api (Express+TS)
- State: Zustand for client state, TanStack Query for server state
- Database: MongoDB Atlas with Mongoose ODM
- AI: OpenAI GPT-4o via structured outputs (Zod schemas)
- Styling: CSS Modules + CSS Variables (NO Tailwind)

## Coding Standards
- TypeScript strict mode everywhere
- Backend modules: controller (thin) → service (thick) → routes
- Frontend components: PascalCase, co-located CSS modules
- All validation via Zod schemas
- Use `atx` namespace for scripting API (not `pm`)
- Error responses: { success: false, error: { code, message } }
- Success responses: { success: true, data: {...} }

## File Locations
- Frontend components: apps/web/src/components/{feature}/
- Backend modules: apps/api/src/modules/{module}/
- Shared types: packages/shared/src/types/
- Zustand stores: apps/web/src/stores/
- API services: apps/web/src/services/
- CSS variables: apps/web/src/styles/variables.css

## Design Tokens
- Primary: hsl(220, 90%, 56%)
- Background (dark): hsl(220, 20%, 10%)
- Surface (dark): hsl(220, 18%, 14%)
- Border (dark): hsl(220, 15%, 20%)
- Text (dark): hsl(0, 0%, 93%)
- Font: Inter (Google Fonts)
- Border radius: 8px (default), 12px (cards), 4px (inputs)

## HTTP Method Colors
- GET: #22c55e (green)
- POST: #f97316 (orange)
- PUT: #3b82f6 (blue)
- PATCH: #a855f7 (purple)
- DELETE: #ef4444 (red)
- HEAD: #06b6d4 (cyan)
- OPTIONS: #6b7280 (gray)
```

### 5.2 Hooks Configuration

Create hooks to enforce quality automatically:

**File: `.agent/hooks/post-edit.sh`**

```bash
#!/bin/bash
# Run after every file edit to catch errors early

# TypeScript type checking
npx tsc --noEmit 2>&1 | head -20

# ESLint for the changed file
npx eslint "$1" --fix 2>&1 | head -10
```

**File: `.agent/hooks/pre-commit.sh`**

```bash
#!/bin/bash
# Run before any git commit

npm run lint
npm run type-check
npm run test -- --run
```

### 5.3 AGENTS.md File

Create at project root for cross-tool compatibility:

**File: `AGENTS.md`**

```markdown
# Agent Instructions

## Project Context
This is an AI-Powered API Testing Tool (like Postman with AI features).
Built with React 19 + TypeScript (Vite) on frontend, Express 5 + TypeScript on backend.

## Rules
1. ALWAYS use TypeScript with strict mode
2. NEVER use Tailwind CSS — use CSS Modules + CSS Variables
3. ALWAYS validate request bodies with Zod schemas
4. Backend services must NEVER access req/res directly
5. All API responses must follow: { success: boolean, data?: any, error?: { code, message } }
6. Use CSS variables from variables.css for ALL colors, spacing, borders
7. Components must be self-contained with co-located .module.css files
8. Use `undici` (not axios) on the backend for HTTP execution
9. Sensitive variables MUST be encrypted with AES-256-GCM before storage

## Testing
- Run tests with: npm run test
- Backend tests: Vitest + Supertest
- Frontend tests: Vitest + Testing Library

## Available Scripts
- `npm run dev` — Start both frontend and backend
- `npm run dev:web` — Start frontend only
- `npm run dev:api` — Start backend only
- `npm run lint` — Lint all code
- `npm run type-check` — TypeScript check
- `npm run test` — Run all tests
```

---

## 6. Report File Index

This 7-day sprint guide is split into multiple files for easy reference during development:

| # | File | Content | When to Reference |
|:--|:-----|:--------|:------------------|
| 1 | **`7_Day_Sprint_Overview_and_Feature_List.md`** (this file) | Feature list, daily schedule, Antigravity guide, Skills/Hooks config | Start of each day |
| 2 | **`Day1_2_Guide_Project_Setup_and_Request_Builder.md`** | Step-by-step: monorepo setup, design system, request builder, key-value editors, Monaco integration, backend executor, response viewer, multi-tabs | Day 1 & 2 |
| 3 | **`Day3_Guide_Auth_and_Collections.md`** | Step-by-step: JWT auth (register/login/refresh), Mongoose models, collections CRUD, sidebar tree, save/load requests | Day 3 |
| 4 | **`Day4_Guide_Environments_Variables_and_Auth_Config.md`** | Step-by-step: environment management, variable resolution engine, auto-complete, auth configuration panel | Day 4 |
| 5 | **`Day5_Guide_History_Import_Export.md`** | Step-by-step: request history, cURL parser/exporter, Postman collection import | Day 5 |
| 6 | **`Day6_Guide_AI_Features.md`** | Step-by-step: LLM Gateway, AI chat panel, test generation, debug assistant, prompt templates, structured outputs | Day 6 |
| 7 | **`Day7_Guide_Polish_Theme_Deploy.md`** | Step-by-step: dark/light theme, UI polish, error handling, deployment to Vercel+Railway, final checklist | Day 7 |

---

*Next: Open the Day 1–2 guide to begin building the foundation.*
