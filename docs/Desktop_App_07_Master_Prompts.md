# ATX Desktop App - Master Prompts for Claude and Antigravity

Version: 2.0
Date: June 2026
Product: ATX Desktop
Audience: User copying prompts into Claude, Antigravity, or another AI coding tool

## How to Use These Prompts

Use one prompt at a time. Run prompts in order unless you have already completed an earlier phase. Each prompt is written to be copied into an AI coding agent with this repository open:

```text
C:\Users\bhang\OneDrive\Desktop\AI Projects\ai-powered-api-testing
```

For every prompt:

- Follow `AGENTS.md`.
- Use strict TypeScript.
- Use named exports for new code.
- Use CSS Modules and CSS variables.
- Do not add Tailwind CSS.
- Validate API request bodies and IPC payloads with Zod.
- Preserve the API response envelope.
- Keep backend controllers thin and services thick.
- Do not auto-fix unrelated test failures. Report them.
- Run the verification commands listed in the prompt.

## Global Context Block

Copy this context into the top of every prompt if the AI tool does not already know the repo.

```text
You are working in the ATX monorepo: React 19 + Vite 6 frontend, Express 5 + TypeScript backend, MongoDB Atlas web mode, npm workspaces, Zustand, TanStack Query, CSS Modules, CSS variables, and Google Gemini structured AI responses validated with Zod.

Current feature surface to preserve: request builder, response viewer, multi-tabs, collections/folders, environments, history, cURL import/export, Postman import, AI chat, AI test generation, AI debug, AI suite generation, AI coverage analysis, AI docs generation, test runner, collection runner, schedules, schema validator, dashboard, environment matrix, and test trends.

Target desktop app: Electron app in apps/desktop. It reuses apps/web as renderer and apps/api as local API. Renderer obtains the local API URL through secure preload IPC exposed as window.atxDesktop. Backend supports ATX_RUNTIME_MODE=web|desktop. Web mode keeps MongoDB and JWT auth. Desktop mode uses SQLite/Drizzle, creates a local user, and can bypass JWT route gating. All new code must follow AGENTS.md.
```

## Prompt P1 - Create Electron Desktop Package

```text
Implement Phase 1 of ATX Desktop: create the Electron desktop workspace package.

Files to create:
- apps/desktop/package.json
- apps/desktop/tsconfig.json
- apps/desktop/electron-builder.yml
- apps/desktop/src/main/index.ts
- apps/desktop/src/main/window.ts
- apps/desktop/src/main/local-api-server.ts
- apps/desktop/src/preload/index.ts
- apps/desktop/src/shared/desktop-api.types.ts
- apps/desktop/src/shared/ipc-channels.ts
- apps/desktop/src/shared/ipc-schemas.ts
- apps/desktop/resources/icon.png if an existing asset can be reused or generated locally

Files to modify:
- package.json

Implementation requirements:
- Add apps/desktop as an npm workspace package under the existing workspaces setup.
- Add root scripts: dev:desktop, build:desktop, package:desktop.
- Use Electron with secure defaults: contextIsolation true, nodeIntegration false, sandbox where compatible with preload requirements.
- Create a BrowserWindow with default size 1440x900 and minimum size 1024x720.
- In dev mode, load the Vite dev server URL.
- In production, load the built apps/web dist output.
- Implement single-instance lock. A second app launch should focus the existing window.
- Add typed IPC channel constants.
- Add Zod schemas for IPC payloads.
- Expose window.atxDesktop from preload with getRuntimeInfo and getApiBaseUrl functions.
- Do not expose raw Node or Electron APIs to the renderer.
- Use named exports in all new TypeScript files.

Verification commands:
- npm run type-check
- npm run lint
- npm run build:web
- npm run build:api
- npm run build:desktop

Stop and report exact failures if verification fails.
```

## Prompt P2 - Start Local Express API from Electron

