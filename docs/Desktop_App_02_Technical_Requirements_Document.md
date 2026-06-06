# ATX Desktop Application - Technical Requirements Document

Version: 2.0
Date: June 2026
Product: ATX Desktop
Audience: AI coding agents and engineers implementing the desktop app

## 1. Architecture Goal

Build ATX Desktop as an Electron app that reuses the existing React 19 + Vite frontend and Express 5 + TypeScript backend. The first implementation proves web parity in a desktop shell. The final V1 desktop implementation runs local-first with SQLite and Drizzle while preserving web mode with MongoDB Atlas and JWT auth.

The architecture must keep the existing ATX rules:

- TypeScript strict mode in all new files.
- Named exports for new modules and components.
- CSS Modules and CSS variables for styling.
- Zod validation for API request bodies and IPC payloads.
- Backend module pattern: routes to thin controller to thick service.
- Services receive typed params and return typed results. Services do not import Express types.
- API response envelope remains `{ success: boolean, data?: T, error?: { code: string, message: string } }`.

## 2. Process Model

```text
ATX Desktop
|
+-- Electron main process
|   |
|   +-- creates BrowserWindow
|   +-- owns native menu, tray, updater, file dialogs, keychain access
|   +-- starts local Express API on 127.0.0.1 with a dynamic port
|   +-- exposes safe IPC handlers through preload
|
+-- Electron preload process
|   |
|   +-- exposes window.atxDesktop
|   +-- validates renderer-to-main payloads where practical
|   +-- never exposes raw Node or Electron modules
|
+-- Electron renderer process
|   |
|   +-- runs existing React/Vite UI
|   +-- obtains local API URL through window.atxDesktop.getApiBaseUrl()
|   +-- uses Zustand and TanStack Query as the existing app does
|
+-- Local API process
    |
    +-- runs existing Express app
    +-- uses runtime mode to choose MongoDB or SQLite data access
    +-- executes API requests through the existing executor and SSRF guard
```

## 3. Workspace Structure

The implementation must use this repo structure.

```text
apps/
  api/
    src/
      config/
        env.ts
        database.ts
        runtime.ts
      data/
        database-provider.ts
        mongo-provider.ts
        sqlite-provider.ts
      modules/
        ai/
        auth/
        collections/
        collection-runner/
        dashboard/
        environment-matrix/
        environments/
        executor/
        history/
        import/
        requests/
        schedules/
        schema-validator/
        test-runner/
        test-runs/
  desktop/
    src/
      main/
        index.ts
        window.ts
        local-api-server.ts
        menu.ts
        tray.ts
        updater.ts
        file-dialogs.ts
        keychain.ts
        notifications.ts
        proxy.ts
        certificates.ts
      preload/
        index.ts
      shared/
        desktop-api.types.ts
        ipc-channels.ts
        ipc-schemas.ts
    resources/
      icon.ico
      icon.icns
      icon.png
    electron-builder.yml
    package.json
    tsconfig.json
  web/
    src/
      services/
        api.ts
      app/
        App.tsx
        router.tsx
packages/
  db/
    src/
      client.ts
      schema.ts
      migrations.ts
      repositories/
  shared/
  utils/
```

Notes:

- `packages/db` is new and is used by desktop mode for SQLite and Drizzle.
- Web mode may keep Mongoose models while the data provider is introduced.
- New desktop services must not import from `apps/web`.
- Renderer desktop integration should live in a small web-side adapter, not scattered across components.

## 4. Technology Stack

| Layer | Required technology |
|:--|:--|
| Desktop shell | Electron 33 or later |
| Desktop build | electron-builder |
| Auto-update | electron-updater |
| Renderer | Existing React 19 + Vite 6 app |
| UI state | Existing Zustand stores |
| Server state | Existing TanStack Query setup |
| Backend | Existing Express 5 + TypeScript API |
| Web database | Existing MongoDB Atlas + Mongoose 8 |
| Desktop database | SQLite + Drizzle ORM |
| SQLite driver | `better-sqlite3` |
| Secrets | OS keychain through a maintained keychain package |
| Validation | Zod |
| Tests | Vitest, plus Playwright Electron for desktop E2E |

## 5. Runtime Modes

Add a required runtime mode concept.

```ts
export const runtimeModeSchema = z.enum(['web', 'desktop']);
export type RuntimeMode = z.infer<typeof runtimeModeSchema>;
```

