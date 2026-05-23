# Day 1–2 Prompts: Foundation Features

## Copy-Paste Ready Prompts for Claude Opus 4.6 in Antigravity

**Day:** 1–2 of 7 | **Features:** 7 (Project Setup through Multi-Tabs)  
**Prerequisites:** Skills files created from `Skills_and_Agents_Configuration.md`

---

## Quick Reference

| # | Feature | Prompt Type | Est. Time |
|:--|:--------|:------------|:----------|
| P1 | Project Scaffolding | 🏗️ Full Setup | 20 min |
| P2 | Design System | 🎨 Frontend | 15 min |
| P3 | Request Builder UI | 🎨 Frontend | 30 min |
| P4 | Key-Value Editors | 🎨 Frontend | 20 min |
| P5 | Monaco Body Editor | 🎨 Frontend | 15 min |
| P6 | Backend Executor | 🏗️ Backend | 25 min |
| P7 | SSRF Guard | 🏗️ Backend | 10 min |
| P8 | Response Viewer | 🎨 Frontend | 25 min |
| P9 | Multi-Tab Interface | 🎨 Frontend | 20 min |
| P10 | Frontend ↔ Backend Wiring | 🔌 Integration | 15 min |

---

## ORCHESTRATOR PROMPT (Day 1-2 — Paste This First)

> Use this if you want Claude to plan and execute all Day 1-2 features as one coordinated session.

```
Build the foundation for an AI-powered API testing tool (Days 1-2).

Today's goal: A user can build an HTTP request (method, URL, headers, params, JSON body), send it via a backend proxy, and see the formatted response — with multi-tab support.

Execute these features in order:
1. Monorepo scaffolding (Vite React TS frontend + Express TS backend + shared types)
2. CSS design system (dark theme, variables, typography, HTTP method colors)
3. Request Builder UI (method selector, URL bar, send button, tab bar)
4. Key-Value editors (headers, params — with enable/disable toggles)
5. Monaco body editor (JSON with syntax highlighting)
6. Backend executor (POST /api/execute — proxy HTTP calls, capture timing)
7. SSRF guard (block internal IPs, metadata endpoints)
8. Response viewer (status badge, timing, size, pretty JSON, response headers)
9. Multi-tab interface (browser-style tabs, open/close/switch)
10. Wire frontend to backend (Send button → executor → display response)

Use the project architecture and patterns from my Skills files. Create an implementation plan first, then execute.
```

---

## Individual Feature Prompts

### P1: Project Scaffolding

```
[SETUP] Initialize the monorepo for our API testing tool.

Create:
├── package.json (root, workspaces: ["apps/*", "packages/*"])
├── apps/web/ (Vite + React 19 + TypeScript, template: react-ts)
├── apps/api/ (Express 5 + TypeScript, with nodemon)
├── packages/shared/src/types/
│   ├── request.types.ts (HttpMethod, KeyValuePair, RequestBody, AuthConfig, RequestConfig)
│   └── response.types.ts (ResponseData, ExecutionResult)
├── .gitignore
└── apps/api/.env.example

Frontend deps: zustand @tanstack/react-query axios react-router-dom lucide-react sonner @monaco-editor/react
Backend deps: express cors helmet cookie-parser dotenv mongoose zod jsonwebtoken bcryptjs
Backend dev deps: typescript @types/express @types/cors @types/cookie-parser @types/jsonwebtoken @types/bcryptjs ts-node nodemon vitest

Root scripts: dev (concurrently web+api), dev:web, dev:api, lint, type-check
Backend: apps/api/src/app.ts (Express setup with cors, helmet, JSON limit 10mb, health endpoint) + server.ts (mongoose connect, listen on PORT)

Verify: npm run dev starts both apps. GET /health returns {status: "ok"}.
```

### P2: Design System

