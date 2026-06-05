# ATX Desktop Application — App Flow Document

> **Version:** 1.0  
> **Date:** June 2026

---

## 1. Application Lifecycle

### 1.1 Startup Flow

```
User double-clicks ATX.exe / ATX.app
  │
  ├── Electron Main Process starts
  │     ├── Acquire single-instance lock (prevent duplicate windows)
  │     ├── Read user preferences (electron-store)
  │     ├── Start local Express server on random port (port = 0)
  │     │     ├── Connect to SQLite database
  │     │     ├── Run pending migrations (Drizzle)
  │     │     ├── Start schedule worker (if schedules exist)
  │     │     └── Server ready → emit 'server:ready' with port
  │     │
  │     ├── Create BrowserWindow
  │     │     ├── Load preload.js (context bridge)
  │     │     ├── Load index.html (Vite-built React app)
  │     │     └── Window shows splash screen until ready
  │     │
  │     ├── Set up native menu bar
  │     ├── Set up system tray icon
  │     └── Check for updates (background)
  │
  └── Renderer Process (React App)
        ├── Receive server port via IPC
        ├── Set apiClient base URL to localhost:{port}
        ├── Check auth state (skip for local mode)
        ├── Load last active workspace state
        │     ├── Restore open tabs from localStorage
        │     ├── Restore active collection
        │     └── Restore sidebar state
        └── App is ready → hide splash, show main UI
```

### 1.2 Shutdown Flow

```
User closes window
  │
  ├── If "minimize to tray" enabled:
  │     └── Hide window, show tray icon
  │
  └── If closing for real:
        ├── Save workspace state to localStorage
        │     ├── Open tab IDs
        │     ├── Active tab ID
        │     ├── Sidebar collapsed state
        │     └── Panel sizes
        ├── Stop schedule worker
        ├── Close SQLite connection
        ├── Stop local Express server
        └── Quit Electron app
```

---

## 2. Core User Flows

### 2.1 First Launch (Onboarding)

```
App opens for first time
  │
  ├── Show Welcome Screen
  │     ├── "Welcome to ATX Desktop"
  │     ├── Quick setup wizard:
  │     │     ├── Step 1: Set Gemini API key (optional, can skip)
  │     │     ├── Step 2: Choose theme (dark/light)
  │     │     ├── Step 3: Import existing collections (Postman/Insomnia)?
  │     │     └── Step 4: Show keyboard shortcuts cheat sheet
  │     └── "Get Started" → navigate to main app
  │
  └── Main app loads with empty state
        ├── Sidebar shows: "Create your first collection"
        ├── Work area shows: Empty state with quick actions
        │     ├── "New Request" (Ctrl+N)
        │     ├── "Import Collection"
        │     └── "Quick Send" (URL bar)
        └── AI Chat panel collapsed by default
```

### 2.2 Making a Request

```
User clicks "New Request" or presses Ctrl+N
  │
  ├── New tab opens in tab bar
  │     ├── Default: "Untitled Request"
  │     ├── Method selector: GET (default)
  │     └── URL bar: focused, ready for input
  │
  ├── User types URL: https://api.example.com/users
  │     └── URL bar shows variable highlighting if {{var}} detected
  │
  ├── User configures request:
  │     ├── Params tab: key-value pairs (auto-parsed from URL)
  │     ├── Headers tab: key-value with autocomplete
  │     ├── Body tab: raw/json/form-data/binary
  │     │     └── JSON body: Monaco editor with syntax highlighting
  │     ├── Auth tab: None/Bearer/Basic/API Key
  │     │     └── Auth values support {{variables}}
  │     └── Pre-Request tab: JavaScript editor
  │
  ├── User clicks "Send" or presses Ctrl+Enter
  │     │
  │     ├── Pre-request script runs (if any)
  │     │     └── Can set/modify variables
  │     │
  │     ├── Variable substitution: {{baseUrl}} → actual value
  │     │
  │     ├── Request sent to local Express server
  │     │     └── Express proxies to actual target URL
  │     │
  │     ├── Loading indicator in Send button
  │     │
  │     └── Response received
  │           │
  │           ├── Response panel appears (split view)
  │           │     ├── Body tab: formatted JSON/HTML/XML
  │           │     ├── Headers tab: response headers
  │           │     ├── Cookies tab: parsed cookies
  │           │     └── Timeline tab: DNS/connect/TLS/transfer timing
  │           │
  │           ├── Status badge: 200 OK (green) / 404 (yellow) / 500 (red)
  │           ├── Time badge: 245ms
  │           ├── Size badge: 1.2 KB
  │           │
  │           ├── History entry saved automatically
  │           │
  │           ├── If auto-test enabled:
  │           │     ├── AI generates tests for this response
  │           │     ├── Tests execute in sandbox
  │           │     └── Results appear in Test Results panel
  │           │
  │           └── AI Quick Actions appear:
  │                 ├── "Generate Tests" button
  │                 ├── "Debug This" button (if error status)
  │                 └── "Save to Collection" (if unsaved)
```