Environment variables:

| Variable | Mode | Purpose |
|:--|:--|:--|
| `ATX_RUNTIME_MODE` | both | `web` or `desktop`; defaults to `web` outside Electron |
| `ATX_DESKTOP_USER_DATA_DIR` | desktop | Optional override for app data directory during tests |
| `ATX_SQLITE_PATH` | desktop | Optional explicit SQLite database path |
| `MONGODB_URI` | web | Required only in web mode |
| `FRONTEND_URL` | web | Required for hosted web CORS |
| `GEMINI_API_KEY` | web | Optional provider key fallback |
| `GEMINI_MODEL` | both | Default Gemini model name |

Runtime rules:

- Web mode uses MongoDB and JWT auth.
- Desktop mode uses SQLite and a bootstrapped local user.
- Desktop mode must not require `MONGODB_URI`.
- Desktop mode API binds to `127.0.0.1` only.
- Desktop mode CORS allows the Electron renderer origin and local dev origins.

## 6. Electron Main Process

### 6.1 Window Requirements

- Create one main BrowserWindow.
- Default size: 1440 x 900.
- Minimum size: 1024 x 720.
- Restore last saved bounds when valid.
- Enable `contextIsolation`.
- Disable `nodeIntegration`.
- Disable remote module usage.
- Use preload script at `apps/desktop/src/preload/index.ts`.
- Use `HashRouter` or an equivalent Electron-safe routing approach for packaged builds.
- In development, load Vite dev server.
- In production, load the built renderer from `apps/web/dist`.

### 6.2 Local API Server Requirements

Create `apps/desktop/src/main/local-api-server.ts`.

Required behavior:

- Start the Express app on `127.0.0.1` and port `0`.
- Capture the chosen port.
- Expose the API base URL to renderer as `http://127.0.0.1:{port}`.
- Wait for `/health` to return success before showing the main app as ready.
- Shut down the server during app quit.
- Surface startup failure to the renderer and show a recoverable error screen.

The local API server must not listen on `0.0.0.0`.

### 6.3 Single Instance

- Use `app.requestSingleInstanceLock()`.
- If a second instance starts, focus and restore the existing main window.
- If the second instance is passed a file path, open the import flow in the existing window.

## 7. Preload and IPC Contract

Expose only this API from preload:

```ts
export interface AtxDesktopApi {
  getRuntimeInfo(): Promise<DesktopRuntimeInfo>;
  getApiBaseUrl(): Promise<string>;
  openFile(options: OpenFileOptions): Promise<OpenFileResult>;
  saveFile(options: SaveFileOptions): Promise<SaveFileResult>;
  chooseDirectory(options: ChooseDirectoryOptions): Promise<ChooseDirectoryResult>;
  getSecret(key: SecretKey): Promise<SecretReadResult>;
  setSecret(input: SecretWriteInput): Promise<SecretWriteResult>;
  deleteSecret(key: SecretKey): Promise<SecretDeleteResult>;
  getSystemProxy(): Promise<SystemProxyResult>;
  importCertificate(input: CertificateImportInput): Promise<CertificateImportResult>;
  checkForUpdates(): Promise<UpdateCheckResult>;
  installUpdate(): Promise<UpdateInstallResult>;
  showNotification(input: NotificationInput): Promise<NotificationResult>;
  onUpdateAvailable(callback: (event: UpdateAvailableEvent) => void): Unsubscribe;
  onMenuCommand(callback: (event: MenuCommandEvent) => void): Unsubscribe;
}
```

Global type declaration:

```ts
declare global {
  interface Window {
    atxDesktop?: AtxDesktopApi;
  }
}
```

IPC rules:

- Channel names live in `apps/desktop/src/shared/ipc-channels.ts`.
- Payload schemas live in `apps/desktop/src/shared/ipc-schemas.ts`.
- IPC handlers validate inputs with Zod before performing work.
- IPC responses use the same success or error shape as API responses.
- Renderer event subscriptions must return an unsubscribe function.

Required IPC channels:

