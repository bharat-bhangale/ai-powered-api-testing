# ATX Desktop App — Master Prompts for AI Coding

> Copy-paste these prompts into Claude/Antigravity to build each feature.  
> Each prompt is self-contained with all files, specs, and context needed.

---

## Phase 1: Electron Shell

### Prompt P1.1: Initialize Electron Desktop Package

```
GOAL: Create the Electron desktop app package that wraps the existing ATX web application.

CONTEXT:
- Monorepo with npm workspaces: apps/web (React+Vite), apps/api (Express), packages/*, tooling/*
- Root package.json at: ./package.json (workspaces: ["apps/*", "packages/*", "tooling/*"])
- Frontend builds to apps/web/dist/
- Backend is Express server at apps/api/

FILES TO CREATE:
- apps/desktop/package.json — Electron 33+, electron-builder, electron-updater, electron-store, electron-log
- apps/desktop/tsconfig.json — Targeting ESNext, Node module resolution
- apps/desktop/electron-builder.yml — App ID "com.atx.desktop", target Windows/macOS/Linux
- apps/desktop/src/main/index.ts — Main entry: create BrowserWindow (1440x900, minWidth 1024, minHeight 600), frameless on macOS, load dist/index.html
- apps/desktop/src/preload/index.ts — contextBridge exposing: getServerPort, openFile, saveFile, getVersion, checkForUpdates, onUpdateAvailable, onNotification
- apps/desktop/src/shared/ipc-channels.ts — Type-safe const enum of all IPC channel names

SPEC:
- BrowserWindow config: frame=false on macOS (use titleBarStyle:'hiddenInset'), frame=true custom title bar on Windows/Linux
- Single instance lock: app.requestSingleInstanceLock()
- Window state: save/restore position and size using electron-store
- On macOS: keep app running when all windows closed (dock icon)
- Security: contextIsolation=true, nodeIntegration=false, sandbox=true
- Dev mode: load from http://localhost:5173 (Vite dev server). Prod: load from file://dist/index.html

ALSO MODIFY:
- package.json (root) — Add "apps/desktop" to workspaces array
- Add scripts: "dev:desktop", "build:desktop" to root package.json

TypeScript strict mode. NO Tailwind CSS.
```

---

### Prompt P1.2: Bundle Express Server in Electron

```
GOAL: Start the Express API server from within the Electron main process on a random available port.

FILES TO CREATE:
- apps/desktop/src/main/server.ts — Spawn Express server, find random port, emit 'ready' with port

SPEC:
- Use `child_process.fork()` to run the API server in a separate Node process
- Server script entry: apps/api/dist/server.js (compiled output)
- Pass environment variables: PORT=0 (OS picks), DESKTOP_MODE=true, DATABASE_URL=<sqlite-path>
- Server sends IPC message { type: 'ready', port: number } when listening
- Main process stores port, responds to renderer IPC 'server:port' requests
- Graceful shutdown: send 'shutdown' message to child process on app quit
- Handle server crash: show error dialog, offer to restart

FILES TO MODIFY:
- apps/api/src/server.ts — Add: if process.send, emit { type: 'ready', port } when listening. Handle 'shutdown' message.
- apps/api/src/config/env.ts — Add DESKTOP_MODE env var, SQLite path
- apps/desktop/src/main/index.ts — Import and call startServer(), wait for port, then pass to renderer

TypeScript strict mode. Express 5 pattern.
```

---

### Prompt P1.3: Configure Vite for Electron + Dynamic API URL

```
GOAL: Make the React frontend work inside Electron's file:// protocol and connect to the dynamic local server port.

FILES TO MODIFY:
- apps/web/vite.config.ts — Add base: './' so asset paths work with file:// protocol
- apps/web/src/app/router.tsx — Detect Electron (window.electronAPI exists) → use HashRouter instead of BrowserRouter. Keep BrowserRouter for web mode.
- apps/web/src/services/api.ts — At startup: if window.electronAPI, call getServerPort() to get dynamic port. Set apiClient.defaults.baseURL = `http://localhost:${port}`. For web: keep existing VITE_API_URL.

