# ATX Desktop Application - Product Requirements Document

Version: 2.0
Date: June 2026
Product: ATX Desktop, an AI-powered API testing workbench
Audience: AI coding agents, product owners, and engineers building the desktop app

## 1. Product Vision

ATX Desktop is a local-first desktop API testing application for developers and QA teams who want the core workflow of Postman with built-in AI assistance for test creation, debugging, documentation, and coverage analysis.

The desktop app must preserve the existing ATX web app feature set while adding desktop-native capabilities: local data, native file import and export, OS keychain secrets, offline work, menu shortcuts, background schedules, backup and restore, proxy configuration, certificate management, and packaged installers.

## 2. Product Positioning

ATX Desktop should be positioned as:

- A developer workbench for building, testing, debugging, and documenting REST APIs.
- A local-first alternative for teams that want API collections stored on the machine and exportable to Git-friendly formats.
- An AI-assisted testing tool, not a generic chatbot. AI must produce practical outputs that users can inspect, edit, approve, and run.
- A desktop companion to the existing ATX web app, reusing the same UI and backend behavior where practical.

## 3. Target Users

### 3.1 Backend Developer

Needs to create API requests quickly, reuse environments, inspect responses, generate assertions, and debug failed requests without switching tools.

Success means the developer can create a request, send it, read the response, generate tests, save the request, and replay it later in one flow.

### 3.2 QA Engineer

Needs repeatable collections, test scripts, collection runner results, historical runs, schedules, and clear pass or fail output.

Success means the QA engineer can run a saved collection against multiple environments and produce results that are understandable by developers.

### 3.3 Tech Lead

Needs API coverage visibility, schema drift detection, generated documentation, and a reliable way to share or review collections.

Success means the lead can identify risky endpoints, missing tests, unstable contracts, and failing scheduled runs.

### 3.4 Solo Builder or Freelancer

Needs a lightweight local tool that works without setting up cloud infrastructure and can store secrets safely.

Success means the user can run ATX Desktop with a local database, BYO Gemini API key, and import or export collections without account setup.

## 4. Existing Web Feature Parity

The desktop app must keep the following web app behavior unless a desktop-specific requirement overrides it.

| Area | Required behavior |
|:--|:--|
| Request builder | Method selector, URL bar, query params, headers, body editor, auth config, pre-request script, test script |
| Request execution | Server-side executor, CORS bypass through local API, SSRF guard, timing, size, status, headers, and body |
| Response viewer | Pretty JSON, raw response fallback, response metadata, response headers, status badges |
| Tabs | Multiple request tabs, active tab state, close tab, new tab, keyboard shortcuts |
| Collections | Collections, nested folders, saved requests, request ordering, collection-level auth |
| Environments | Variable sets, active environment selector, text and secret variables, `{{variable}}` substitution |
| Auth | Web mode retains JWT access tokens and HTTP-only refresh cookies |
| History | Automatic request history, search and replay |
| Import | cURL import and Postman collection v2.1 import |
| Export | Export request as cURL and export collections where supported |
| AI chat | Chat with request and response context |
| AI test generation | Generate editable test assertions from response data |
| AI debug | Diagnose failed requests and propose fixes |
| AI suite generation | Generate request suites from API context |
| AI coverage analysis | Identify gaps and recommend test scenarios |
| AI docs | Generate readable API documentation from collections or request data |
| Test runner | Execute JavaScript assertions in a sandboxed test runner |
| Collection runner | Run saved requests in order, resolve chained variables, show row-level results |
| Schedules | Store scheduled collection runs with cron expressions |
| Schema validator | Infer response schema contracts and detect drift |
| Dashboard | Show usage, recent activity, test trends, and collection health |

## 5. Desktop-Specific Requirements

### 5.1 Desktop Shell

- Create `apps/desktop` as an Electron package in the existing npm workspace.
- Launch the existing React app in an Electron BrowserWindow.
- Start or connect to the local Express API before the renderer makes API calls.
- Use secure preload IPC exposed as `window.atxDesktop`.
- Keep `nodeIntegration` disabled and `contextIsolation` enabled.
- Support single-instance behavior. Opening a second instance focuses the existing window.

### 5.2 Runtime Modes

- Add `ATX_RUNTIME_MODE=web|desktop`.
- Web mode keeps the current MongoDB Atlas and JWT auth model.
- Desktop mode creates one local user automatically and may bypass JWT route gating.
- Desktop mode stores data locally and does not require MongoDB.
- The response envelope remains `{ success: boolean, data?: T, error?: { code: string, message: string } }`.

### 5.3 Local Data

- Desktop mode uses SQLite with Drizzle ORM.
- Store collections, requests, environments, history, test runs, schedules, schema contracts, settings, backup metadata, and secrets metadata.
- Store actual secret values in the OS keychain where supported.
- The app must still allow JSON export for backup and Git-friendly sharing.

### 5.4 Native Features

- Native menu bar with File, Edit, View, Request, Collection, Run, AI, Tools, and Help menus.
- Native open and save dialogs for import, export, backup, and restore.
- System tray support for background scheduled runs and restore window action.
- Native notifications for schedule failures, successful long-running runs, and update availability.
- Auto-update support through GitHub Releases or a configured release provider.
- Proxy settings for system proxy, manual proxy, and no proxy.
- Client certificate import for APIs that require mTLS.
- Optional passphrase lock for protecting local workspaces.

### 5.5 Packaging

- Provide installers for Windows first.
- Keep macOS and Linux packaging configuration compatible, even if Windows is the first release.
- Store user data under Electron `app.getPath('userData')`.
- Do not write mutable app data inside the install directory.

## 6. MVP Scope

### 6.1 MVP Must Ship