```text
Implement the local API startup flow for ATX Desktop.

Files to inspect:
- apps/api/src/app.ts
- apps/api/src/server.ts
- apps/api/src/config/env.ts
- apps/api/src/config/database.ts
- apps/desktop/src/main/local-api-server.ts
- apps/desktop/src/main/index.ts
- apps/desktop/src/shared/ipc-channels.ts
- apps/desktop/src/shared/ipc-schemas.ts

Files to modify or create:
- apps/api/src/server.ts if it needs an exported start function
- apps/api/src/config/runtime.ts
- apps/desktop/src/main/local-api-server.ts
- apps/desktop/src/main/index.ts
- apps/desktop/src/preload/index.ts
- apps/desktop/src/shared/desktop-api.types.ts

Implementation requirements:
- Refactor API server startup so Electron can start the Express app programmatically without spawning an unmanaged shell command.
- Keep normal npm run dev:api and npm run build:api behavior working.
- Start the local API on 127.0.0.1 and port 0 in desktop mode.
- Capture the chosen port and expose http://127.0.0.1:{port} through window.atxDesktop.getApiBaseUrl().
- Wait for /health to return success before marking desktop runtime ready.
- Add ATX_RUNTIME_MODE parsing with Zod. Allowed values: web, desktop.
- Desktop mode must not require MONGODB_URI during this prompt if SQLite is not implemented yet; use a controlled temporary compatibility path or clear startup status that the next prompt will complete.
- The local API must not listen on 0.0.0.0.
- Shut down the API cleanly when Electron quits.

Verification commands:
- npm run type-check
- npm run lint
- npm run build:api
- npm run build:desktop

Stop and report exact failures if verification fails.
```

## Prompt P3 - Renderer Desktop API Initialization

```text
Implement renderer-side desktop integration so API calls wait for the desktop API base URL.

Files to inspect:
- apps/web/src/services/api.ts
- apps/web/src/app/App.tsx
- apps/web/src/app/router.tsx
- apps/web/src/stores/authStore.ts
- apps/web/src/main.tsx
- apps/desktop/src/preload/index.ts
- apps/desktop/src/shared/desktop-api.types.ts

Files to create:
- apps/web/src/services/desktop.service.ts
- apps/web/src/types/desktop.ts if shared renderer-only types are needed

Files to modify:
- apps/web/src/services/api.ts
- apps/web/src/app/App.tsx
- apps/web/src/app/router.tsx

Implementation requirements:
- Add a small desktop service wrapper. It is the only web-side code that directly reads window.atxDesktop.
- Export isDesktopRuntime, getDesktopRuntimeInfo, and getDesktopApiBaseUrl.
- Modify apiClient setup so baseURL can be initialized before auth checks and data fetching.
- Web mode keeps VITE_API_URL or http://localhost:8000.
- Desktop mode uses window.atxDesktop.getApiBaseUrl().
- Add an app initialization state so the UI does not call the API before baseURL is set.
- Use BrowserRouter in web mode and HashRouter in desktop packaged mode.
- Keep existing auth interceptor behavior in web mode.
- Do not redirect desktop users to /login after startup.

Verification commands:
- npm run type-check
- npm run lint
- npm run build:web
- npm run build:desktop

Stop and report exact failures if verification fails.
```

## Prompt P4 - Desktop Runtime Auth Bypass and Local User