SPEC:
- Add type declaration for window.electronAPI in apps/web/src/vite-env.d.ts
- HashRouter uses # URLs (e.g., file://index.html#/dashboard) which work with Electron
- The apiClient base URL must be set BEFORE any API calls happen
- Create a small init function that resolves port and configures axios, called in App.tsx on mount

TypeScript strict mode. NO Tailwind CSS. CSS Modules only.
```

---

## Phase 2: Desktop-Native Features

### Prompt P2.1: Native Menu Bar

```
GOAL: Create a full native menu bar for the desktop app with all keyboard shortcuts.

FILES TO CREATE:
- apps/desktop/src/main/menu.ts — Build and set application menu using Menu.buildFromTemplate()

MENU STRUCTURE:
File: New Request (Ctrl+N), New Collection (Ctrl+Shift+N), separator, Import Collection (Ctrl+I), Export Collection (Ctrl+E), separator, Save Request (Ctrl+S), Save As (Ctrl+Shift+S), separator, Settings (Ctrl+,), separator, Exit (Ctrl+Q)

Edit: Undo, Redo, separator, Cut, Copy, Paste, Select All

View: Toggle Sidebar (Ctrl+B), Toggle AI Panel (Ctrl+Shift+A), Toggle Status Bar, separator, Zoom In/Out/Reset, separator, Full Screen (F11), DevTools (Ctrl+Shift+I, dev only)

Collection: Run Collection (Ctrl+Shift+R), Run with Environment..., separator, Generate Test Suite (AI), Analyze Coverage (AI), Generate API Docs (AI)

Run: Send Request (Ctrl+Enter), Resend Last (F5), separator, Run Tests (Ctrl+Shift+T), Cancel Request (Escape)

AI: Generate Tests (Ctrl+Shift+G), Debug Response (Ctrl+Shift+D), Open AI Chat (Ctrl+Shift+A), separator, AI Settings...

Help: Keyboard Shortcuts (Ctrl+/), Documentation, Report Bug, separator, Check for Updates, About ATX Desktop

SPEC:
- Menu items send IPC messages to renderer for actions (e.g., 'menu:new-request')
- macOS: use role-based menu (app name menu with About, Preferences, Quit)
- Platform detection: process.platform === 'darwin' for macOS-specific items
- DevTools menu item only visible in development mode

FILES TO MODIFY:
- apps/desktop/src/main/index.ts — Import and call setupMenu() after window creation

TypeScript strict mode.
```

---

### Prompt P2.2: System Tray + Notifications

```
GOAL: Add system tray icon with context menu and native OS notifications for schedule run results.

FILES TO CREATE:
- apps/desktop/src/main/tray.ts — Create Tray icon, context menu (Open, Quick Request, Scheduled Runs status, Last Run status, Quit). Tray icon states: normal, running (green dot), failed (red dot), update (blue badge).

SPEC:
- Minimize to tray: when user closes window and "minimize to tray" setting is true, hide window instead of quitting
- Tray double-click: show/focus window
- Native notifications: use Electron's Notification API for schedule run failures
- Notification click: focus window, navigate to dashboard

FILES TO MODIFY:
- apps/desktop/src/main/index.ts — Import and call setupTray(), handle window close event for minimize-to-tray
- apps/desktop/src/preload/index.ts — Add onNotification callback

TypeScript strict mode.
```

---

### Prompt P2.3: File Dialogs + Auto-Updater

```
GOAL: Implement native file open/save dialogs for import/export AND automatic app updates from GitHub Releases.

FILES TO CREATE:
- apps/desktop/src/main/file-dialogs.ts — IPC handlers for 'file:open' (showOpenDialog with filters) and 'file:save' (showSaveDialog + writeFileSync)
- apps/desktop/src/main/auto-updater.ts — Uses electron-updater to check GitHub Releases, download in background, notify renderer, install on user confirmation