- Electron shell that launches ATX as a desktop app.
- Existing web API testing features working through the local API server.
- Desktop runtime mode contract.
- Local SQLite database for desktop mode.
- Local user bootstrap and desktop auth bypass.
- Native file dialogs for import, export, backup, and restore.
- Settings page for AI key, theme, data location, proxy, certificates, and updates.
- OS keychain storage for Gemini API key and other sensitive values.
- Installer build for Windows.
- Documentation and prompts in this docs set.

### 6.2 MVP Should Ship

- System tray with background schedule status.
- Native notifications.
- Auto-update check and install flow.
- Code generation from saved request config for cURL, JavaScript fetch, Python requests, and Go.
- Local database backup rotation.

### 6.3 Later Releases

- Cloud sync.
- Team workspaces.
- GraphQL testing.
- WebSocket testing.
- gRPC support.
- Visual API contract diff views.
- Multi-window tab detach.
- Plugin marketplace.

## 7. User Stories

### 7.1 Request Execution

As a developer, I can create a request with method, URL, params, headers, auth, and body, send it, and inspect the response so I can validate an API endpoint quickly.

Acceptance criteria:

- User can send GET, POST, PUT, PATCH, DELETE, HEAD, and OPTIONS requests.
- URL variables resolve from the active environment before execution.
- Response shows status, status text, total timing, response size, headers, and body.
- Failed network calls show a useful error without crashing the UI.

### 7.2 Save and Reuse

As a user, I can save requests into collections and folders so I can build repeatable test suites.

Acceptance criteria:

- User can create, rename, delete, and reorder collections and folders.
- User can save a request to a collection and later reopen it in a tab.
- Collection-level auth can be inherited by saved requests.

### 7.3 AI Test Generation

As a QA engineer, I can generate assertions from a response so I can turn manual checks into repeatable tests.

Acceptance criteria:

- AI receives request and response context.
- AI returns structured JSON validated by Zod.
- Generated tests are shown for review before being saved.
- User can edit generated tests before running them.

### 7.4 Local-First Desktop Use

As a desktop user, I can use ATX without a remote database so I can work offline and keep collections on my machine.

Acceptance criteria:

- First launch creates a local profile and SQLite database.
- App opens without MongoDB configuration in desktop mode.
- Collections, environments, history, schedules, and settings persist after restart.
- User can export and restore local data through native file dialogs.

### 7.5 Secure Secrets

As a user, I can store API keys and environment secrets securely so sensitive values are not written in plain text exports or logs.

Acceptance criteria:

- Gemini API key is stored in OS keychain where available.
- Secret environment variables store keychain references in SQLite.
- Exports redact secrets unless the user explicitly chooses an encrypted export.
- Logs never print secret values.

## 8. Non-Functional Requirements

### 8.1 Performance

- Cold launch should show a usable window within 5 seconds on a modern Windows laptop.
- Request builder interactions should feel immediate, with no noticeable delay for typing in URL, headers, params, or body fields.
- Sending requests should not block the renderer.
- Large JSON responses should remain inspectable up to 5 MB.
- History retention defaults to 90 days with a user setting for retention.

### 8.2 Reliability

- Desktop startup must fail gracefully if the local API server cannot start.
- The local API server must listen on localhost only.
- The app must recover from a stale server port on restart.
- SQLite migrations must be idempotent.
- Backup restore must validate file shape before replacing local data.

### 8.3 Security

- Electron renderer must not expose raw Node APIs.
- IPC handlers must validate inputs with Zod.
- Backend request bodies must keep Zod validation.
- Executor must keep SSRF protection.
- The app must not send AI prompts without explicit user action.
- AI output must be treated as untrusted until validated and reviewed.

### 8.4 Accessibility

- Keyboard shortcuts must work for primary flows.
- Focus states must be visible.
- Color cannot be the only indicator of pass, fail, warning, or active state.
- Interactive controls must have accessible labels or titles.

## 9. Success Metrics

| Metric | Target |
|:--|:--|
| Web parity | 100 percent of current web app core workflows usable in desktop |
| First request | New user can send a request within 3 minutes of first launch |
| Local persistence | Data survives restart, update, and backup restore |
| AI utility | Generated tests require minor edits for common JSON APIs |
| Stability | No app crash during normal request, import, export, or runner flows |
| Packaging | Windows installer builds from CI or local command |

## 10. Release Plan

### Phase 1: Electron Shell and Web Parity

Wrap the current app, start the local API server, resolve the API URL by IPC, and keep MongoDB for compatibility while the desktop shell is proven.

### Phase 2: Desktop Runtime Contract

Add `ATX_RUNTIME_MODE`, local user bootstrap, desktop auth bypass, and renderer support for desktop detection.

### Phase 3: Local-First Data

Add SQLite and Drizzle, migrate services from Mongoose to a database adapter pattern, and persist all desktop data locally.

### Phase 4: Native Productivity

Add file dialogs, backups, restore, menu commands, tray, notifications, settings, keychain secrets, proxy, certificates, and updater.

### Phase 5: Polish and Distribution

Add packaging, smoke tests, Electron E2E tests, installer verification, and release documentation.

## 11. Out of Scope for V1

- Multi-user accounts inside the desktop app.
- Hosted sync service.
- Team billing.
- Browser extension.
- Full OpenAPI editor.
- Full Postman workspace import parity beyond supported collection import.
- Running unreviewed AI-generated tests automatically.

## 12. Assumptions

- Electron is the desktop framework.
- Existing web UI remains the primary renderer.
- Existing Express service layer remains the business logic boundary.
- Gemini remains the AI provider for V1.
- The desktop app is local-first but can later add cloud sync.
- Windows is the first packaging target, with macOS and Linux configuration kept in the build plan.