### 2.3 Collection Management

```
Sidebar → Collections Tab
  │
  ├── Collection List
  │     ├── Each collection shows: name, request count, last modified
  │     ├── Click to expand → shows folders and requests
  │     ├── Right-click context menu:
  │     │     ├── New Request
  │     │     ├── New Folder
  │     │     ├── Run Collection
  │     │     ├── Generate Test Suite (AI)
  │     │     ├── Generate API Docs (AI)
  │     │     ├── Analyze Coverage (AI)
  │     │     ├── Export (JSON/Postman format)
  │     │     ├── Duplicate
  │     │     └── Delete
  │     └── Drag-drop to reorder requests/folders
  │
  ├── Create Collection
  │     ├── Click "+" button → modal
  │     ├── Enter name → Create
  │     └── Collection appears in sidebar
  │
  └── Import Collection
        ├── File → Import (or Ctrl+I)
        ├── File dialog opens (native)
        ├── Select file → auto-detect format
        │     ├── Postman v2.1 JSON
        │     ├── Insomnia v4 JSON
        │     ├── OpenAPI 3.0 YAML/JSON
        │     ├── cURL command
        │     └── HAR file
        └── Import preview → Confirm → Collection created
```

### 2.4 AI Test Generation Flow

```
After response received (or manually triggered):
  │
  ├── User clicks "Generate Tests" (or auto-triggered)
  │     │
  │     ├── Loading state: "AI is analyzing your API response..."
  │     │
  │     ├── Request sent to local AI service:
  │     │     ├── Input: request config + response data
  │     │     └── AI generates: test assertions + test script
  │     │
  │     ├── Tests appear in Test Script Editor
  │     │     ├── Each test shows: name, assertion, expected value
  │     │     ├── Tests are editable before running
  │     │     └── "Run Tests" button
  │     │
  │     ├── User clicks "Run Tests"
  │     │     ├── Tests execute in VM sandbox
  │     │     ├── Results panel shows:
  │     │     │     ├── ✅ Status is 200 — PASSED (2ms)
  │     │     │     ├── ✅ Response has users array — PASSED (1ms)
  │     │     │     ├── ❌ Each user has email — FAILED (1ms)
  │     │     │     │     └── Error: users[2].email is undefined
  │     │     │     └── Summary: 2/3 passed
  │     │     └── "AI-Generated" badge on auto-generated tests
  │     │
  │     └── Save tests to request (persisted with collection)
```

### 2.5 Collection Runner Flow

```
User right-clicks collection → "Run Collection"
  │
  ├── Collection Runner panel opens
  │     ├── Select environment (dropdown)
  │     ├── Options:
  │     │     ├── Delay between requests: 0ms / 100ms / 500ms / 1000ms
  │     │     ├── Stop on error: yes / no
  │     │     ├── Run pre-request scripts: yes / no
  │     │     └── Iterations: 1 (default)
  │     └── "Run" button
  │
  ├── Execution begins (SSE streaming)
  │     │
  │     ├── Request 1/5: POST /api/users
  │     │     ├── Pre-request script runs
  │     │     ├── Chain variables resolved ({{chain.login.body.token}})
  │     │     ├── Request executes → 201 Created (120ms)
  │     │     ├── Test script runs → 3/3 passed
  │     │     ├── Chain context updated (store response data)
  │     │     └── Progress bar: 20%
  │     │
  │     ├── Request 2/5: GET /api/users/{{chain.createUser.body.id}}
  │     │     └── ... (chain variable resolved from previous response)
  │     │
  │     ├── ... (remaining requests)
  │     │
  │     └── Request 5/5: DELETE /api/users/{{chain.createUser.body.id}}
  │           └── 204 No Content (45ms) → 2/2 passed
  │
  ├── Run Complete Summary
  │     ├── Total: 5 requests, 12 tests
  │     ├── Passed: 11 (92%)
  │     ├── Failed: 1 (8%)
  │     ├── Duration: 1.2s
  │     └── Results saved to TestRun model
  │
  └── View detailed results per request
```

