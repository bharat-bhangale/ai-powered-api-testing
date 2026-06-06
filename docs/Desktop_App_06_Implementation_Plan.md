# ATX Desktop Application - Implementation Plan

Version: 2.0
Date: June 2026
Product: ATX Desktop
Audience: AI coding agents implementing the desktop application

## 1. Strategy

Use a staged implementation:

1. Prove desktop shell and web parity.
2. Add runtime mode and desktop auth behavior.
3. Move desktop data to SQLite through a provider boundary.
4. Add native desktop features.
5. Package, test, and document release behavior.

This avoids blocking the first desktop build on the full database migration while still ending with a local-first desktop app.

## 2. Global Rules for Every Phase

- Follow `AGENTS.md`.
- Use strict TypeScript.
- Use named exports for new code.
- Do not add Tailwind CSS.
- Use CSS Modules and variables from `apps/web/src/styles/variables.css`.
- Validate API request bodies with Zod.
- Validate IPC payloads with Zod.
- Keep backend controllers thin and services thick.
- Services must not import Express types.
- Preserve the API response envelope.
- Use `crypto.randomUUID()` for client-side IDs.
- Run verification commands after each phase.
- If tests fail, stop and report the failing tests before changing unrelated code.

## 3. Phase 1 - Electron Shell and Local API

Goal: launch the existing ATX web app as a desktop app and connect it to a local Express API.

### 3.1 Add Desktop Workspace Package

Create:

```text
apps/desktop/
  src/main/index.ts
  src/main/window.ts
  src/main/local-api-server.ts
  src/main/menu.ts
  src/main/tray.ts
  src/main/file-dialogs.ts
  src/main/updater.ts
  src/preload/index.ts
  src/shared/desktop-api.types.ts
  src/shared/ipc-channels.ts
  src/shared/ipc-schemas.ts
  resources/icon.png
  resources/icon.ico
  resources/icon.icns
  electron-builder.yml
  package.json
  tsconfig.json
```

Implementation details:

- `index.ts` owns app lifecycle and single-instance lock.
- `window.ts` creates BrowserWindow with secure defaults.
- `local-api-server.ts` starts the existing Express app on `127.0.0.1:0`.
- `preload/index.ts` exposes `window.atxDesktop`.
- `ipc-channels.ts` defines channel constants.
- `ipc-schemas.ts` defines Zod schemas for IPC payloads.
- `desktop-api.types.ts` defines shared preload API types.

### 3.2 Root Scripts

Add root package scripts:

```json
{
  "dev:desktop": "npm run dev -w apps/desktop",
  "build:desktop": "npm run build -w apps/desktop",
  "package:desktop": "npm run package -w apps/desktop"
}
```

### 3.3 Renderer Build Compatibility

Modify web app only where needed:

- Make router Electron-safe through `HashRouter` in desktop mode.
- Make API client initialization wait for desktop API base URL.
- Keep web mode behavior unchanged.
- Create `apps/web/src/services/desktop.service.ts` as the only direct wrapper around `window.atxDesktop`.

### 3.4 Acceptance Criteria

- `npm run dev:desktop` opens a desktop window.
- Main process starts the API on a dynamic localhost port.
- Renderer obtains API base URL through IPC.
- `/health` succeeds before normal app UI loads.
- Existing web app remains runnable with `npm run dev`.

### 3.5 Verification

Run:

```bash
npm run type-check
npm run lint
npm run build:web
npm run build:api
```

If desktop package exists with build script, also run:

```bash
npm run build:desktop
```

## 4. Phase 2 - Runtime Mode and Desktop Auth

Goal: make the backend explicitly support `web` and `desktop` behavior.

### 4.1 Runtime Config

Create or modify:

```text
apps/api/src/config/runtime.ts
apps/api/src/config/env.ts
apps/api/src/config/database.ts
```

Requirements:

- Add `ATX_RUNTIME_MODE=web|desktop`.
- Default to `web` for normal API execution.
- Desktop main process starts API with `ATX_RUNTIME_MODE=desktop`.
- In desktop mode, `MONGODB_URI` is not required.
- In web mode, current MongoDB behavior remains.

### 4.2 Local User Bootstrap

Create:

```text
apps/api/src/modules/auth/desktop-auth.service.ts
```