```text
Implement desktop runtime auth behavior and local user bootstrap.

Files to inspect:
- apps/api/src/middleware/authenticate.ts
- apps/api/src/modules/auth/auth.routes.ts
- apps/api/src/modules/auth/auth.controller.ts
- apps/api/src/modules/auth/auth.service.ts
- apps/api/src/models/User.model.ts
- apps/web/src/stores/authStore.ts
- apps/web/src/app/router.tsx

Files to create:
- apps/api/src/modules/auth/desktop-auth.service.ts
- apps/api/src/config/runtime.ts if not already created

Files to modify:
- apps/api/src/middleware/authenticate.ts
- apps/api/src/config/env.ts
- apps/web/src/stores/authStore.ts
- apps/web/src/app/router.tsx

Implementation requirements:
- In web mode, preserve current JWT access token and refresh cookie behavior.
- In desktop mode, attach a local user identity to authenticated API requests.
- Use local user ID local-user, email local@atx.desktop, and name Local User.
- Desktop mode must not require login or register before showing the workbench.
- Desktop mode should represent auth state in the frontend as authenticated local user.
- Keep services receiving a typed userId.
- Do not remove web login/register pages.
- Do not weaken web auth behavior.
- Keep the standard API response envelope.

Verification commands:
- npm run type-check
- npm run lint
- npm run test -w apps/api
- npm run build:web
- npm run build:api

Stop and report exact failures if verification fails.
```

## Prompt P5 - Add SQLite and Drizzle Package

```text
Implement the desktop SQLite/Drizzle database package.

Files to inspect:
- docs/Desktop_App_05_Backend_Schema_Document.md
- package.json
- packages/shared/src/types

Files to create:
- packages/db/package.json
- packages/db/tsconfig.json
- packages/db/src/client.ts
- packages/db/src/schema.ts
- packages/db/src/migrations.ts
- packages/db/src/index.ts
- packages/db/src/repositories/index.ts
- packages/db/src/repositories/users.repository.ts
- packages/db/src/repositories/settings.repository.ts
- packages/db/src/repositories/collections.repository.ts
- packages/db/src/repositories/folders.repository.ts
- packages/db/src/repositories/requests.repository.ts
- packages/db/src/repositories/environments.repository.ts
- packages/db/src/repositories/history.repository.ts
- packages/db/src/repositories/test-runs.repository.ts
- packages/db/src/repositories/schedules.repository.ts
- packages/db/src/repositories/schema-contracts.repository.ts
- packages/db/src/repositories/secret-references.repository.ts
- packages/db/src/repositories/certificates.repository.ts
- packages/db/src/repositories/backups.repository.ts

Implementation requirements:
- Add packages/db to npm workspaces through existing workspace pattern.
- Use drizzle-orm and better-sqlite3.
- Implement all tables listed in the backend schema document.
- Use ISO string timestamps.
- Validate JSON text columns before returning data from repositories.
- Add repository methods for users, settings, collections, folders, requests, environments, history, test runs, schedules, schema contracts, secret references, certificates, and backups.
- Use typed inputs and typed return values.
- Do not store secret values in SQLite. Store only references.
- Add migration bootstrap that creates tables idempotently.

Verification commands:
- npm run type-check
- npm run lint
- npm run test

Stop and report exact failures if verification fails.
```

## Prompt P6 - Add API Data Provider Boundary

```text
Implement the API data provider boundary for web and desktop modes.

Files to inspect:
- apps/api/src/models
- apps/api/src/modules/collections/collection.service.ts
- apps/api/src/modules/requests/request.service.ts
- apps/api/src/modules/environments/environment.service.ts
- apps/api/src/modules/history/history.service.ts
- apps/api/src/modules/test-runs/test-run.service.ts
- apps/api/src/modules/schedules/schedule.service.ts
- apps/api/src/modules/schema-validator/schema-validator.service.ts
- packages/db/src/repositories

Files to create:
- apps/api/src/data/database-provider.ts
- apps/api/src/data/mongo-provider.ts
- apps/api/src/data/sqlite-provider.ts

Files to modify:
- apps/api/src/config/database.ts
- apps/api/src/config/runtime.ts
- apps/api/src/modules/auth/desktop-auth.service.ts

Implementation requirements:
- Define a typed AtxDataProvider interface with repositories for users, collections, folders, requests, environments, history, testRuns, schedules, schemaContracts, settings, secretReferences, certificates, and backups.
- Implement mongo provider by wrapping current Mongoose model behavior where possible.
- Implement sqlite provider by using packages/db repositories.
- Select provider based on ATX_RUNTIME_MODE.
- Keep provider selection centralized.
- Do not rewrite every service in this prompt. Create the boundary and migrate local user bootstrap plus settings if needed to prove the pattern.
- Keep web mode behavior unchanged.

Verification commands:
- npm run type-check
- npm run lint
- npm run test -w apps/api
- npm run build:api

Stop and report exact failures if verification fails.
```

