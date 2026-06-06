# ATX Desktop Application - App Flow Document

Version: 2.0
Date: June 2026
Product: ATX Desktop
Audience: AI coding agents implementing screens, state, routes, and workflow behavior

## 1. Flow Principles

ATX Desktop must open directly into a productive API testing workspace. The user should not see a marketing page or account gate in desktop mode. Login and register remain web-mode screens only unless the user enables an optional passphrase lock.

Core flow rules:

- Desktop mode starts with a local workspace.
- Web mode keeps current auth routes.
- Primary screen is the workbench: top bar, sidebar, request workspace, AI panel, and status bar.
- Long operations must show progress and remain cancellable where practical.
- AI output must be reviewable before it changes saved requests, tests, collections, or schemas.
- Import, export, backup, and restore use native file dialogs in desktop mode.

## 2. Application Startup Flow

```text
User launches ATX Desktop
|
+-- Electron main obtains single-instance lock
|
+-- Main resolves userData directory
|
+-- Main starts local Express API with ATX_RUNTIME_MODE=desktop
|
+-- API initializes runtime config
|
+-- API runs SQLite migrations
|
+-- API creates or loads local user
|
+-- API returns success from /health
|
+-- Main creates BrowserWindow or reveals loading window
|
+-- Renderer loads React app
|
+-- Renderer calls window.atxDesktop.getApiBaseUrl()
|
+-- API client initializes
|
+-- Renderer calls desktop runtime info
|
+-- App chooses first route
```

First route selection:

| Condition | Route |
|:--|:--|
| Passphrase lock enabled and locked | `#/unlock` |
| First launch and Gemini key missing | `#/settings/ai?firstLaunch=true` |
| First launch and no collections exist | `#/` with empty workspace |
| Existing workspace | Last active route or `#/` |
| Startup error | `#/startup-error` |

Startup error screen must show:

- Error code.
- Human-readable message.
- Retry button.
- Open logs button.
- Open data directory button.
- Quit button.

## 3. Application Shutdown Flow

```text
User exits app
|
+-- Renderer saves volatile UI state
|
+-- Main receives before-quit
|
+-- Main prevents new requests
|
+-- API lets in-flight request execution finish or timeout
|
+-- Scheduler stops accepting new runs
|
+-- SQLite connection closes
|
+-- Main destroys tray and BrowserWindow
|
+-- App exits
```

If a collection run is active:

- Show confirmation dialog.
- Options: Cancel run and quit, continue in tray, or return to app.
- If the user chooses tray, keep API and scheduler running.

## 4. First Launch Flow

Goal: let the user start testing APIs quickly while setting only required desktop preferences.

Steps:

1. App creates local workspace.
2. App creates `local-user`.
3. App opens the workbench.
4. If Gemini API key is missing, show a compact AI setup prompt in settings or top bar.
5. User may skip AI setup and still use non-AI API testing features.
6. App creates one default environment named `Local`.
7. App opens a blank request tab.

Acceptance criteria:

- First launch does not require MongoDB.
- First launch does not require web login.
- User can send a request without configuring AI.
- User can add Gemini key later in Settings.

## 5. Main Navigation Map

```text
Workbench (#/)
|
+-- Request Builder
|   +-- Params
|   +-- Headers
|   +-- Auth
|   +-- Body
|   +-- Pre-request Script
|   +-- Tests
|
+-- Response Viewer
|   +-- Body
|   +-- Headers
|   +-- Cookies if implemented
|   +-- Timeline if implemented
|   +-- Test Results
|
+-- Sidebar
|   +-- Collections
|   +-- Environments
|   +-- History
|   +-- Imports
|
+-- AI Panel
|   +-- Chat
|   +-- Generate Tests
|   +-- Debug
|   +-- Generate Suite
|   +-- Analyze Coverage
|   +-- Generate Docs
|
+-- Runner (#/runner)
|
+-- Dashboard (#/dashboard)
|
+-- Settings (#/settings)
    +-- General
    +-- AI
    +-- Proxy
    +-- Certificates
    +-- Data
    +-- Updates
    +-- About
```

