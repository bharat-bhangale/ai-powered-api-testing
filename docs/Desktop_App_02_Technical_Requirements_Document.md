# ATX Desktop Application — Technical Requirements Document (TRD)

> **Version:** 1.0  
> **Date:** June 2026

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Electron Shell                     │
│  ┌──────────────────┐  ┌──────────────────────────┐ │
│  │   Main Process   │  │     Renderer Process     │ │
│  │                  │  │                          │ │
│  │  - Window Mgmt   │  │  ┌────────────────────┐  │ │
│  │  - IPC Handlers  │  │  │   React Frontend   │  │ │
│  │  - Native Menus  │  │  │   (Existing Web)   │  │ │
│  │  - Auto-Updater  │  │  │                    │  │ │
│  │  - System Tray   │  │  │  - Request Builder │  │ │
│  │  - File Dialogs  │  │  │  - Response Viewer │  │ │
│  │  - Cert Manager  │  │  │  - Sidebar/Router  │  │ │
│  │                  │  │  │  - AI Chat Panel   │  │ │
│  │  ┌────────────┐  │  │  │  - Dashboard       │  │ │
│  │  │ Local API  │  │  │  │  - Test Runner     │  │ │
│  │  │  Server    │  │  │  └────────────────────┘  │ │
│  │  │ (Express)  │  │  │                          │ │
│  │  │  Port:0    │  │  │  Communicates via HTTP   │ │
│  │  └────────────┘  │  │  to localhost:{port}     │ │
│  └──────────────────┘  └──────────────────────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────────┐ │
│  │              Data Layer (Local)                  │ │
│  │  SQLite (collections, requests, environments)    │ │
│  │  Flat Files (history, test runs, preferences)    │ │
│  │  OS Keychain (API keys, tokens, certificates)    │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 1.2 Process Model

| Process | Role | Technology |
|:--------|:-----|:-----------|
| **Main Process** | Window management, IPC, native APIs, file system, auto-updates | Electron Main (Node.js) |
| **Renderer Process** | UI rendering, user interaction | Electron Renderer (Chromium + React) |
| **Local API Server** | Business logic, AI gateway, data access | Express.js (spawned by Main) |

### 1.3 Data Flow

```
User Action → React Component → Zustand Store → HTTP Request
     → Local Express Server → Service Layer → SQLite/AI Gateway
     → Response → Store Update → React Re-render
```

---

## 2. Technology Stack

### 2.1 Desktop Shell

| Layer | Technology | Version | Justification |
|:------|:-----------|:--------|:-------------|
| Desktop Framework | Electron | 33+ | Mature, cross-platform, full Node.js access |
| Build Tool | electron-builder | 25+ | Code signing, auto-update, multi-platform |
| Auto-Update | electron-updater | 6+ | GitHub Releases integration |
| IPC | Electron IPC | Built-in | Secure main↔renderer communication |

### 2.2 Frontend (Existing — Migrated)

| Layer | Technology | Version | Notes |
|:------|:-----------|:--------|:------|
| UI Framework | React | 19+ | Existing codebase |
| Build Tool | Vite | 6+ | Fast HMR, Electron plugin available |
| State Management | Zustand | 5+ | 8 existing stores |
| Routing | React Router | 7+ | Client-side, hash router for Electron |
| Styling | CSS Modules | — | No Tailwind, existing design system |
| HTTP Client | Axios | 1.7+ | With interceptors for auth refresh |
| Icons | Lucide React | Latest | Existing icon set |
| Toasts | Sonner | Latest | Existing notification system |
| Code Editor | Monaco Editor | Latest | Test script editing |
| Data Fetching | TanStack Query | 5+ | Caching, background refresh |

### 2.3 Backend (Existing — Bundled Locally)

| Layer | Technology | Version | Notes |
|:------|:-----------|:--------|:------|
| Runtime | Node.js | 22+ | LTS, bundled with Electron |
| Framework | Express | 5+ | Existing API server |
| Database | SQLite (better-sqlite3) | Latest | Replaces MongoDB for local-first |
| ORM/Query | Drizzle ORM | Latest | Type-safe, lightweight, SQLite support |
| AI Gateway | Google Gemini SDK | Latest | User-provided API key |
| Validation | Zod | 3+ | All AI outputs validated |
| Auth | Simplified | — | No JWT needed — local app, optional passphrase |
| Proxy | node-fetch / undici | Latest | With proxy-agent for system proxy |

### 2.4 Tooling

| Tool | Purpose |
|:-----|:--------|
| TypeScript | Strict mode across all packages |
| ESLint + Prettier | Code quality |
| Vitest | Unit/integration tests |
| Playwright | E2E testing for Electron |
| GitHub Actions | CI/CD for multi-platform builds |
| electron-builder | Installers: .exe, .dmg, .AppImage, .deb |