| Channel | Direction | Purpose |
|:--|:--|:--|
| `runtime:get-info` | renderer to main | Return app version, mode, platform, user data path |
| `server:get-api-base-url` | renderer to main | Return local API base URL |
| `file:open` | renderer to main | Open JSON, cURL, certificate, or backup file |
| `file:save` | renderer to main | Save exported data |
| `directory:choose` | renderer to main | Choose backup or data directory |
| `secret:get` | renderer to main | Read secret from keychain |
| `secret:set` | renderer to main | Write secret to keychain |
| `secret:delete` | renderer to main | Delete secret from keychain |
| `proxy:get-system` | renderer to main | Read system proxy settings |
| `certificate:import` | renderer to main | Import client certificate |
| `update:check` | renderer to main | Check for updates |
| `update:install` | renderer to main | Install downloaded update |
| `notification:show` | renderer to main | Show native notification |
| `menu:command` | main to renderer | Dispatch native menu action |
| `update:available` | main to renderer | Inform renderer of update availability |

## 8. Renderer Integration

### 8.1 API Client Boot

Modify `apps/web/src/services/api.ts` so the API base URL can be configured before API calls.

Required behavior:

- In web mode, use `import.meta.env.VITE_API_URL` or `http://localhost:8000`.
- In desktop mode, call `window.atxDesktop.getApiBaseUrl()`.
- Defer auth checks and data fetching until API client initialization finishes.
- Export a named function such as `initializeApiClient`.
- Keep Axios interceptors for web mode.
- In desktop mode, do not redirect to `/login` after a 401 unless the user enabled passphrase lock.

### 8.2 Routing

Required behavior:

- Use `BrowserRouter` for web mode.
- Use `HashRouter` for packaged desktop mode, or otherwise ensure deep links work after reload.
- Desktop mode should route first launch to onboarding or settings if required secrets are missing.
- Desktop mode should bypass login/register screens unless passphrase lock is enabled.

### 8.3 Desktop Detection

Create a small renderer adapter, for example `apps/web/src/services/desktop.service.ts`.

Required exports:

- `isDesktopRuntime(): boolean`
- `getDesktopRuntimeInfo(): Promise<DesktopRuntimeInfo | null>`
- `getDesktopApiBaseUrl(): Promise<string | null>`
- File dialog helpers used by import and export flows.

Components should call this adapter instead of directly reading `window.atxDesktop`.

## 9. Backend Data Access

### 9.1 Provider Contract

Introduce a data provider boundary so services can support web and desktop modes without duplicating business logic.

```ts
export interface DatabaseProvider {
  users: UserRepository;
  collections: CollectionRepository;
  requests: RequestRepository;
  environments: EnvironmentRepository;
  history: HistoryRepository;
  testRuns: TestRunRepository;
  schedules: ScheduleRepository;
  schemaContracts: SchemaContractRepository;
  settings: SettingsRepository;
  backups: BackupRepository;
}
```

Rules:

- Service functions call repositories, not Mongoose models directly, after migration.
- Repository params and returns are typed from shared domain types.
- Mongo provider may wrap existing Mongoose models.
- SQLite provider uses Drizzle queries and maps JSON columns to typed structures.
- Desktop migration can proceed module by module, but each module must keep endpoint behavior stable.

### 9.2 Desktop Local User

Desktop mode creates one local user:

- `id`: `local-user`
- `email`: `local@atx.desktop`
- `name`: `Local User`
- `role`: local desktop owner if a role field is introduced.

Auth middleware behavior:

- Web mode: current JWT authentication.
- Desktop mode: attach local user identity to request context and continue.
- Services must still receive a typed `userId`.

## 10. SQLite Storage

### 10.1 Database Location

Default paths:

| OS | Location |
|:--|:--|
| Windows | `%APPDATA%/atx-desktop/atx.db` |
| macOS | `~/Library/Application Support/atx-desktop/atx.db` |
| Linux | `~/.config/atx-desktop/atx.db` |

During tests, `ATX_SQLITE_PATH` may point to a temporary database.

### 10.2 Migration Rules

- Migrations run on startup before the API is marked ready.
- Migrations are versioned and idempotent.
- Failed migration prevents normal app load and shows a recovery screen.
- Database backups should be created before destructive migrations.

### 10.3 JSON Columns

SQLite tables may use JSON text columns for nested data:

- request headers
- request params
- request body metadata
- auth config
- environment variables
- history request and response snapshots
- test run results
- schema contract violations

All JSON columns must be parsed and validated before use.

## 11. Secrets and Keychain

Secrets include:

- Gemini API key.
- Environment variables marked `secret`.
- Bearer tokens saved in auth config.
- Basic auth passwords.
- API key values.
- Client certificate passphrases.

Rules:

- Store secret values in OS keychain where supported.
- Store only secret references in SQLite.
- Redact secrets in exports, logs, AI prompts, and UI previews.
- Provide explicit encrypted export flow if secret export is later added.
- If keychain is unavailable, require user consent before using encrypted local fallback.

## 12. Native Menus

Required menus:

| Menu | Commands |
|:--|:--|
| File | New Request, New Collection, Import, Export, Backup, Restore, Settings, Exit |
| Edit | Undo, Redo, Cut, Copy, Paste, Select All |
| View | Reload, Toggle Developer Tools, Zoom In, Zoom Out, Reset Zoom, Toggle Sidebar, Toggle AI Panel |
| Request | Send, Save, Duplicate, Copy as cURL, Generate Code |
| Collection | Run Collection, New Folder, Import Collection, Export Collection |
| Run | Run Tests, Run Collection, Open Runner, Open History |
| AI | Open AI Chat, Generate Tests, Debug Response, Generate Suite, Analyze Coverage, Generate Docs |
| Tools | Proxy Settings, Certificates, Schema Contracts, Schedules |
| Help | Documentation, Report Issue, About |

Native menu commands should dispatch `menu:command` events to the renderer when they affect UI state.

## 13. Import, Export, Backup, Restore

### 13.1 Import

Supported imports:

- cURL text.
- Postman collection v2.1 JSON.
- ATX collection JSON.
- ATX full backup JSON.

### 13.2 Export

Supported exports:

- Request as cURL.
- Collection as ATX JSON.
- Collection as Postman-compatible JSON where feasible.
- Full local backup.

### 13.3 Restore

Restore must:

- Validate backup schema.
- Show summary before applying.
- Create a pre-restore backup.
- Preserve current data if restore fails.

## 14. Proxy and Certificates

Proxy modes:

- System proxy.
- Manual HTTP or HTTPS proxy.
- No proxy.

Certificate support:

- Import PEM and PFX certificates.
- Store certificate files in app data with restricted permissions.
- Store certificate passphrase in keychain.
- Allow certificate selection per request or collection.
- Apply certificate settings only in the executor layer.

## 15. Build and Packaging

### 15.1 Scripts

Root scripts to add:

```json
{
  "dev:desktop": "npm run dev -w apps/desktop",
  "build:desktop": "npm run build -w apps/desktop",
  "package:desktop": "npm run package -w apps/desktop"
}
```

Desktop package scripts:

```json
{
  "dev": "electron-vite dev",
  "build": "tsc -b && electron-vite build",
  "package": "electron-builder"
}
```

If `electron-vite` is not used, provide equivalent Vite and Electron build commands.

### 15.2 Installer Targets

| Platform | Target |
|:--|:--|
| Windows | NSIS installer and portable build |
| macOS | DMG and ZIP |
| Linux | AppImage and DEB |

### 15.3 Code Signing

- Code signing is optional for local developer builds.
- Release builds should support configured signing certificates.
- Auto-update is enabled only for signed or trusted release channels.

## 16. Testing Requirements

Required verification:

- `npm run type-check`
- `npm run lint`
- `npm run test`
- `npm run build:web`
- `npm run build:api`
- Desktop package type-check and build once `apps/desktop` exists.

Required test coverage:

- Runtime mode parsing.
- Desktop auth bypass and local user bootstrap.
- SQLite repositories.
- IPC schema validation.
- API client initialization in web and desktop modes.
- File import and export helpers.
- Backup validation and restore failure recovery.
- Keychain adapter with mocked keychain.
- Electron smoke test: launch app, get API URL, hit `/health`, render dashboard or request builder.

## 17. Acceptance Criteria

The desktop implementation is accepted when:

- The app launches as a desktop window.
- Renderer obtains API base URL through `window.atxDesktop`.
- Existing request builder and response viewer workflows work in desktop mode.
- Desktop mode runs without MongoDB.
- Local data persists in SQLite after restart.
- AI features use the configured Gemini key and validate structured responses.
- Import, export, backup, and restore use native file dialogs.
- Settings can update theme, AI key, proxy, certificates, data retention, and updater preferences.
- Type-check, lint, and relevant tests pass or documented pre-existing failures are reported without masking new failures.