## 6. Request Execution Flow

```text
User enters method, URL, params, headers, auth, and body
|
+-- User clicks Send or presses Ctrl+Enter
|
+-- Renderer validates minimum request state
|
+-- Environment variables are resolved
|
+-- Request is sent to local /api/execute endpoint
|
+-- Executor applies SSRF guard
|
+-- Executor applies proxy and certificate settings
|
+-- HTTP request executes
|
+-- Response is normalized
|
+-- Test script runs if present
|
+-- History entry is saved
|
+-- Renderer displays response and test results
```

Validation behavior:

- Empty URL shows inline validation and does not call API.
- Invalid URL shows inline validation.
- Missing environment variable shows a warning with variable names.
- Invalid JSON body shows editor error and blocks send for JSON mode.
- Network failure displays error panel with retry and AI debug action.

Response behavior:

- JSON responses render pretty view by default.
- Non-JSON responses render raw view.
- Large responses show size warning and use lazy rendering.
- Binary responses show metadata and download action instead of raw bytes.

## 7. Save Request Flow

```text
User clicks Save or presses Ctrl+S
|
+-- If request is already saved, update saved request
|
+-- If request is unsaved, open Save Request modal
|
+-- User chooses collection and folder
|
+-- Renderer validates name and collection
|
+-- API saves request
|
+-- Sidebar refreshes collection tree
|
+-- Tab becomes linked to saved request
```

Rules:

- Client-created temporary IDs use `crypto.randomUUID()`.
- Saved request IDs come from the backend repository.
- Saving preserves method, URL, params, headers, auth, body, pre-request script, and test script.
- Save failure leaves the current tab unsaved and shows a retry action.

## 8. Collection and Folder Flow

Core actions:

- Create collection.
- Rename collection.
- Delete collection.
- Export collection.
- Create folder.
- Rename folder.
- Delete folder.
- Move request between folders.
- Run collection.

Flow for creating a collection:

```text
User clicks New Collection
|
+-- Create Collection modal opens
|
+-- User enters name and optional description
|
+-- Renderer validates fields
|
+-- API creates collection
|
+-- Sidebar selects the new collection
```

Deletion rules:

- Deleting a collection requires confirmation.
- Confirmation must describe how many folders and requests will be removed.
- Deleting a folder requires confirmation if it contains requests.
- The API handles cascade behavior consistently for MongoDB and SQLite providers.

## 9. Environment Flow

```text
User opens environment manager
|
+-- User creates or edits environment
|
+-- Variables are edited in key-value rows
|
+-- Secret variables are masked
|
+-- User saves
|
+-- API stores non-secret values in database
|
+-- Secret values are stored through desktop keychain in desktop mode
|
+-- Active environment selector updates
```

Variable resolution:

- `{{baseUrl}}` resolves from active environment.
- Missing variable produces a warning before send.
- Secret values are masked in UI after save.
- Secret values are redacted from AI prompts and exports.

## 10. Import Flow

### 10.1 cURL Import

```text
User opens Import
|
+-- User selects cURL tab
|
+-- User pastes cURL command
|
+-- Parser converts command to request config
|
+-- Preview shows method, URL, headers, and body
|
+-- User imports to current tab or saves to collection
```

### 10.2 Postman Import

```text
User chooses Import from File
|
+-- Native file dialog opens
|
+-- User selects Postman collection JSON
|
+-- API parser validates collection shape
|
+-- Preview shows collection, folder, and request counts
|
+-- User confirms import
|
+-- Collections and requests are created
```

Import failure behavior:

- Show parser error with file name.
- Do not partially import invalid files.
- If partial import support is later added, show exact skipped items before confirmation.

## 11. Export and Backup Flow

### 11.1 Export Collection

```text
User selects collection
|
+-- User clicks Export
|
+-- Renderer requests export payload from API
|
+-- Native save dialog opens
|
+-- User chooses path
|
+-- Main writes file
|
+-- Success notification appears
```