### 2.6 AI Chat Flow

```
User clicks AI Chat icon (or Ctrl+Shift+A)
  │
  ├── AI Chat Panel slides in from right
  │     ├── Chat input at bottom
  │     ├── Conversation history above
  │     └── Context badges: "Active request: GET /users"
  │
  ├── User types: "Why is this 401 and how do I fix it?"
  │     │
  │     ├── Message sent with context:
  │     │     ├── Current request config
  │     │     ├── Current response (status, headers, body)
  │     │     └── Active environment variables
  │     │
  │     ├── AI streams response via SSE
  │     │     ├── Tokens appear progressively
  │     │     ├── Code blocks are syntax-highlighted
  │     │     └── "Apply Fix" buttons on code suggestions
  │     │
  │     └── User can continue conversation
  │           └── AI remembers context within session
```

### 2.7 Dashboard Flow

```
User clicks "Dashboard" tab in sidebar
  │
  ├── Dashboard loads with widgets:
  │
  ├── Pass Rate Gauge (circular SVG)
  │     └── Shows: 87% — 456 passed, 68 failed
  │
  ├── Test Trend Chart (30-day stacked bars)
  │     └── Each bar: passed (green) + failed (red)
  │
  ├── Slowest Endpoints (horizontal bar chart)
  │     └── Top 5 endpoints by avg response time
  │
  ├── Recent Failures (list)
  │     └── Last 10 failed tests with collection/request context
  │
  ├── Collection Health Grid
  │     └── Cards per collection: pass rate, last run, test count
  │
  └── Alerts Section
        ├── 🔴 Regression: "POST /users" failing after 14-day pass streak
        ├── 🟡 Flaky: "GET /orders" alternates pass/fail (42% flakiness)
        └── ⚡ Performance: "GET /products" 180% slower than baseline
```

### 2.8 Settings Flow

```
File → Settings (or Ctrl+,)
  │
  ├── General
  │     ├── Theme: Dark / Light / System
  │     ├── Font size: 12-18px
  │     ├── Auto-save requests: On/Off
  │     └── Minimize to tray: On/Off
  │
  ├── AI Configuration
  │     ├── Gemini API Key: [input] [Verify] [Save to Keychain]
  │     ├── AI Model: gemini-2.0-flash / gemini-2.5-pro
  │     ├── Auto-test on response: On/Off
  │     ├── Daily usage limit: Unlimited / 50 / 100
  │     └── Temperature: 0.0 - 1.0 (slider)
  │
  ├── Proxy
  │     ├── Use system proxy: On/Off
  │     ├── Custom proxy: [host:port]
  │     ├── Proxy auth: [username] [password]
  │     └── No-proxy domains: [comma-separated]
  │
  ├── Certificates
  │     ├── Disable SSL verification (global): On/Off
  │     ├── Client certificates: [list]
  │     │     ├── [Add Certificate] → file dialog
  │     │     └── Per-certificate: host pattern, .pem/.pfx file
  │     └── CA Bundle: [custom CA file path]
  │
  ├── Data
  │     ├── Database location: [path] [Open folder]
  │     ├── Export all data: [Export as JSON]
  │     ├── Import data: [Import from JSON]
  │     └── Reset app data: [Reset] (with confirmation)
  │
  └── About
        ├── Version: 1.0.0
        ├── Check for updates: [Check Now]
        └── Open source licenses
```

---

## 3. Navigation Map

