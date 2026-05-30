# Phase 2 Report — Part 1: Completed Features Summary

## AI-Powered API Testing Tool (ATX)

**Developer:** Bharat Bhangale  
**Sprint Completed:** May 23–29, 2026  
**Stack:** React 19 + TypeScript (Vite 6) | Express 5 + TypeScript | MongoDB Atlas | Gemini AI  

---

## Table of Contents

1. [Sprint Overview](#1-sprint-overview)
2. [Day 1–2: Foundation (7 Features)](#2-day-12-foundation-7-features)
3. [Day 3: Organization (4 Features)](#3-day-3-organization-4-features)
4. [Day 4: Variables & Auth (4 Features)](#4-day-4-variables--auth-4-features)
5. [Day 5: History & Import (4 Features)](#5-day-5-history--import-4-features)
6. [Day 6: AI Features (3 Features)](#6-day-6-ai-features-3-features)
7. [Day 7: Polish & Deploy (2 Features)](#7-day-7-polish--deploy-2-features)
8. [Current Architecture Snapshot](#8-current-architecture-snapshot)

---

## 1. Sprint Overview

Over 7 days, 24 features were implemented, resulting in a functional API testing tool with AI capabilities. The tool currently supports **manual** API testing — a user builds a request, sends it, and views the response. AI assists with chat, test generation, and error debugging.

| Metric | Value |
|:-------|:------|
| Features implemented | 24 |
| Frontend components | 40+ |
| Backend API modules | 8 (auth, collections, requests, environments, executor, history, import, ai) |
| Zustand stores | 6 (request, auth, collection, environment, history, ai) |
| Total tests | 58 (57 passing) |
| Frontend bundle | 472 KB (148 KB gzipped) |
| Backend build | Clean, 0 TS errors |

---

## 2. Day 1–2: Foundation (7 Features)

### F1: Project Setup (Monorepo)

| Aspect | Detail |
|:-------|:-------|
| **What was built** | npm workspaces monorepo with `apps/web`, `apps/api`, `packages/shared`, `packages/utils`, `tooling/tsconfig`, `tooling/eslint-config` |
| **Key files** | `package.json` (root), `apps/web/vite.config.ts`, `apps/api/tsconfig.json` |
| **How it works** | `npm run dev` starts both frontend (Vite, port 5173) and backend (Express, port 8000) simultaneously via workspace scripts |

### F2: Request Builder UI

| Aspect | Detail |
|:-------|:-------|
| **What was built** | Method selector dropdown (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS), URL input bar with variable highlighting, Send button with loading state |
| **Key files** | `MethodSelector.tsx`, `UrlBar.tsx`, `RequestBuilder.tsx` |
| **How it works** | User selects HTTP method, types URL (with `{{variable}}` auto-complete), clicks Send. Request config is sent to the backend executor. Method colors: GET=green, POST=orange, PUT=blue, PATCH=purple, DELETE=red |

### F3: Key-Value Editors

| Aspect | Detail |
|:-------|:-------|
| **What was built** | Tabbed editors for Headers and Query Params. Each row has key, value, description inputs with enable/disable checkboxes. Bulk edit mode (raw text). |
| **Key files** | `KeyValueEditor.tsx`, `KeyValueEditor.module.css` |
| **How it works** | Tab bar shows Params, Headers, Body, Auth. Each editor supports add/remove/toggle/bulk-edit. Disabled rows are excluded from the request. |

### F4: Body Editor (Monaco)

| Aspect | Detail |
|:-------|:-------|
| **What was built** | Monaco Editor integration for JSON/Raw body input. Syntax highlighting, auto-formatting, dark theme. Body type selector: none, JSON, raw, form-data. |
| **Key files** | `BodyEditor.tsx`, uses `@monaco-editor/react` |
| **How it works** | When body type is "json", Monaco opens with JSON language mode. The editor content is stored in `requestStore.ts` and sent as the request body. |

### F5: Backend Proxy/Executor

| Aspect | Detail |
|:-------|:-------|
| **What was built** | `POST /api/execute` route that receives request config, executes the HTTP call server-side using `axios`, captures timing metrics, and returns the response. SSRF guard blocks internal IPs. |
| **Key files** | `executor.controller.ts`, `executor.service.ts`, `executor.validation.ts`, `executor.routes.ts` |
| **How it works** | Frontend sends request config (method, url, headers, params, body) → backend resolves variables → validates URL (SSRF check) → executes HTTP call → captures response status, headers, body, and timing → returns to frontend |

### F6: Response Viewer

| Aspect | Detail |
|:-------|:-------|
| **What was built** | Status badge (color-coded by status class: 2xx=green, 4xx=orange, 5xx=red), response time display, payload size, pretty-printed JSON body with syntax highlighting, response headers table |
| **Key files** | `ResponseViewer.tsx`, `ResponseViewer.module.css`, `StatusBadge.tsx` |
| **How it works** | After execution, the response data is stored in `requestStore.ts` and rendered in a tabbed view: Body (with JSON tree), Headers, Cookies. Status badge shows "200 OK" with color. Timing shows milliseconds. |

### F7: Multi-Tab Interface

| Aspect | Detail |
|:-------|:-------|
| **What was built** | Browser-style tab bar for working on multiple API requests simultaneously. Add tab (+), close tab (×), switch tabs. Each tab preserves its own request config and response. |
| **Key files** | `TabBar.tsx`, `requestStore.ts` (tab management) |
| **How it works** | `requestStore` maintains a `tabs[]` array and `activeTabId`. Each tab has its own method, URL, headers, params, body, and response. Ctrl+N opens a new tab, Ctrl+W closes the current one. |

---

## 3. Day 3: Organization (4 Features)

### F8: JWT Authentication

| Aspect | Detail |
|:-------|:-------|
| **What was built** | User registration and login with email+password. bcrypt password hashing (12 salt rounds). JWT access tokens (15-min expiry, sent as Bearer header). JWT refresh tokens (7-day expiry, sent in HTTP-only secure cookie). Auto-refresh interceptor on 401 responses. |
| **Key files** | `auth.controller.ts`, `auth.service.ts`, `auth.routes.ts`, `User.model.ts`, `authenticate.ts` middleware, `authStore.ts` |
| **How it works** | Register → hash password → save user → return tokens. Login → verify password → return tokens. Every authenticated request includes `Authorization: Bearer <access_token>`. On 401, the frontend interceptor calls `/api/auth/refresh` using the refresh cookie to get a new access token. |

### F9: Collections CRUD

| Aspect | Detail |
|:-------|:-------|
| **What was built** | Create, read, update, delete collections. Nested folder support within collections. Save requests to specific collections/folders. |
| **Key files** | `collection.controller.ts`, `collection.service.ts`, `Collection.model.ts`, `Request.model.ts`, `collectionStore.ts` |
| **How it works** | Collections are owned by `userId`. Each collection can contain folders (sub-objects) and requests. Requests reference their parent collection and optional folder. CRUD operations are protected by the `authenticate` middleware. |

### F10: Sidebar Collection Tree

| Aspect | Detail |
|:-------|:-------|
| **What was built** | Collapsible tree view in the left sidebar showing Collections → Folders → Requests. Each request shows a method badge (color-coded). Context menu for rename/delete. |
| **Key files** | `Sidebar.tsx`, `CollectionTree.tsx`, `CollectionItem.tsx`, `Sidebar.module.css` |
| **How it works** | The sidebar fetches collections on mount. Each collection is expandable. Clicking a request loads its config into the active tab. Right-clicking shows context actions. |

### F11: Save Request to Collection

| Aspect | Detail |
|:-------|:-------|
| **What was built** | "Save" button in the request builder opens a modal to choose a collection and optional folder. Creates a new saved request with method, URL, headers, params, body, and auth config. |
| **Key files** | `SaveRequestModal.tsx`, `request.service.ts`, `collectionStore.ts` |
| **How it works** | User fills out the request builder → clicks Save (or Ctrl+S) → modal shows list of collections/folders → user selects target → request config is saved to the backend via `POST /api/requests`. |

---

## 4. Day 4: Variables & Auth (4 Features)

### F12: Environment Variables

| Aspect | Detail |
|:-------|:-------|
| **What was built** | Create multiple environments (Dev, Staging, Prod). Each environment has key-value variables. Environment selector in the status bar. Active environment persisted in localStorage. |
| **Key files** | `Environment.model.ts`, `environment.controller.ts`, `environment.service.ts`, `environmentStore.ts`, `EnvSelector.tsx`, `EnvManagerModal.tsx` |
| **How it works** | Environments are user-scoped documents in MongoDB. Each has `name` and `variables[]` (key, value, type, description). The status bar shows the active environment. Switching environments changes which variables are resolved. |

### F13: Variable Resolution

| Aspect | Detail |
|:-------|:-------|
| **What was built** | The backend resolves `{{variable_name}}` placeholders in URL, headers, params, and body before executing the HTTP request. |
| **Key files** | `executor.service.ts` (variable resolution logic) |
| **How it works** | Before execution, the backend fetches the user's active environment, builds a variable map, and replaces all `{{var}}` occurrences in the request config. Unresolved variables are left as-is (shown as warnings). |

### F14: Variable Auto-Complete

| Aspect | Detail |
|:-------|:-------|
| **What was built** | Typing `{{` in the URL bar or any key-value editor triggers a dropdown showing available variables from the active environment with their current values. |
| **Key files** | `VariableInput.tsx`, `VariableInput.module.css` |
| **How it works** | The `VariableInput` component watches for the `{{` pattern in the input. When detected, it shows a filtered dropdown of variable names from the active environment. Selecting a variable inserts `{{name}}` at the cursor position. |

### F15: Auth Configuration Panel

| Aspect | Detail |
|:-------|:-------|
| **What was built** | Auth tab in the request builder with support for: No Auth, API Key (header or query param), Bearer Token, Basic Auth (username + password). Auth values support `{{variables}}`. |
| **Key files** | `AuthConfig.tsx`, `AuthConfig.module.css` |
| **How it works** | User selects auth type from dropdown. The form inputs are rendered based on the type. Auth config is stored per-tab in `requestStore.ts`. The backend executor injects the auth into the request (adds header or query param) before execution. |

---

## 5. Day 5: History & Import (4 Features)

### F16: Request History

| Aspect | Detail |
|:-------|:-------|
| **What was built** | Auto-saves every executed request+response with timestamp to MongoDB. Searchable, filterable history list grouped by date. Click to replay any past request. "Save to Collection" button on history items. |
| **Key files** | `History.model.ts`, `history.controller.ts`, `history.service.ts`, `historyStore.ts`, `HistoryPanel.tsx` |
| **How it works** | After every successful execution, the backend saves a history entry (method, URL, status, timing, request config, response snapshot). The frontend history panel shows entries grouped by "Today", "Yesterday", "This Week", etc. Clicking an entry loads the request config into a new tab. |

### F17: cURL Import

| Aspect | Detail |
|:-------|:-------|
| **What was built** | Paste a cURL command → parser extracts method, URL, headers, body, auth → populates the request builder automatically. |
| **Key files** | `ImportCurlModal.tsx`, `import.controller.ts`, `import.service.ts` |
| **How it works** | The cURL parser uses regex and token splitting to extract: `-X METHOD`, URL, `-H "Header: Value"`, `-d "body"`, `--data`, `-u user:pass`, `--user-agent`, etc. The parsed result populates a new tab in the request builder. |

### F18: cURL Export

| Aspect | Detail |
|:-------|:-------|
| **What was built** | Generate a cURL command from the current request configuration. Copy to clipboard button. |
| **Key files** | `ExportCurlButton.tsx`, `curlExporter.ts` (utility) |
| **How it works** | Takes the current tab's method, URL, headers, body, and auth config → builds a valid `curl` command string → copies to clipboard via `navigator.clipboard.writeText()`. |

### F19: Postman Collection Import

| Aspect | Detail |
|:-------|:-------|
| **What was built** | Upload a Postman Collection v2.1 JSON file → parse into collections with folders and requests → save to the user's account. |
| **Key files** | `ImportPostmanModal.tsx`, `import.controller.ts`, `import.service.ts` |
| **How it works** | The Postman parser reads the v2.1 JSON format, extracts `info.name`, `item[]` (recursive folders/requests), `request.method`, `request.url`, `request.header[]`, `request.body`, and `request.auth`. Creates a new collection with the imported structure. |

---

## 6. Day 6: AI Features (3 Features)

### F20: AI Chat Panel

| Aspect | Detail |
|:-------|:-------|
| **What was built** | Persistent sidebar chat panel. User asks questions about their current request/response. AI responds with context-aware answers using the Gemini API. Streaming support (tokens appear in real-time). |
| **Key files** | `AIChatPanel.tsx`, `chat.service.ts`, `llm-gateway.ts`, `aiStore.ts` |
| **How it works** | The chat sends: system prompt (API testing expert) + user's current request/response context + user's question → Gemini returns a streaming response → rendered as markdown in the chat panel. Messages are stored in `aiStore.ts`. |

### F21: AI Test Generation

| Aspect | Detail |
|:-------|:-------|
| **What was built** | "Generate Tests" button appears after receiving a response. AI analyzes the request+response and generates categorized test assertions with JavaScript scripts. Users can accept/reject individual tests. |
| **Key files** | `AITestSuggestions.tsx`, `test-generator.service.ts`, `test-generation.prompt.ts` |
| **How it works** | Request+response context → Gemini structured output → `TestSuiteSchema` (Zod validated) → returns `tests[]` with name, category (status/body_structure/data_validation/performance/edge_case), assertion, and `atx.test()` script. |

### F22: AI Debug Assistant

| Aspect | Detail |
|:-------|:-------|
| **What was built** | On 4xx/5xx error responses, a "Debug" button appears. AI analyzes the error → provides diagnosis (cause, confidence, explanation) + fix suggestions (title, description, code, priority) + related documentation links. |
| **Key files** | `AIDebugPanel.tsx`, `debug-assistant.service.ts`, `debug-analysis.prompt.ts` |
| **How it works** | Error request+response → Gemini structured output → `DebugAnalysisSchema` (Zod validated) → returns `diagnosis` object + `suggestions[]` array + optional `relatedDocs[]`. Each suggestion has priority: critical/recommended/optional. |

---

## 7. Day 7: Polish & Deploy (2 Features)

### F23: Dark/Light Theme

| Aspect | Detail |
|:-------|:-------|
| **What was built** | CSS variable-based theming with dark (default) and light modes. System preference detection. Theme toggle (pill-shaped: Dark/Light/System). Smooth transitions between themes. Anti-flash script in `index.html`. |
| **Key files** | `useTheme.ts`, `ThemeSwitcher.tsx`, `variables.css`, `index.html` |
| **How it works** | `data-theme` attribute on `<html>` root switches CSS variable values. `useTheme` hook manages theme state in localStorage. Anti-flash script in `<head>` reads localStorage before React hydrates to prevent wrong-theme flash. |

### F24: Deployment & Polish

| Aspect | Detail |
|:-------|:-------|
| **What was built** | OfflineBanner (network detection), enhanced keyboard shortcuts (12 shortcuts), URL auto-prepend (`https://`), Open Graph meta tags, theme-aware toasts, backend health check in StatusBar, comprehensive README with deployment guide. |
| **Key files** | `OfflineBanner.tsx`, `useKeyboardShortcuts.ts`, `StatusBar.tsx`, `App.tsx`, `README.md` |
| **How it works** | StatusBar checks `/health` every 60s (green/red dot). OfflineBanner detects `navigator.onLine` changes. Keyboard shortcuts registered via global `keydown` listener with Monaco/contentEditable protection. |

---

## 8. Current Architecture Snapshot

### Backend Module Map

```
apps/api/src/
├── config/env.ts              # Zod-validated environment variables
├── middleware/
│   ├── authenticate.ts        # JWT verification middleware
│   ├── errorHandler.ts        # Global error handler
│   └── validate.ts            # Zod validation middleware
├── modules/
│   ├── ai/                    # LLM Gateway + Chat/Test/Debug services
│   ├── auth/                  # Register, Login, Refresh, Logout
│   ├── collections/           # Collection CRUD + folders
│   ├── environments/          # Environment CRUD + variables
│   ├── executor/              # HTTP proxy executor + SSRF guard
│   ├── history/               # Auto-save + search + pagination
│   ├── import/                # cURL + Postman import parsers
│   └── requests/              # Saved request CRUD
└── app.ts                     # Express app configuration
```

### Frontend Component Map

```
apps/web/src/
├── app/                       # App, Router, ErrorBoundary
├── components/
│   ├── ai/                    # AIChatPanel, AIDebugPanel, AITestSuggestions, AIUsageIndicator
│   ├── common/                # VariableInput, ThemeSwitcher, OfflineBanner
│   ├── environment/           # EnvSelector, EnvManagerModal
│   ├── history/               # HistoryPanel, HistoryItem
│   ├── import/                # ImportCurlModal, ImportPostmanModal
│   ├── layout/                # TopBar, StatusBar, TabBar
│   ├── request-builder/       # RequestBuilder, MethodSelector, UrlBar, KeyValueEditor, BodyEditor, AuthConfig
│   ├── response-viewer/       # ResponseViewer, StatusBadge
│   └── sidebar/               # Sidebar, CollectionTree
├── hooks/                     # useTheme, useKeyboardShortcuts
├── services/                  # API client, executor, collection, history, etc.
├── stores/                    # Zustand: request, auth, collection, environment, history, ai
└── styles/                    # variables.css, index.css, animations.css
```

### AI Architecture (Current)

```
Frontend                          Backend                           AI Provider
──────────                        ──────────                        ────────────
AIChatPanel.tsx     →  POST /api/ai/chat       →  ChatService        →  Gemini (streaming)
AITestSuggestions.tsx → POST /api/ai/test-gen   →  TestGeneratorService → Gemini (structured)
AIDebugPanel.tsx    →  POST /api/ai/debug      →  DebugAssistantService → Gemini (structured)
                                                      ↓
                                                  LLMGateway (singleton)
                                                  ├── complete()         → Standard text
                                                  ├── completeStructured() → Zod-validated JSON
                                                  └── stream()           → SSE token chunks
```

### What the AI Currently Does (Limitations)

| Capability | Status | Limitation |
|:-----------|:-------|:-----------|
| Chat about APIs | ✅ Working | No memory across sessions; no multi-turn context beyond current request |
| Generate test assertions | ✅ Working | Tests are *suggestions only* — they are NOT executed automatically |
| Debug error responses | ✅ Working | Only triggers on 4xx/5xx; no proactive monitoring |
| Automated test execution | ❌ **Missing** | Tests are displayed as text — there is no test runner |
| Scheduled/recurring tests | ❌ **Missing** | No way to run tests on a schedule |
| Multi-endpoint test flows | ❌ **Missing** | No chaining of requests (e.g., create → read → update → delete) |
| Response validation rules | ❌ **Missing** | No persistent assertion rules that run on every request |
| Performance benchmarking | ❌ **Missing** | No load testing or performance profiling |
| API documentation gen | ❌ **Missing** | No auto-generation of API docs from collected requests |
| Test coverage reporting | ❌ **Missing** | No dashboard showing which endpoints are tested |

---

*This document catalogues all features from the 7-day sprint. See Part 2 for the new AI/Automation features to implement next.*