SPEC (File Dialogs):
- openFile: accepts { filters, title, multiple } → returns { filePaths, fileContents[] }
- saveFile: accepts { defaultPath, data, filters } → returns { filePath }
- Filters: [{ name: 'JSON', extensions: ['json'] }, { name: 'YAML', extensions: ['yaml', 'yml'] }]

SPEC (Auto-Updater):
- Check for updates on app start (after 10s delay) and every 4 hours
- Events: update-available → IPC 'update:available' to renderer, update-downloaded → IPC 'update:downloaded'
- Renderer shows update banner: "Update v1.1.0 available. [Install & Restart]"
- On user click: autoUpdater.quitAndInstall()
- Log all update events with electron-log

FILES TO MODIFY:
- apps/desktop/src/main/index.ts — Register IPC handlers for file dialogs, start auto-updater
- apps/desktop/src/preload/index.ts — Expose openFile, saveFile, checkForUpdates, installUpdate
- apps/web/src/components/import/ImportModal.tsx — Use electronAPI.openFile() when in Electron mode, otherwise use file input

TypeScript strict mode.
```

---

## Phase 3: Local-First Migration

### Prompt P3.1: Create Drizzle Database Package

```
GOAL: Create a shared database package with Drizzle ORM and SQLite schemas for all 9 models.

FILES TO CREATE:
- packages/db/package.json — deps: better-sqlite3, drizzle-orm, drizzle-kit, uuid
- packages/db/tsconfig.json — TypeScript config
- packages/db/src/schema.ts — All table definitions: users, collections, requests, environments, history, test_runs, schedules, schema_contracts, settings
- packages/db/src/index.ts — Create connection: drizzle(new Database(path)), export db instance
- packages/db/src/migrate.ts — Run Drizzle migrations on startup
- packages/db/drizzle.config.ts — Drizzle Kit config for SQLite

SCHEMA DETAILS (from Backend Schema Document):
- users: id(text PK), email, name, passwordHash?, avatar?, theme, editorFontSize, timestamps
- collections: id(text PK), name, description, userId(FK), foldersJson(text), authType, authConfigJson, sortOrder, timestamps
- requests: id(text PK), name, collectionId(FK cascade), folderId?, userId(FK), method, url, headersJson, paramsJson, bodyMode, bodyContent, bodyContentType, authType, authConfigJson, sortOrder, testScript, preRequestScript, timestamps
- environments: id(text PK), name, userId(FK), variablesJson, isDefault, timestamps
- history: id(text PK), userId(FK), requestJson, responseJson, collectionId?, requestId?, environmentName?, executedAt
- test_runs: id(text PK), userId(FK), collectionId(FK), collectionName, environmentId?, trigger, status, resultsJson, totalRequests, completedRequests, totalTestsPassed, totalTestsFailed, totalDuration, startedAt, completedAt, timestamps
- schedules: id(text PK), userId(FK), collectionId(FK), collectionName, environmentId?, cronExpression, label, enabled, webhookUrl?, notifyEmail?, lastRunAt?, lastRunStatus?, lastRunId?, nextRunAt?, timestamps
- schema_contracts: id(text PK), userId(FK), requestIdentifier, collectionId?, contractSchemaJson, sampleCount, lastValidatedAt?, lastValidationPassed?, timestamps
- settings: key(text PK), value(text), updatedAt

All IDs are UUIDs generated with crypto.randomUUID().
All JSON columns are text that get JSON.parse/JSON.stringify at the service layer.
All dates stored as ISO 8601 text strings.

ALSO MODIFY:
- package.json (root) — Add "packages/db" to workspaces
- apps/api/package.json — Add "@atx/db" as dependency

TypeScript strict mode.
```

---

### Prompt P3.2: Migrate Collection & Request Services to Drizzle

```
GOAL: Migrate the collection and request services from Mongoose/MongoDB to Drizzle/SQLite.