### 11.2 Backup

```text
User opens Settings > Data > Create Backup
|
+-- API builds backup manifest and data payload
|
+-- Secrets are redacted by default
|
+-- Native save dialog opens
|
+-- Backup file is written
|
+-- Backup metadata is stored locally
```

### 11.3 Restore

```text
User opens Settings > Data > Restore Backup
|
+-- Native open dialog opens
|
+-- API validates backup schema and version
|
+-- UI shows restore summary
|
+-- App creates pre-restore backup
|
+-- Restore transaction runs
|
+-- App reloads workspace data
```

Restore failure behavior:

- Keep existing workspace data.
- Show error and recovery instructions.
- Keep pre-restore backup path visible.

## 12. AI Chat Flow

```text
User opens AI panel
|
+-- User writes question
|
+-- Renderer builds context from active request and response
|
+-- Secrets are redacted
|
+-- API sends structured prompt to Gemini
|
+-- Response is validated
|
+-- Chat answer appears with actionable suggestions
```

Rules:

- AI chat must never run automatically after request execution.
- User controls when context is sent.
- Chat history may be local-only and clearable from settings.
- AI errors show provider status, retry action, and settings link.

## 13. AI Test Generation Flow

```text
User receives a response
|
+-- User clicks Generate Tests
|
+-- API receives request and response context
|
+-- Gemini returns structured test suggestions
|
+-- Zod validates output
|
+-- UI shows suggestions in review panel
|
+-- User accepts selected tests
|
+-- Tests are inserted into Test Editor
|
+-- User runs tests
```

Acceptance criteria:

- Generated tests are editable.
- Existing tests are not overwritten without confirmation.
- If AI returns invalid structure, show validation error and preserve current tests.
- Accepted tests use the existing ATX test runner API surface.

## 14. AI Debug Flow

```text
Request fails or returns error status
|
+-- User clicks Debug with AI
|
+-- API receives request, response, timing, headers, and sanitized body
|
+-- Gemini returns diagnosis, likely causes, and fix suggestions
|
+-- Zod validates output
|
+-- UI displays grouped suggestions
```

Suggestion groups:

- Request configuration.
- Auth.
- Environment variables.
- Server response.
- Network or proxy.
- Test script issue.

No suggestion should mutate a request without explicit user approval.

## 15. AI Suite Generation Flow

```text
User opens collection or imports API context
|
+-- User clicks Generate Suite
|
+-- User selects target collection and generation scope
|
+-- API builds structured prompt
|
+-- Gemini returns proposed folders and requests
|
+-- Zod validates output
|
+-- UI shows diff-style preview
|
+-- User accepts selected items
|
+-- API creates folders and requests
```

Scope options:

- Add missing happy-path tests.
- Add error-path tests.
- Add auth tests.
- Add boundary tests.
- Generate from imported OpenAPI context if supported.

## 16. Coverage and Schema Flow

### 16.1 Coverage Analysis

```text
User opens Dashboard or AI coverage action
|
+-- API gathers collections, requests, tests, histories, and recent runs
|
+-- Coverage analyzer identifies missing areas
|
+-- UI shows endpoint coverage and recommendations
```

### 16.2 Schema Contract

```text
Successful response is received
|
+-- User chooses Infer Schema or auto-infer is enabled
|
+-- API extracts response shape
|
+-- SchemaContract is created or updated
|
+-- Later response is compared to contract
|
+-- Violations are recorded and displayed
```

Violation types:

- Missing field.
- Type change.
- Unexpected field.
- Null value.

## 17. Test Runner Flow

```text
User writes or accepts test script
|
+-- User clicks Run Tests
|
+-- Renderer sends response context and script
|
+-- API runs sandboxed test runner
|
+-- Test results return
|
+-- UI shows summary and itemized pass/fail output
```

Rules:

- Test runner must not expose unsafe Node APIs.
- Test failures must show assertion name and message.
- Syntax errors must point to line or script section where possible.