```
[FE] Create the CSS design system at apps/web/src/styles/.

Files:
1. variables.css — All design tokens with dark default + [data-theme="light"] override:
   - Colors: primary hsl(220,90%,56%), backgrounds, borders, text, status, HTTP method colors
   - Spacing: 4px scale (1-12)
   - Typography: Inter sans + JetBrains Mono mono, sizes xs-3xl
   - Radius: sm(4) md(6) lg(8) xl(12) full
   - Shadows, transitions (fast/normal/slow), layout dimensions

2. index.css — CSS reset, scrollbar styling, selection, focus ring, links, utilities (.truncate, .visually-hidden)

3. Add Google Fonts (Inter + JetBrains Mono) to index.html <head>

All values from our design-system skill. Dark mode is default. Body overflow:hidden.
```

### P3: Request Builder UI

```
[FE] Build the Request Builder at apps/web/src/components/request-builder/.

1. requestStore.ts (Zustand) at src/stores/:
   - State: tabs: RequestTab[], activeTabId
   - RequestTab: {id, name, method, url, headers[], params[], body, auth, response, isLoading, isDirty}
   - Actions: addTab, closeTab, setActiveTab, updateMethod, updateUrl, updateHeaders, updateParams, updateBody, updateAuth, setResponse, setLoading
   - createNewTab() helper with defaults (GET, empty URL, one blank KV row each)

2. MethodSelector.tsx + .module.css:
   - Dropdown showing GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS
   - Each method text colored by HTTP method color variables
   - Dropdown animates in (scaleIn 150ms)
   - Props: method, onChange

3. UrlBar.tsx + .module.css:
   - Contains: MethodSelector | URL input | Send button
   - Rounded container with border, focus ring on focus-within
   - URL input: mono font, placeholder "Enter request URL or paste cURL"
   - Send button: primary color, shows spinner when loading
   - Ctrl+Enter keyboard shortcut to send

4. RequestPanel.tsx:
   - Sub-tab bar: Params | Headers | Body | Auth
   - Renders the active sub-tab's editor component below
```

### P4: Key-Value Editors

```
[FE] Build the reusable KeyValueEditor at apps/web/src/components/common/KeyValueEditor/.

KeyValueEditor.tsx + .module.css:
- Props: pairs: KeyValuePair[], onChange, keyPlaceholder, valuePlaceholder
- Grid layout: [checkbox 28px] [key 1fr] [value 1fr] [description 0.8fr] [delete 32px]
- Column header row (Key, Value, Description) in tertiary text
- Each row: enable checkbox, key input, value input, description input, delete button (trash icon)
- Delete button: opacity 0 by default, opacity 1 on row hover, red on hover
- Auto-add: when last row has key or value content, auto-append a blank row
- Disabled rows: opacity 0.4 when unchecked
- All inputs: transparent bg, mono font, border-right separators
- Minimum 1 row always (can't delete last)

Use for both HeadersEditor and ParamsEditor (different placeholders).
```

### P5: Monaco Body Editor

```
[FE] Build the BodyEditor at apps/web/src/components/request-builder/BodyEditor.tsx.

- Mode selector: radio buttons for none | JSON | Raw | Form Data | x-www-form-urlencoded
- When mode is JSON or Raw: render @monaco-editor/react
  - height: 200px, theme: vs-dark, minimap off
  - Font: JetBrains Mono 13px, tabSize 2, wordWrap on
  - Padding top 8px, line highlight off, scrollbar 8px
- When mode is form-data or urlencoded: render KeyValueEditor
- When mode is none: show message "This request does not have a body"
- Props: mode, content, onModeChange, onContentChange
```

### P6: Backend Executor