FILES TO MODIFY:
- apps/api/src/modules/collections/collection.service.ts — Replace all Mongoose operations with Drizzle queries using @atx/db
- apps/api/src/modules/requests/request.service.ts — Replace all Mongoose operations with Drizzle queries

MIGRATION PATTERN:
1. Import { db, collections, requests } from '@atx/db'
2. Import { eq, and, asc, desc } from 'drizzle-orm'
3. Replace Collection.find({ userId }) → db.select().from(collections).where(eq(collections.userId, userId)).all()
4. Replace new Collection({...}).save() → db.insert(collections).values({ id: crypto.randomUUID(), ...data }).returning().get()
5. Replace Collection.findByIdAndUpdate() → db.update(collections).set({...}).where(eq(collections.id, id)).returning().get()
6. Replace Collection.findByIdAndDelete() → db.delete(collections).where(eq(collections.id, id))
7. JSON columns: parse on read (JSON.parse(row.foldersJson)), stringify on write (JSON.stringify(folders))
8. Keep the same service interface — only change the implementation
9. Handle cascade deletes manually: when collection deleted, delete all its requests

TypeScript strict mode. Services NEVER access req/res directly.
```

---

### Prompt P3.3: Migrate Remaining Services (Environment, History, TestRun, Schedule, SchemaContract)

```
GOAL: Migrate all remaining services from Mongoose to Drizzle.

FILES TO MODIFY:
- apps/api/src/modules/environments/environment.service.ts
- apps/api/src/modules/history/history.service.ts
- apps/api/src/modules/test-runs/test-run.service.ts
- apps/api/src/modules/test-runs/test-trend.service.ts
- apps/api/src/modules/schedules/schedule.service.ts
- apps/api/src/modules/schema-validator/schema-validator.service.ts
- apps/api/src/modules/dashboard/dashboard.service.ts

MIGRATION PATTERN (same as P3.2):
- Import from '@atx/db'
- Replace Mongoose queries with Drizzle equivalents
- Parse/stringify JSON columns
- Keep service interfaces unchanged
- For history TTL: add a cleanup function that deletes entries older than 90 days, called on app start and every 24 hours
- For schedule worker: keep node-cron logic, just change DB queries
- For dashboard aggregation: SQLite supports GROUP BY, SUM, COUNT — use SQL aggregations instead of in-memory loops where possible

TypeScript strict mode. Services NEVER access req/res directly.
```

---

### Prompt P3.4: Simplify Auth for Desktop Mode

```
GOAL: Make authentication optional in desktop mode — single-user, no login required.

FILES TO MODIFY:
- apps/api/src/middleware/authenticate.ts — If DESKTOP_MODE=true, set req.userId to DEFAULT_USER_ID and skip JWT verification
- apps/api/src/config/env.ts — Add DESKTOP_MODE boolean, DEFAULT_USER_ID constant

FILES TO CREATE:
- apps/api/src/modules/auth/desktop-init.ts — On first launch: check if default user exists, if not create one with id=DEFAULT_USER_ID

SPEC:
- DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000' (fixed UUID)
- In desktop mode: authenticate middleware becomes a pass-through that sets req.userId
- Web mode: everything works as before (JWT auth)
- The frontend auth store: if Electron detected, skip login page, go straight to main app
- Settings page has optional "Set Passphrase" for security-conscious users (P4 feature)

FILES TO MODIFY (frontend):
- apps/web/src/stores/authStore.ts — Add isDesktopMode flag. If true: isAuthenticated=true, user={id: DEFAULT_USER_ID, name: 'Local User'}
- apps/web/src/app/router.tsx — If desktop mode: skip PublicRoute redirect logic

TypeScript strict mode.
```

---

## Phase 4: Advanced Features

### Prompt P4.1: Settings Page

```
GOAL: Build a full settings page with tabbed navigation for General, AI, Proxy, Certificates, Data, and About sections.