## Prompt P7 - Migrate Core Services to Provider

```text
Migrate ATX core persistence services to the data provider boundary.

Files to inspect:
- apps/api/src/data/database-provider.ts
- apps/api/src/modules/collections/collection.service.ts
- apps/api/src/modules/requests/request.service.ts
- apps/api/src/modules/environments/environment.service.ts
- apps/api/src/modules/history/history.service.ts
- apps/api/src/modules/executor/executor.service.ts
- apps/api/src/modules/import/import.controller.ts
- apps/api/src/modules/import/parsers/postman.parser.ts

Files to modify:
- apps/api/src/modules/collections/collection.service.ts
- apps/api/src/modules/requests/request.service.ts
- apps/api/src/modules/environments/environment.service.ts
- apps/api/src/modules/history/history.service.ts
- apps/api/src/modules/executor/executor.service.ts
- apps/api/src/data/mongo-provider.ts
- apps/api/src/data/sqlite-provider.ts

Implementation requirements:
- Move collections, folders, saved requests, environments, and history to repository access.
- Preserve existing route paths and response shapes.
- Preserve validation behavior.
- Desktop mode persists data in SQLite.
- Web mode persists data in MongoDB.
- Environment secret values should support secretRefId metadata and redact values in desktop exports.
- Executor should record history through provider.
- Services must not import Express types.
- Add focused tests for desktop SQLite CRUD and web-mode provider behavior where feasible.

Verification commands:
- npm run type-check
- npm run lint
- npm run test -w apps/api
- npm run build:api

Stop and report exact failures if verification fails.
```

## Prompt P8 - Migrate Runner, Schedules, Schema, Dashboard

```text
Migrate runner, schedules, schema validator, dashboard, and trends to the provider boundary.

Files to inspect:
- apps/api/src/modules/test-runner/test-runner.service.ts
- apps/api/src/modules/collection-runner/collection-runner.service.ts
- apps/api/src/modules/test-runs/test-run.service.ts
- apps/api/src/modules/test-runs/test-trend.service.ts
- apps/api/src/modules/schedules/schedule.service.ts
- apps/api/src/modules/schedules/schedule.worker.ts
- apps/api/src/modules/schema-validator/schema-validator.service.ts
- apps/api/src/modules/dashboard/dashboard.service.ts
- apps/api/src/modules/environment-matrix/environment-matrix.service.ts

Files to modify:
- The service files listed above
- apps/api/src/data/mongo-provider.ts
- apps/api/src/data/sqlite-provider.ts
- packages/db/src/repositories/test-runs.repository.ts
- packages/db/src/repositories/schedules.repository.ts
- packages/db/src/repositories/schema-contracts.repository.ts

Implementation requirements:
- Test runs persist through provider.
- Collection runner saves results through provider.
- Schedules persist through provider and run only while desktop app or tray process is active.
- Schema contracts persist through provider.
- Dashboard and test trends read from provider.
- Preserve route paths and response envelope.
- Add tests for scheduled run persistence, test trend reads, and schema contract upsert behavior.

Verification commands:
- npm run type-check
- npm run lint
- npm run test -w apps/api
- npm run build:api

Stop and report exact failures if verification fails.
```

## Prompt P9 - Desktop Settings, Secrets, and Keychain