Behavior:

- Desktop mode attaches `local-user` to request context.
- Web mode continues to use JWT auth.
- Route protection still calls auth middleware, but middleware branches by runtime mode.
- Services continue receiving a typed `userId`.

### 4.3 Renderer Auth Routing

Modify:

```text
apps/web/src/stores/authStore.ts
apps/web/src/app/router.tsx
apps/web/src/pages/LoginPage.tsx
apps/web/src/pages/RegisterPage.tsx
```

Requirements:

- Desktop mode bypasses login and register routes.
- Desktop mode still has auth state representing the local user.
- Web mode keeps existing login, register, refresh, and logout behavior.
- Optional passphrase lock is not part of this phase except for preserving future extension points.

### 4.4 Acceptance Criteria

- Desktop mode opens workbench without login.
- Web mode still redirects unauthenticated users to login.
- API modules continue receiving `userId`.
- No route loses the standard response envelope.

### 4.5 Verification

Run:

```bash
npm run type-check
npm run lint
npm run test -w apps/api
```

If tests fail, report exact failures before fixing unrelated areas.

## 5. Phase 3 - SQLite and Drizzle Data Layer

Goal: make desktop mode local-first without breaking web mode.

### 5.1 Add Database Package

Create:

```text
packages/db/
  src/client.ts
  src/schema.ts
  src/migrations.ts
  src/repositories/index.ts
  src/repositories/users.repository.ts
  src/repositories/collections.repository.ts
  src/repositories/folders.repository.ts
  src/repositories/requests.repository.ts
  src/repositories/environments.repository.ts
  src/repositories/history.repository.ts
  src/repositories/test-runs.repository.ts
  src/repositories/schedules.repository.ts
  src/repositories/schema-contracts.repository.ts
  src/repositories/settings.repository.ts
  src/repositories/secret-references.repository.ts
  src/repositories/certificates.repository.ts
  src/repositories/backups.repository.ts
  package.json
  tsconfig.json
```

Dependencies:

- `drizzle-orm`
- `drizzle-kit`
- `better-sqlite3`
- Type definitions required by the selected SQLite driver

### 5.2 Implement Schema

Use the tables from `Desktop_App_05_Backend_Schema_Document.md`:

- `users`
- `settings`
- `collections`
- `collection_folders`
- `secret_references`
- `environments`
- `requests`
- `history_entries`
- `test_runs`
- `schedules`
- `schema_contracts`
- `certificates`
- `backups`

### 5.3 Add Provider Boundary

Create:

```text
apps/api/src/data/database-provider.ts
apps/api/src/data/mongo-provider.ts
apps/api/src/data/sqlite-provider.ts
```

Requirements:

- Provider selection happens once at API startup.
- Services receive repository access through imports or dependency helpers that are stable across modes.
- Mongo provider wraps current Mongoose behavior.
- SQLite provider wraps `packages/db` repositories.

### 5.4 Migrate Services by Priority

Migration order:

1. Settings and runtime.
2. Collections and folders.
3. Requests.
4. Environments.
5. History.
6. Executor history writes.
7. Test runner.
8. Collection runner.
9. Test runs and schedules.
10. Schema validator.
11. Dashboard and trends.
12. Import and export.

For each service:

- Preserve route paths.
- Preserve response shapes.
- Preserve validation behavior.
- Add repository tests for SQLite behavior.
- Keep web-mode behavior passing through Mongo provider.

### 5.5 Acceptance Criteria

- Desktop mode starts with SQLite and no MongoDB.
- Data persists after app restart.
- Web mode still uses MongoDB.
- Existing modules work through the provider boundary.
- JSON columns are validated before use.

### 5.6 Verification

Run:

```bash
npm run type-check
npm run lint
npm run test -w apps/api
```

Add targeted Vitest tests for:

- SQLite migration creation.
- Local user bootstrap.
- Collection CRUD.
- Request CRUD.
- Environment CRUD with secret references.
- History retention cleanup.

## 6. Phase 4 - Desktop Settings, Secrets, and Native File Flows

Goal: add user-visible desktop functionality that depends on Electron.

### 6.1 Settings Page

Create:

```text
apps/web/src/pages/SettingsPage.tsx
apps/web/src/pages/SettingsPage.module.css
apps/web/src/services/settings.service.ts
apps/web/src/stores/settingsStore.ts
apps/api/src/modules/settings/settings.routes.ts
apps/api/src/modules/settings/settings.controller.ts
apps/api/src/modules/settings/settings.service.ts
apps/api/src/modules/settings/settings.validation.ts
```

Sections:

- General.
- AI.
- Proxy.
- Certificates.
- Data.
- Updates.
- About.

### 6.2 Keychain Secrets

Create:

```text
apps/desktop/src/main/keychain.ts
apps/api/src/modules/secrets/secrets.routes.ts
apps/api/src/modules/secrets/secrets.controller.ts
apps/api/src/modules/secrets/secrets.service.ts
```

Rules:

- Renderer calls preload for keychain operations.
- API stores only secret references.
- Environment secrets and auth secrets are redacted in UI, exports, logs, and AI prompts.

### 6.3 File Dialogs

Implement native dialogs for:

- Import cURL file if supported.
- Import Postman JSON.
- Export collection.
- Export request as cURL.
- Create backup.
- Restore backup.
- Import certificate.

Renderer uses `desktop.service.ts`; web mode keeps browser file inputs where required.

### 6.4 Backup and Restore

Create:

```text
apps/api/src/modules/backups/backups.routes.ts
apps/api/src/modules/backups/backups.controller.ts
apps/api/src/modules/backups/backups.service.ts
apps/api/src/modules/backups/backups.validation.ts
```

Requirements:

- Create full local backup with manifest.
- Redact secrets by default.
- Validate restore file before write.
- Create pre-restore backup.
- Reload app state after restore.

### 6.5 Acceptance Criteria

- User can configure Gemini key through Settings.
- Gemini key is stored in keychain or approved encrypted fallback.
- User can import and export through native dialogs.
- User can create backup and restore it.
- Secrets are not written to SQLite as plain values.

### 6.6 Verification

Run:

```bash
npm run type-check
npm run lint
npm run test
```

Add tests for:

- Settings validation.
- Secret reference persistence.
- Backup manifest validation.
- Restore failure recovery.

## 7. Phase 5 - Native Menus, Tray, Notifications, Updater

Goal: make the app feel like a real desktop product.

### 7.1 Native Menu

Implement:

```text
apps/desktop/src/main/menu.ts
```

Menu groups:

- File.
- Edit.
- View.
- Request.
- Collection.
- Run.
- AI.
- Tools.
- Help.

Menu commands dispatch `menu:command` events to the renderer.

### 7.2 Tray

Implement:

```text
apps/desktop/src/main/tray.ts
```

Tray actions:

- Show ATX.
- New Request.
- Run Scheduled Collections if applicable.
- Pause Schedules.
- Quit.

Tray status:

- Idle.
- Running collection.
- Schedule failure.
- Update ready.

### 7.3 Notifications

Implement:

```text
apps/desktop/src/main/notifications.ts
```

Notify for:

- Scheduled run failed.
- Long collection run completed.
- Update available.
- Backup completed while minimized.

### 7.4 Auto-Updater

Implement:

```text
apps/desktop/src/main/updater.ts
```

Requirements:

- Check updates on startup if enabled.
- Manual check in Settings.
- Notify renderer on update available.
- Install update after user confirmation.
- Disable updater for unsigned local dev builds unless explicitly enabled.

### 7.5 Acceptance Criteria

- Menu shortcuts invoke renderer actions.
- Tray can hide and restore the app.
- Notifications appear for configured events.
- Update check can be triggered from Settings.

### 7.6 Verification

Run:

```bash
npm run type-check
npm run lint
npm run build:desktop
```

Add Electron smoke tests for:

- Menu command dispatch.
- Tray restore where test environment supports it.
- Update check handler with mocked updater.

## 8. Phase 6 - Proxy, Certificates, and Code Generation

Goal: support common desktop API client requirements beyond the web app.

### 8.1 Proxy

Create:

```text
apps/desktop/src/main/proxy.ts
apps/api/src/modules/executor/proxy-config.ts
```

Requirements:

- Read system proxy through Electron where supported.
- Store manual proxy settings in Settings.
- Apply proxy only in executor.
- Support proxy auth through secret references.
- Provide Test Proxy action in Settings.