FILES TO CREATE:
- apps/web/src/pages/SettingsPage.tsx — Full-page settings component with sidebar tab navigation
- apps/web/src/pages/SettingsPage.module.css — Settings page CSS (CSS Modules, NO Tailwind)
- apps/web/src/services/settings.service.ts — CRUD for settings (GET/PUT /api/settings)
- apps/api/src/modules/settings/settings.service.ts — Read/write settings from SQLite settings table
- apps/api/src/modules/settings/settings.controller.ts — GET /api/settings, PUT /api/settings
- apps/api/src/modules/settings/settings.routes.ts — Router

SECTIONS:
- General: Theme toggle (dark/light/system), Font size slider (12-18), Auto-save toggle, Minimize to tray toggle
- AI: API key input (stored in OS keychain via IPC), Model selector, Auto-test toggle, Daily limit, Temperature slider
- Proxy: Use system proxy toggle, Custom proxy host:port, Auth credentials, No-proxy domains
- Certificates: Global SSL verify toggle, Client certificate list (add/remove via file dialog), CA bundle path
- Data: Database location (read-only display), Export all data button, Import data button, Reset app button (with confirm dialog)
- About: App version, Check for updates button, Open-source licenses link

DESIGN:
- Left sidebar with tab labels and icons (Lucide)
- Right content area fills remaining space
- Toggle switches for boolean settings
- Slider for numeric settings
- Input fields with save-on-blur
- Dark theme, var(--color-*) tokens, CSS Modules

FILES TO MODIFY:
- apps/web/src/app/router.tsx — Add /settings route
- apps/web/src/components/sidebar/Sidebar.tsx — Add Settings icon button in footer
- apps/api/src/app.ts — Register settings routes

TypeScript strict mode. CSS Modules only. NO Tailwind.
```

---

### Prompt P4.2: Code Generation from Requests

```
GOAL: Generate code snippets (cURL, Python requests, JavaScript fetch, Go http) from any saved request config.

FILES TO CREATE:
- apps/api/src/modules/code-gen/code-gen.service.ts — Pure function: takes request config → returns code string for each language
- apps/api/src/modules/code-gen/code-gen.controller.ts — POST /api/code-gen with { method, url, headers, body, language }
- apps/api/src/modules/code-gen/code-gen.routes.ts — Router
- apps/api/src/modules/code-gen/generators/curl.ts — cURL command generator
- apps/api/src/modules/code-gen/generators/python.ts — Python requests library generator
- apps/api/src/modules/code-gen/generators/javascript.ts — fetch API generator
- apps/api/src/modules/code-gen/generators/go.ts — Go net/http generator
- apps/web/src/components/request-builder/CodeGenModal.tsx — Modal with language tabs, syntax-highlighted code preview, copy button
- apps/web/src/components/request-builder/CodeGenModal.module.css — Modal styling

SPEC:
- Each generator takes: { method, url, headers: Record<string,string>, body?: string, bodyType?: string }
- cURL: curl -X METHOD URL -H 'key: value' -d 'body'
- Python: import requests; response = requests.method(url, headers={}, json={})
- JavaScript: const response = await fetch(url, { method, headers, body })
- Go: req, _ := http.NewRequest(method, url, bytes.NewBuffer(body))
- Variables ({{var}}) shown as-is in generated code with a comment explaining substitution
- Modal triggered from "Code" button in request builder toolbar

FILES TO MODIFY:
- apps/api/src/app.ts — Register code-gen routes
- apps/web/src/components/request-builder/RequestBuilder.tsx — Add "Code" button that opens CodeGenModal

TypeScript strict mode. CSS Modules only. NO Tailwind.
```

---

### Prompt P4.3: Proxy & Certificate Configuration

```
GOAL: Implement proxy settings and client certificate management for the request executor.