## 18. Collection Runner Flow

```text
User opens runner
|
+-- User selects collection and environment
|
+-- User starts run
|
+-- Runner executes requests in order
|
+-- Variables and chained values resolve between steps
|
+-- Each response runs request tests
|
+-- Results stream or refresh into runner UI
|
+-- TestRun record is saved
```

Controls:

- Start.
- Stop.
- Rerun failed.
- Export run result.
- Open request from failed row.

Result states:

- Pending.
- Running.
- Passed.
- Failed.
- Skipped.
- Cancelled.

## 19. Schedule Flow

```text
User creates schedule
|
+-- User selects collection and environment
|
+-- User enters cron expression or chooses preset
|
+-- API validates schedule
|
+-- Schedule worker registers next run
|
+-- App may continue runs in tray
|
+-- Native notification appears on failure
```

Rules:

- Schedules run only while desktop app or tray process is running.
- Schedule status shows last run, next run, and last result.
- Failed schedules may send webhook notification if configured.
- Desktop notifications are local and do not require cloud services.

## 20. Settings Flow

Settings sections:

| Section | Controls |
|:--|:--|
| General | Theme, startup behavior, default workspace route, history retention |
| AI | Gemini API key, model, usage display, clear AI chat history |
| Proxy | System proxy, manual proxy, no proxy, test proxy |
| Certificates | Import certificate, assign certificate, remove certificate |
| Data | Data directory, backup, restore, export all, clear history |
| Updates | Check for updates, update channel, auto-download toggle |
| About | Version, runtime mode, API status, open logs, licenses |

Settings save behavior:

- Save per section.
- Validate before save.
- Show success or field-level errors.
- Sensitive fields write through keychain adapter.

## 21. Offline and Error Flows

### 21.1 Target API Offline

- Show network error in response viewer.
- Offer retry.
- Offer AI debug if AI is configured.
- Save history entry with failure metadata if enabled.

### 21.2 Local API Offline

- Show app-level connection error.
- Retry API health check.
- Offer restart local API.
- Offer open logs.

### 21.3 Gemini API Error

- Show provider error in AI panel.
- Preserve user prompt and context.
- Offer retry and settings link.
- Do not clear previous AI results.

### 21.4 SQLite Error

- Show non-destructive error.
- Stop writes if database integrity is uncertain.
- Offer create backup or open data directory when possible.

## 22. Keyboard Shortcuts

| Shortcut | Action |
|:--|:--|
| `Ctrl+N` | New request tab |
| `Ctrl+S` | Save request |
| `Ctrl+Enter` | Send request |
| `Ctrl+W` | Close active tab |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `Ctrl+L` | Focus URL bar |
| `Ctrl+E` | Open environment selector |
| `Ctrl+H` | Toggle history |
| `Ctrl+Shift+C` | Copy request as cURL |
| `Ctrl+Shift+I` | Toggle AI panel |
| `Ctrl+Shift+R` | Open collection runner |
| `Ctrl+,` | Open settings |
| `F5` | Send request or rerun current runner item based on focus |
| `Escape` | Close modal, menu, or active overlay |

Use `Cmd` instead of `Ctrl` on macOS for native menu accelerators.

## 23. Menu Command Mapping

Native menu commands must dispatch to renderer actions:

| Menu command | Renderer action |
|:--|:--|
| `request:new` | Create request tab |
| `request:send` | Send active request |
| `request:save` | Save active request |
| `request:copy-curl` | Copy active request as cURL |
| `request:generate-code` | Open code generation modal |
| `collection:new` | Open create collection modal |
| `collection:run` | Open runner for selected collection |
| `file:import` | Open import modal or native file import |
| `file:export` | Export selected item |
| `ai:chat` | Focus AI chat |
| `ai:generate-tests` | Start AI test generation for active response |
| `ai:debug` | Start AI debug for active response |
| `tools:settings` | Open settings |

If no active context exists, the renderer shows a short disabled-action message.