```text
Implement desktop settings and keychain-backed secrets.

Files to inspect:
- docs/Desktop_App_04_UI_UX_Design_Brief.md
- docs/Desktop_App_05_Backend_Schema_Document.md
- apps/web/src/styles/variables.css
- apps/web/src/app/router.tsx
- apps/desktop/src/preload/index.ts
- apps/desktop/src/shared/ipc-schemas.ts
- packages/db/src/repositories/settings.repository.ts
- packages/db/src/repositories/secret-references.repository.ts

Files to create:
- apps/web/src/pages/SettingsPage.tsx
- apps/web/src/pages/SettingsPage.module.css
- apps/web/src/services/settings.service.ts
- apps/web/src/stores/settingsStore.ts
- apps/desktop/src/main/keychain.ts
- apps/api/src/modules/settings/settings.routes.ts
- apps/api/src/modules/settings/settings.controller.ts
- apps/api/src/modules/settings/settings.service.ts
- apps/api/src/modules/settings/settings.validation.ts
- apps/api/src/modules/secrets/secrets.routes.ts
- apps/api/src/modules/secrets/secrets.controller.ts
- apps/api/src/modules/secrets/secrets.service.ts
- apps/api/src/modules/secrets/secrets.validation.ts

Files to modify:
- apps/api/src/app.ts
- apps/web/src/app/router.tsx
- apps/web/src/components/layout/TopBar.tsx if Settings entry is not already present

Implementation requirements:
- Add Settings route with sections: General, AI, Proxy, Certificates, Data, Updates, About.
- Use CSS Modules and existing variables only.
- Add settings API module with Zod validation.
- Add secrets API module for secret reference metadata.
- Implement keychain IPC in Electron main and preload.
- Store Gemini API key through keychain in desktop mode.
- Store only secret references in SQLite.
- Redact secrets in UI after save.
- Web mode should keep existing env-based Gemini key behavior unless settings are explicitly supported.

Verification commands:
- npm run type-check
- npm run lint
- npm run test
- npm run build:web
- npm run build:api
- npm run build:desktop

Stop and report exact failures if verification fails.
```

## Prompt P10 - Native Import, Export, Backup, Restore

```text
Implement native file dialogs and local backup/restore.

Files to inspect:
- apps/web/src/components/import/ImportModal.tsx
- apps/web/src/utils/curl-parser.ts
- apps/web/src/utils/curl-generator.ts
- apps/api/src/modules/import/import.routes.ts
- apps/api/src/modules/import/import.controller.ts
- apps/api/src/modules/import/parsers/postman.parser.ts
- apps/desktop/src/main/file-dialogs.ts
- apps/web/src/services/desktop.service.ts
- packages/db/src/repositories/backups.repository.ts

Files to create:
- apps/api/src/modules/backups/backups.routes.ts
- apps/api/src/modules/backups/backups.controller.ts
- apps/api/src/modules/backups/backups.service.ts
- apps/api/src/modules/backups/backups.validation.ts
- apps/web/src/services/backup.service.ts

Files to modify:
- apps/api/src/app.ts
- apps/desktop/src/main/file-dialogs.ts
- apps/desktop/src/preload/index.ts
- apps/web/src/components/import/ImportModal.tsx
- apps/web/src/services/desktop.service.ts
- apps/web/src/pages/SettingsPage.tsx

Implementation requirements:
- Implement native open and save dialogs through window.atxDesktop.
- Use native dialogs in desktop mode and current web-compatible file flows in web mode.
- Support Postman JSON import through native open dialog.
- Support ATX collection export through native save dialog.
- Support request export as cURL.
- Implement full backup with manifest.
- Redact secrets in backup by default.
- Validate restore payload before writing.
- Create pre-restore backup before restore.
- Preserve current data if restore fails.

Verification commands:
- npm run type-check
- npm run lint
- npm run test
- npm run build:web
- npm run build:api
- npm run build:desktop

Stop and report exact failures if verification fails.
```

## Prompt P11 - Native Menu, Tray, Notifications, Updates