FILES TO CREATE:
- apps/api/src/modules/executor/proxy-config.ts — Reads proxy settings from DB/env, creates proxy-agent for HTTP requests
- apps/api/src/modules/executor/cert-config.ts — Reads client certificates from app data directory, creates HTTPS agent with custom CA/certs
- apps/desktop/src/main/cert-manager.ts — IPC handlers: import cert file (copy to app data/certs/), list certs, delete cert

FILES TO MODIFY:
- apps/api/src/modules/executor/executor.service.ts — Apply proxy agent and HTTPS agent to outgoing requests based on settings
- apps/desktop/src/preload/index.ts — Add importCert, listCerts, deleteCert to electronAPI

SPEC:
- Proxy: support HTTP/HTTPS/SOCKS5 proxies via proxy-agent npm package
- System proxy: on Windows read from registry, on macOS from system preferences, on Linux from env vars (Electron provides this via app.resolveProxy())
- Per-environment proxy override: environment variables can contain PROXY_URL
- SSL: global toggle to disable verification (rejectUnauthorized: false)
- Client certs: .pem or .pfx files, associated with hostname patterns
- Certificate storage: apps data directory /certs/ subfolder
- HTTPS agent: combine CA bundle + client certs per request based on target hostname

TypeScript strict mode. Services NEVER access req/res directly.
```

---

## Bonus: Standalone Prompts

### Prompt B1: WebSocket Testing Support

```
GOAL: Add WebSocket testing capability — connect, send messages, view received messages in real-time.

FILES TO CREATE:
- apps/api/src/modules/websocket/websocket.service.ts — WebSocket client manager: connect, send, disconnect, collect messages
- apps/web/src/components/request-builder/WebSocketPanel.tsx — WebSocket-specific UI: connection URL, connect/disconnect button, message input, received messages log with timestamps
- apps/web/src/components/request-builder/WebSocketPanel.module.css

SPEC:
- New method option in method selector: "WS" (alongside GET, POST, etc.)
- When WS selected: request panel changes to WebSocket-specific layout
- Connect: opens WebSocket connection via backend proxy
- Message format: text (plain) or JSON (pretty-printed)
- Received messages: scrollable log with timestamp, direction (sent/received), message preview
- Connection status indicator: 🟢 Connected / 🔴 Disconnected / 🟡 Connecting
- Auto-reconnect option with configurable delay

TypeScript strict mode. CSS Modules only. NO Tailwind.
```

---

### Prompt B2: GraphQL Support

```
GOAL: Add GraphQL query/mutation support with schema introspection and query editor.

FILES TO CREATE:
- apps/api/src/modules/graphql/graphql.service.ts — Execute GraphQL queries via HTTP POST, introspect schema
- apps/web/src/components/request-builder/GraphQLPanel.tsx — GraphQL-specific UI: query editor (Monaco), variables editor, schema explorer sidebar
- apps/web/src/components/request-builder/GraphQLPanel.module.css

SPEC:
- New method option: "GQL" in method selector
- When GQL selected: request panel shows GraphQL-specific layout
- Query editor: Monaco with GraphQL syntax highlighting
- Variables panel: JSON editor for query variables
- Schema explorer: introspect endpoint, show types/fields in a tree
- Auto-complete: based on introspected schema (if available)
- Response: standard response viewer for JSON results
- Headers: standard headers panel (for auth tokens)

TypeScript strict mode. CSS Modules only. NO Tailwind.
```

---

### Prompt B3: Multi-Window Tab Detach

```
GOAL: Allow users to detach request tabs into separate windows for multi-monitor workflows.

FILES TO CREATE:
- apps/desktop/src/main/window-manager.ts — Manages multiple BrowserWindow instances, IPC routing between windows

SPEC:
- Right-click tab → "Open in New Window"
- Drag tab outside main window → detaches into new window
- Each window is a full BrowserWindow loading the same React app
- Window state synced via IPC: if a tab is moved to a new window, both windows update their tab bars
- Request data shared via the same local Express server (both windows hit same localhost:{port})
- When detached window closed: tab returns to main window

TypeScript strict mode.
```