```
[BE] Build the execution engine at apps/api/src/modules/executor/.

1. executor.service.ts:
   - execute(params: {method, url, headers, params, body, timeout}): Promise<ExecutionResult>
   - Use axios with validateStatus: () => true (never throw on HTTP errors)
   - transformResponse: raw (don't auto-parse)
   - Capture timing: startTime/endTime difference
   - Parse body: try JSON.parse, fallback to raw string
   - Calculate size: Buffer.byteLength
   - Handle network errors (DNS, timeout, refused): return success:false with error code+message

2. executor.controller.ts:
   - POST handler: extract {method, url, headers, params, body, timeout} from req.body
   - Convert headers[] and params[] arrays to objects (only enabled=true with non-empty key)
   - Auto-set Content-Type for JSON body mode
   - Return ExecutionResult

3. executor.routes.ts: POST /execute
4. Register: app.use('/api', executorRoutes)

Validation: url and method are required. Return 400 if missing.
```

### P7: SSRF Guard

```
[BE] Build SSRF protection at apps/api/src/utils/ssrf-guard.ts.

validateUrl(rawUrl: string): Promise<void>
- Block non-HTTP protocols (only http: and https: allowed)
- Block hostnames: localhost, metadata.google.internal
- DNS resolve hostname → check IP against blocked ranges:
  127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x, 0.x, ::1, fe80:, fc00:, fd
- Throw descriptive error messages
- Import and call in executor.service.ts before making the request
```

### P8: Response Viewer

```
[FE] Build the ResponseViewer at apps/web/src/components/response-viewer/.

1. ResponseViewer.tsx: Main container with sub-tabs (Body | Headers | Cookies)
2. ResponseMeta.tsx: Status badge + response time + payload size
   - Status badge: colored by range (2xx green, 3xx blue, 4xx orange, 5xx red, 0 gray)
   - Time: green <200ms, yellow <1000ms, red >1000ms
   - Size: human-readable (B, KB, MB)
3. ResponseBody.tsx: Pretty-printed JSON with collapsible tree
   - Use recursive React component OR react-json-view-lite
   - Raw text toggle button
   - Copy button (copy body to clipboard)
4. ResponseHeaders.tsx: Simple table of key-value pairs
5. Empty state when no response yet: "Send a request to see the response here"
6. Loading state: skeleton shimmer animation
7. Error state: red banner with error message

Response arrives → animate in with fadeInUp 200ms.
```

### P9: Multi-Tab Interface

```
[FE] Build the tab bar at apps/web/src/components/request-builder/RequestTabs.tsx.

- Horizontal tab bar showing all open tabs
- Each tab shows: method color dot (8px circle) + tab name (truncated)
- Active tab: bottom border in primary color, slightly brighter background
- Close button (×): appears on hover, stops event propagation
- "+" button at the end to add new tab
- Closing last tab creates a new empty tab
- Tab state managed by requestStore (tabs[], activeTabId)
- Tab height: var(--tab-height) = 36px
- Smooth transition on active tab switch
```

### P10: Frontend ↔ Backend Integration

```
[INT] Wire the frontend to the backend executor.

1. apps/web/src/services/api.ts:
   - Axios instance: baseURL from VITE_API_URL (default http://localhost:8000)
   - withCredentials: true, timeout: 60000

2. apps/web/src/services/executor.service.ts:
   - executeRequest(config): posts to /api/execute with {method, url, headers, params, body}

3. Wire in RequestBuilder:
   - Send button click → setLoading(true) → call executeRequest → setResponse(result) → setLoading(false)
   - Handle errors: show toast notification on network failure
   - Ctrl+Enter keyboard shortcut triggers send

4. apps/web/.env:
   - VITE_API_URL=http://localhost:8000

Verify: Enter https://jsonplaceholder.typicode.com/posts/1 → Send → see JSON response with status 200.
```

---

## Sub-Agent Delegation Map (Day 1-2)

If using multi-agent mode, here's how to split the work:

```
ORCHESTRATOR
├── Backend Sub-Agent:  P1 (backend setup) → P6 (executor) → P7 (SSRF)
├── Frontend Sub-Agent: P2 (design) → P3 (builder) → P4 (KV) → P5 (Monaco) → P8 (viewer) → P9 (tabs)
└── Integration Sub-Agent: P10 (wiring)
```

---

*End of Day 1-2 Prompts. Refer to Day1_2_Guide for detailed code implementations.*