```text
Implement desktop-native menu, tray, notifications, and updater.

Files to inspect:
- docs/Desktop_App_03_App_Flow_Document.md
- docs/Desktop_App_04_UI_UX_Design_Brief.md
- apps/desktop/src/main/menu.ts
- apps/desktop/src/main/tray.ts
- apps/desktop/src/main/updater.ts
- apps/desktop/src/preload/index.ts
- apps/web/src/hooks/useKeyboardShortcuts.ts
- apps/web/src/app/router.tsx

Files to create or modify:
- apps/desktop/src/main/menu.ts
- apps/desktop/src/main/tray.ts
- apps/desktop/src/main/notifications.ts
- apps/desktop/src/main/updater.ts
- apps/desktop/src/shared/ipc-channels.ts
- apps/desktop/src/shared/ipc-schemas.ts
- apps/desktop/src/preload/index.ts
- apps/web/src/services/desktop.service.ts
- apps/web/src/hooks/useDesktopMenuCommands.ts
- apps/web/src/components/layout/StatusBar.tsx
- apps/web/src/pages/SettingsPage.tsx

Implementation requirements:
- Create native menus: File, Edit, View, Request, Collection, Run, AI, Tools, Help.
- Dispatch menu commands to renderer through typed IPC.
- Implement renderer hook that maps menu commands to existing actions.
- Add tray with Show ATX, New Request, Pause Schedules, Quit.
- Add native notifications for schedule failure, long run complete, update available, backup complete while minimized.
- Add update check and install flow using electron-updater.
- Disable update install in local dev builds unless explicitly enabled.
- Add settings controls for updates and minimize to tray.

Verification commands:
- npm run type-check
- npm run lint
- npm run test
- npm run build:desktop

Stop and report exact failures if verification fails.
```

## Prompt P12 - Proxy, Certificates, and Code Generation

```text
Implement proxy settings, client certificates, and code generation.

Files to inspect:
- apps/api/src/modules/executor/executor.service.ts
- apps/api/src/utils/ssrf-guard.ts
- apps/web/src/components/request-builder/RequestBuilder.tsx
- apps/web/src/components/request-builder/AuthConfig.tsx
- apps/web/src/styles/variables.css
- apps/desktop/src/main/proxy.ts if it exists
- apps/desktop/src/main/certificates.ts if it exists
- packages/db/src/repositories/certificates.repository.ts

Files to create:
- apps/desktop/src/main/proxy.ts
- apps/desktop/src/main/certificates.ts
- apps/api/src/modules/executor/proxy-config.ts
- apps/api/src/modules/executor/certificate-config.ts
- apps/api/src/modules/certificates/certificates.routes.ts
- apps/api/src/modules/certificates/certificates.controller.ts
- apps/api/src/modules/certificates/certificates.service.ts
- apps/api/src/modules/certificates/certificates.validation.ts
- apps/api/src/modules/code-gen/code-gen.routes.ts
- apps/api/src/modules/code-gen/code-gen.controller.ts
- apps/api/src/modules/code-gen/code-gen.service.ts
- apps/api/src/modules/code-gen/code-gen.validation.ts
- apps/web/src/components/request-builder/CodeGenerationModal.tsx
- apps/web/src/components/request-builder/CodeGenerationModal.module.css

Files to modify:
- apps/api/src/app.ts
- apps/api/src/modules/executor/executor.service.ts
- apps/web/src/components/request-builder/RequestBuilder.tsx
- apps/web/src/pages/SettingsPage.tsx
- apps/desktop/src/preload/index.ts

Implementation requirements:
- Add proxy modes: system, manual, none.
- Store proxy settings in Settings.
- Store proxy auth secrets through keychain references.
- Apply proxy config only in executor layer.
- Add certificate import through native file dialog.
- Copy certificate files into app data.
- Store certificate passphrase in keychain.
- Apply certificate per request or collection config.
- Add code generation for cURL, JavaScript fetch, Python requests, and Go net/http.
- Redact secrets in generated code by default.
- Use CSS Modules and variables for the code generation modal.

Verification commands:
- npm run type-check
- npm run lint
- npm run test
- npm run build:web
- npm run build:api
- npm run build:desktop

Stop and report exact failures if verification fails.
```