---

## 3. Project Structure

```
ai-powered-api-testing/
├── apps/
│   ├── desktop/                    # NEW — Electron shell
│   │   ├── src/
│   │   │   ├── main/               # Electron main process
│   │   │   │   ├── index.ts        # Entry point — creates window
│   │   │   │   ├── ipc-handlers.ts # IPC message handlers
│   │   │   │   ├── menu.ts         # Native menu bar
│   │   │   │   ├── tray.ts         # System tray icon
│   │   │   │   ├── auto-updater.ts # Electron auto-update logic
│   │   │   │   ├── server.ts       # Spawns local Express server
│   │   │   │   ├── file-dialogs.ts # Native open/save file dialogs
│   │   │   │   └── cert-manager.ts # Client certificate handling
│   │   │   ├── preload/
│   │   │   │   └── index.ts        # Preload script (context bridge)
│   │   │   └── shared/
│   │   │       └── ipc-channels.ts # Type-safe IPC channel names
│   │   ├── resources/              # App icons, installer assets
│   │   │   ├── icon.ico
│   │   │   ├── icon.icns
│   │   │   └── icon.png
│   │   ├── electron-builder.yml    # Build/packaging config
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api/                        # EXISTING — Express backend
│   │   └── src/
│   │       ├── config/
│   │       │   ├── env.ts          # MODIFY — support SQLite mode
│   │       │   └── database.ts     # MODIFY — SQLite connection
│   │       ├── models/             # MODIFY — Drizzle schemas
│   │       └── modules/            # EXISTING — 15 modules
│   │
│   └── web/                        # EXISTING — React frontend
│       └── src/
│           ├── app/
│           │   └── router.tsx      # MODIFY — HashRouter for Electron
│           ├── components/         # EXISTING — 12 component dirs
│           ├── stores/             # EXISTING — 8 Zustand stores
│           └── services/
│               └── api.ts          # MODIFY — dynamic base URL
│
├── packages/
│   ├── shared/                     # Shared types between apps
│   └── db/                         # NEW — Drizzle schema + migrations
│       ├── schema.ts
│       ├── migrations/
│       └── index.ts
│
├── docs/                           # Documentation (this file)
├── tests/                          # E2E tests
└── tooling/                        # ESLint, tsconfig presets
```

---

## 4. Data Storage Strategy

### 4.1 Database: SQLite (replacing MongoDB)

**Why SQLite:**
- Zero-config, single file, no separate server
- Perfect for desktop apps (used by VS Code, Figma, 1Password)
- `better-sqlite3` is synchronous and fast (no async overhead)
- File can be backed up by simply copying

**Database file location:**
```
Windows: %APPDATA%/atx-desktop/data.db
macOS:   ~/Library/Application Support/atx-desktop/data.db
Linux:   ~/.config/atx-desktop/data.db
```

### 4.2 Schema Migration from MongoDB to SQLite

| MongoDB Model | SQLite Table | Key Changes |
|:-------------|:-------------|:------------|
| `User` | `users` | Optional — single-user mode by default |
| `Collection` | `collections` | `_id` → `id TEXT (UUID)`, drop `userId` for single-user |
| `SavedRequest` | `requests` | `_id` → `id TEXT (UUID)`, JSON columns for headers/params/body |
| `Environment` | `environments` | JSON column for `variables` array |
| `History` | `history` | JSON columns for request/response blobs |
| `TestRun` | `test_runs` | JSON column for `results` array |
| `SchemaContract` | `schema_contracts` | JSON column for inferred schema |
| `Schedule` | `schedules` | Keep cron expression as text |

### 4.3 Sensitive Data

| Data | Storage | Encryption |
|:-----|:--------|:-----------|
| Gemini API Key | OS Keychain (keytar) | OS-managed |
| Auth tokens (if cloud sync) | OS Keychain | OS-managed |
| Client certificates | App data directory | File-system permissions |
| Preferences | SQLite `settings` table | None (non-sensitive) |

---

## 5. Electron-Specific Implementation

### 5.1 Main Process Responsibilities

```typescript
// main/index.ts — Electron entry point
- Create BrowserWindow with custom titlebar
- Start local Express server on random port
- Pass server port to renderer via IPC
- Set up native menu bar with accelerators
- Handle file dialog IPC calls
- Set up system tray (minimize to tray)
- Initialize auto-updater
- Handle app lifecycle (single instance lock)
```

### 5.2 IPC Channels