### 8.2 Certificates

Create:

```text
apps/desktop/src/main/certificates.ts
apps/api/src/modules/certificates/certificates.routes.ts
apps/api/src/modules/certificates/certificates.controller.ts
apps/api/src/modules/certificates/certificates.service.ts
apps/api/src/modules/executor/certificate-config.ts
```

Requirements:

- Import PEM and PFX.
- Copy files to app data.
- Store passphrase in keychain.
- Apply certificate per request or collection config.

### 8.3 Code Generation

Create:

```text
apps/api/src/modules/code-gen/code-gen.routes.ts
apps/api/src/modules/code-gen/code-gen.controller.ts
apps/api/src/modules/code-gen/code-gen.service.ts
apps/api/src/modules/code-gen/code-gen.validation.ts
apps/web/src/components/request-builder/CodeGenerationModal.tsx
apps/web/src/components/request-builder/CodeGenerationModal.module.css
```

Languages:

- cURL.
- JavaScript fetch.
- Python requests.
- Go net/http.

Rules:

- Generated code must redact secrets by default.
- User can copy generated code.
- Code generation uses saved request config and resolved environment values only when user chooses to include them.

### 8.4 Acceptance Criteria

- Executor honors proxy settings.
- Executor can send request with selected client certificate.
- User can generate and copy code for active request.

### 8.5 Verification

Run:

```bash
npm run type-check
npm run lint
npm run test
```

Add tests for:

- Proxy config mapping.
- Certificate metadata validation.
- Code generation output for each supported language.

## 9. Phase 7 - Packaging and Release Readiness

Goal: produce installable builds and a tested release workflow.

### 9.1 Packaging

Configure:

```text
apps/desktop/electron-builder.yml
```

Targets:

- Windows NSIS.
- Windows portable.
- macOS DMG and ZIP.
- Linux AppImage and DEB.

Windows is the first required release target.

### 9.2 Release Artifacts

Build outputs:

- Installer.
- Portable package.
- Unpacked app for smoke testing.
- Release notes.
- Checksums.

### 9.3 CI

Add workflow when release packaging is ready:

```text
.github/workflows/desktop-build.yml
```

Jobs:

- Install dependencies.
- Type-check.
- Lint.
- Test.
- Build web.
- Build API.
- Build desktop.
- Package desktop on target OS.

### 9.4 Acceptance Criteria

- Windows installer builds.
- Installed app launches.
- App creates local data directory.
- App sends a request.
- App persists collection after restart.
- Uninstall does not delete user data unless user chooses explicit data removal if such option is implemented.

## 10. End-to-End Test Scenarios

### 10.1 Core Desktop Smoke

1. Launch desktop app.
2. Wait for local API health.
3. Confirm workbench renders.
4. Send GET request to a test endpoint.
5. Confirm response viewer updates.
6. Save request to a new collection.
7. Restart app.
8. Confirm collection and request still exist.

### 10.2 AI Test Generation

1. Configure Gemini key.
2. Send request with JSON response.
3. Generate tests.
4. Accept generated tests.
5. Run tests.
6. Confirm test results appear.

### 10.3 Import and Export

1. Import Postman collection JSON.
2. Confirm collection tree updates.
3. Export ATX collection JSON.
4. Import exported file into clean workspace.
5. Confirm request count matches.

### 10.4 Backup and Restore

1. Create collections, environments, history, and settings.
2. Create backup.
3. Modify data.
4. Restore backup.
5. Confirm original data returns.

### 10.5 Schedule Notification

1. Create schedule for a collection.
2. Force failure through a controlled endpoint.
3. Confirm schedule run record is saved.
4. Confirm native notification appears.

## 11. Final Acceptance Checklist

The desktop project is complete when:

- All seven docs in this documentation pack exist.
- `apps/desktop` runs the renderer and local API.
- `window.atxDesktop` exposes the documented preload API.
- Desktop mode works without MongoDB.
- SQLite schema and migrations match the backend schema document.
- Current ATX web features work in desktop mode.
- Desktop-native import, export, backup, restore, settings, menu, tray, notifications, proxy, certificates, and updater flows are implemented or clearly staged by release phase.
- Build, lint, type-check, and test commands pass or exact pre-existing failures are documented.