## Prompt P13 - Desktop Packaging and Smoke Tests

```text
Implement desktop packaging and smoke tests for ATX Desktop.

Files to inspect:
- apps/desktop/electron-builder.yml
- apps/desktop/package.json
- package.json
- tests

Files to create:
- tests/desktop/desktop-smoke.spec.ts
- tests/desktop/helpers/launchDesktop.ts
- .github/workflows/desktop-build.yml if CI workflows are desired for this repo stage

Files to modify:
- apps/desktop/electron-builder.yml
- apps/desktop/package.json
- package.json

Implementation requirements:
- Configure electron-builder targets: Windows NSIS, Windows portable, macOS DMG and ZIP, Linux AppImage and DEB.
- Windows is the first required target.
- Ensure packaged app includes built web renderer and built API code.
- Ensure app data writes to Electron userData path, not install directory.
- Add Playwright Electron smoke test or equivalent Electron launch test.
- Smoke test should launch app, obtain API base URL, call /health, render workbench, create a collection, save a request, restart, and verify persistence.
- Add scripts for desktop smoke tests.
- CI workflow should run type-check, lint, tests, web build, API build, desktop build, and package command where supported.

Verification commands:
- npm run type-check
- npm run lint
- npm run test
- npm run build:web
- npm run build:api
- npm run build:desktop
- npm run package:desktop

Stop and report exact failures if verification fails.
```

## Prompt P14 - Final Documentation and Acceptance Check

```text
Perform the final documentation and acceptance check for ATX Desktop.

Files to inspect:
- docs/Desktop_App_01_Product_Requirements_Document.md
- docs/Desktop_App_02_Technical_Requirements_Document.md
- docs/Desktop_App_03_App_Flow_Document.md
- docs/Desktop_App_04_UI_UX_Design_Brief.md
- docs/Desktop_App_05_Backend_Schema_Document.md
- docs/Desktop_App_06_Implementation_Plan.md
- docs/Desktop_App_07_Master_Prompts.md
- README.md
- AGENTS.md
- package.json

Implementation requirements:
- Cross-check docs against implemented file paths and scripts.
- Update docs only if implementation changed names, paths, commands, or behavior.
- Confirm docs separate web mode from desktop mode.
- Confirm docs mention ATX_RUNTIME_MODE=web|desktop.
- Confirm docs mention window.atxDesktop preload API.
- Confirm docs mention SQLite/Drizzle desktop storage and MongoDB web storage.
- Confirm prompts include verification commands.
- Confirm no doc contains unresolved planning markers such as incomplete task labels or filler text.
- Do not change source code in this prompt unless documentation reveals a clear mismatch that prevents the app from building or running.

Verification commands:
- npm run type-check
- npm run lint
- npm run test
- npm run build:web
- npm run build:api
- npm run build:desktop

Documentation checks:
- Confirm all seven Desktop_App files exist.
- Search docs for unresolved markers.
- Search docs for incorrect old names if implementation changed names.

Stop and report exact failures if verification fails.
```

## Quick Prompt Selection Guide

| Need | Use prompt |
|:--|:--|
| Start desktop app package | P1 |
| Start API from Electron | P2 |
| Make renderer use desktop API URL | P3 |
| Bypass login in desktop mode | P4 |
| Add SQLite schema | P5 |
| Add provider boundary | P6 |
| Migrate collections, requests, envs, history | P7 |
| Migrate runners, schedules, schema, dashboard | P8 |
| Add settings and keychain | P9 |
| Add file dialogs, backup, restore | P10 |
| Add menu, tray, notifications, updater | P11 |
| Add proxy, certificates, code generation | P12 |
| Package and smoke test | P13 |
| Final documentation check | P14 |