```
┌─────────────────────────────────────────────────────────┐
│                     Title Bar                            │
│  ATX Desktop ─ Collection Name                           │
│  [─] [□] [✕]                                             │
├─────────────────────────────────────────────────────────┤
│                     Menu Bar                             │
│  File  Edit  View  Collection  Run  AI  Help             │
├───────┬─────────────────────────────────────┬───────────┤
│       │           Tab Bar                   │           │
│       │  [GET /users] [POST /users] [+]     │           │
│       ├─────────────────────────────────────┤   AI      │
│  S    │                                     │   Chat    │
│  i    │         Work Area                   │   Panel   │
│  d    │                                     │           │
│  e    │  ┌─────────────────────────────┐    │  [icon]   │
│  b    │  │    Request Panel            │    │  to       │
│  a    │  │    [Method] [URL] [Send]    │    │  toggle   │
│  r    │  │    [Params|Headers|Body|    │    │           │
│       │  │     Auth|Pre-Req|Tests]     │    │           │
│  ─    │  ├─────────────────────────────┤    │           │
│       │  │    Response Panel           │    │           │
│  C    │  │    [Body|Headers|Cookies|   │    │           │
│  o    │  │     Timeline|Tests]         │    │           │
│  l    │  └─────────────────────────────┘    │           │
│  l    │                                     │           │
│  e    │  OR: Collection Runner              │           │
│  c    │  OR: Dashboard                      │           │
│  t    │                                     │           │
│  i    │                                     │           │
│  o    │                                     │           │
│  n    │                                     │           │
│  s    │                                     │           │
│  ─    │                                     │           │
│  H    │                                     │           │
│  i    │                                     │           │
│  s    │                                     │           │
│  t    │                                     │           │
│  o    │                                     │           │
│  r    │                                     │           │
│  y    │                                     │           │
│  ─    │                                     │           │
│  D    │                                     │           │
│  a    │                                     │           │
│  s    │                                     │           │
│  h    │                                     │           │
├───────┴─────────────────────────────────────┴───────────┤
│                     Status Bar                           │
│  [Environment ▼] [Ready] [No Proxy] [v1.0.0]            │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Keyboard Shortcuts

| Shortcut | Action |
|:---------|:-------|
| `Ctrl+N` | New request tab |
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close active tab |
| `Ctrl+Enter` | Send request |
| `Ctrl+S` | Save request to collection |
| `Ctrl+Shift+S` | Save As (new name) |
| `Ctrl+I` | Import collection |
| `Ctrl+E` | Export collection |
| `Ctrl+,` | Settings |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+Shift+A` | Toggle AI chat panel |
| `Ctrl+Shift+R` | Run collection |
| `Ctrl+Shift+T` | Generate AI tests |
| `Ctrl+/` | Toggle comment in editor |
| `Ctrl+F` | Find in response body |
| `Ctrl+L` | Focus URL bar |
| `F5` | Resend last request |
| `F11` | Toggle fullscreen |

---

## 5. Error Handling Flows

### 5.1 Network Errors

```
Request fails with network error
  │
  ├── If DNS resolution failed:
  │     └── Show: "Could not resolve host: api.example.com"
  │         + Suggestion: "Check the URL and your internet connection"
  │
  ├── If connection refused:
  │     └── Show: "Connection refused at localhost:3000"
  │         + Suggestion: "Is the server running?"
  │
  ├── If timeout:
  │     └── Show: "Request timed out after 60s"
  │         + Suggestion: "Increase timeout in settings or check server health"
  │
  ├── If SSL error:
  │     └── Show: "SSL certificate problem: self signed certificate"
  │         + Quick action: "Disable SSL verification for this request"
  │
  └── All errors show "Debug with AI" button
        └── Opens AI chat pre-filled with error context
```

### 5.2 AI Errors

```
AI feature fails
  │
  ├── If no API key configured:
  │     └── Show: "Gemini API key not set"
  │         + Link to Settings → AI Configuration
  │
  ├── If rate limited (429):
  │     └── Show: "AI daily limit reached. Resets at midnight."
  │
  ├── If API error (500):
  │     └── Show: "AI service temporarily unavailable. Try again."
  │         + Retry button
  │
  └── If output validation fails (Zod):
        └── Silent retry (up to 2 times), then show fallback message
```