| Channel | Direction | Purpose |
|:--------|:----------|:--------|
| `server:port` | Main → Renderer | Pass local server port |
| `file:open` | Renderer → Main | Open file dialog |
| `file:save` | Renderer → Main | Save file dialog |
| `cert:import` | Renderer → Main | Import client certificate |
| `proxy:get-system` | Renderer → Main | Get OS proxy settings |
| `app:check-update` | Renderer → Main | Trigger update check |
| `app:install-update` | Renderer → Main | Install downloaded update |
| `notification:send` | Main → Renderer | OS notification from schedule worker |
| `window:minimize-to-tray` | Renderer → Main | Minimize to system tray |

### 5.3 Security (Context Isolation)

```typescript
// preload/index.ts
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile: (opts) => ipcRenderer.invoke('file:open', opts),
  saveFile: (opts) => ipcRenderer.invoke('file:save', opts),
  
  // Server
  getServerPort: () => ipcRenderer.invoke('server:port'),
  
  // App
  getVersion: () => ipcRenderer.invoke('app:version'),
  checkForUpdates: () => ipcRenderer.invoke('app:check-update'),
  
  // Events
  onUpdateAvailable: (cb) => ipcRenderer.on('update:available', cb),
  onNotification: (cb) => ipcRenderer.on('notification:send', cb),
});
```

---

## 6. Build & Distribution

### 6.1 Platform Builds

| Platform | Format | Code Signing |
|:---------|:-------|:-------------|
| Windows | `.exe` (NSIS installer) + portable `.zip` | Optional (EV cert) |
| macOS | `.dmg` + `.zip` | Required (Apple notarization) |
| Linux | `.AppImage` + `.deb` + `.rpm` | Not required |

### 6.2 Auto-Update Flow

```
App Start → Check GitHub Releases API → Compare Versions
  → If new version: Download in background → Notify user
  → User clicks "Restart to Update" → Install & restart
```

### 6.3 CI/CD Pipeline

```yaml
# .github/workflows/build.yml
trigger: push to main, tag v*
jobs:
  - build-windows (windows-latest)
  - build-macos (macos-latest)
  - build-linux (ubuntu-latest)
  
  Steps per platform:
  1. Checkout + install deps
  2. Build web app (Vite)
  3. Build API server (tsc)
  4. Package with electron-builder
  5. Upload artifacts to GitHub Release
```

---

## 7. Performance Requirements

| Metric | Target | Measurement |
|:-------|:-------|:------------|
| Cold start | < 3s | Time from double-click to usable UI |
| Request execution overhead | < 100ms | ATX overhead on top of network time |
| UI interaction latency | < 16ms (60fps) | No frame drops during typing/scrolling |
| Memory (idle) | < 300MB | After app start with no requests open |
| Memory (loaded) | < 800MB | With 50 tabs open, dashboard loaded |
| SQLite query | < 10ms | Any single table query |
| Bundle size | < 150MB | Packaged installer |
| AI response start | < 2s | Time to first token from Gemini |

---

## 8. Migration Strategy (Web → Desktop)

### 8.1 Changes Required

| File/Area | Change | Impact |
|:----------|:-------|:-------|
| `apps/web/src/services/api.ts` | Dynamic base URL from `electronAPI.getServerPort()` | Low |
| `apps/web/src/app/router.tsx` | `BrowserRouter` → `HashRouter` (Electron file:// protocol) | Low |
| `apps/api/src/config/database.ts` | MongoDB → SQLite connection | Medium |
| `apps/api/src/models/*` | Mongoose schemas → Drizzle schemas | High |
| `apps/api/src/modules/*/service.ts` | Mongoose queries → Drizzle queries | High |
| `apps/api/src/modules/auth/*` | JWT auth → optional passphrase or removed | Low |
| `apps/api/src/config/env.ts` | Add `DESKTOP_MODE` flag, SQLite path | Low |

### 8.2 Shared Code Strategy

- Frontend React code: **100% reusable** (no changes to components)
- Backend services: **80% reusable** (swap database layer only)
- Types/interfaces: **100% reusable** (move to `packages/shared`)

---

## 9. Third-Party Dependencies (Desktop-Specific)

| Package | Purpose | License |
|:--------|:--------|:--------|
| `electron` | Desktop shell | MIT |
| `electron-builder` | Build/packaging | MIT |
| `electron-updater` | Auto-updates | MIT |
| `better-sqlite3` | SQLite driver | MIT |
| `drizzle-orm` | Type-safe ORM | Apache-2.0 |
| `keytar` | OS keychain access | MIT |
| `electron-store` | Simple key-value preferences | MIT |
| `electron-log` | File-based logging | MIT |
