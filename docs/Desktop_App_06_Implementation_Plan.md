# ATX Desktop Application — Implementation Plan

> **Version:** 1.0  
> **Date:** June 2026

---

## 1. Implementation Strategy

### 1.1 Guiding Principle

**Wrap first, migrate later.** The existing web app is fully functional. The fastest path to a desktop app is:

1. **Phase 1:** Wrap the existing web app in Electron (keep MongoDB for now)
2. **Phase 2:** Add desktop-native features (menus, file dialogs, tray)
3. **Phase 3:** Migrate from MongoDB to SQLite for true local-first experience
4. **Phase 4:** Add advanced desktop features (proxy, certs, code gen)

### 1.2 Prerequisites

- Node.js 22+ installed
- Existing web app (`apps/web`) builds successfully
- Existing API server (`apps/api`) builds successfully
- Git repository clean

---

## 2. Phase 1: Electron Shell (Estimated: 5-7 days)

### 2.1 Milestone: App launches as desktop window with full functionality

**Step 1.1: Create Electron app package**

```
apps/desktop/
├── src/main/index.ts
├── src/preload/index.ts
├── src/shared/ipc-channels.ts
├── resources/icon.png
├── package.json
├── tsconfig.json
└── electron-builder.yml
```

Files to create:

| File | Purpose |
|:-----|:--------|
| `apps/desktop/package.json` | Electron deps: `electron`, `electron-builder`, `electron-updater` |
| `apps/desktop/tsconfig.json` | TypeScript config targeting Node.js (main process) |
| `apps/desktop/src/main/index.ts` | Create BrowserWindow, start local server, load React app |
| `apps/desktop/src/preload/index.ts` | Context bridge for IPC communication |
| `apps/desktop/src/shared/ipc-channels.ts` | Type-safe IPC channel name constants |
| `apps/desktop/electron-builder.yml` | Build config: app ID, platforms, auto-update |

**Step 1.2: Configure Vite for Electron**

Files to modify:

| File | Change |
|:-----|:-------|
| `apps/web/vite.config.ts` | Add `base: './'` for Electron file:// protocol |
| `apps/web/src/app/router.tsx` | Use `HashRouter` instead of `BrowserRouter` when in Electron |
| `apps/web/src/services/api.ts` | Dynamic base URL: use IPC to get server port |

**Step 1.3: Bundle Express server in Electron**

| File | Purpose |
|:-----|:--------|
| `apps/desktop/src/main/server.ts` | Fork Express server as child process, find random open port |

Logic:
1. Main process starts Express server on port 0 (OS picks available port)
2. Express emits `ready` event with actual port number
3. Main process stores port, passes to renderer via IPC
4. Renderer sets `apiClient.defaults.baseURL = http://localhost:${port}`

**Step 1.4: Window chrome & basic lifecycle**

| Feature | Implementation |
|:--------|:--------------|
| Custom title bar | `BrowserWindow({ frame: false, titleBarStyle: 'hidden' })` on macOS; custom HTML title bar on Windows/Linux |
| Single instance | `app.requestSingleInstanceLock()` |
| Window state persistence | Save bounds to `electron-store`, restore on launch |
| Graceful shutdown | `app.on('before-quit')` → stop server → close DB |

---

## 3. Phase 2: Desktop-Native Features (Estimated: 4-5 days)

### 3.1 Native Menu Bar

| File | Purpose |
|:-----|:--------|
| `apps/desktop/src/main/menu.ts` | Build native menu using `Menu.buildFromTemplate()` |

Menu structure matches the UI/UX Design Brief — File, Edit, View, Collection, Run, AI, Help menus with all accelerators.

### 3.2 System Tray

| File | Purpose |
|:-----|:--------|
| `apps/desktop/src/main/tray.ts` | Create tray icon, right-click context menu, status indicators |

### 3.3 File Dialogs

| File | Purpose |
|:-----|:--------|
| `apps/desktop/src/main/file-dialogs.ts` | IPC handlers for `dialog.showOpenDialog()` and `dialog.showSaveDialog()` |

Frontend integration:
- Import modal: calls `electronAPI.openFile({ filters: [{ name: 'JSON', extensions: ['json'] }] })`
- Export: calls `electronAPI.saveFile({ defaultPath: 'collection.json', data: jsonString })`

### 3.4 Auto-Updater

| File | Purpose |
|:-----|:--------|
| `apps/desktop/src/main/auto-updater.ts` | Check GitHub Releases, download updates, notify renderer |

Flow: `app.on('ready')` → `autoUpdater.checkForUpdates()` → on update available → IPC to renderer → user confirms → `autoUpdater.quitAndInstall()`

### 3.5 Native Notifications

| Integration | Trigger |
|:------------|:--------|
| Schedule run failure | `new Notification({ title: 'ATX', body: 'Collection X: 3 tests failed' })` |
| Update available | `new Notification({ title: 'Update Available', body: 'v1.1.0 ready to install' })` |

---

## 4. Phase 3: Local-First Migration (Estimated: 7-10 days)

### 4.1 Database Migration (MongoDB → SQLite)

**Step 4.1.1: Create Drizzle schema package**

| File | Purpose |
|:-----|:--------|
| `packages/db/package.json` | `better-sqlite3`, `drizzle-orm`, `drizzle-kit` |
| `packages/db/schema.ts` | All table definitions (from Backend Schema Document) |
| `packages/db/index.ts` | Create database connection, run migrations |
| `packages/db/migrations/` | Auto-generated migration files |

**Step 4.1.2: Create data access layer**

Replace each Mongoose model usage with Drizzle queries. Strategy:

```
For each service file (e.g., collection.service.ts):
  1. Replace: import { Collection } from '../../models/Collection.model'
     With:    import { db, collections } from '@atx/db'
  
  2. Replace: Collection.find({ userId })
     With:    db.select().from(collections).where(eq(collections.userId, userId))
  
  3. Replace: Collection.findOne({ _id: id })
     With:    db.select().from(collections).where(eq(collections.id, id)).get()
  
  4. Replace: new Collection({ ... }).save()
     With:    db.insert(collections).values({ id: uuid(), ... })
  
  5. Replace: Collection.updateOne({ _id: id }, { $set: { ... } })
     With:    db.update(collections).set({ ... }).where(eq(collections.id, id))
  
  6. Replace: Collection.deleteOne({ _id: id })
     With:    db.delete(collections).where(eq(collections.id, id))
```

**Step 4.1.3: Migration order** (by dependency)

1. `users` (no deps)
2. `collections` (depends on users)
3. `requests` (depends on collections)
4. `environments` (depends on users)
5. `history` (depends on users)
6. `test_runs` (depends on users, collections)
7. `schedules` (depends on users, collections)
8. `schema_contracts` (depends on users)
9. `settings` (no deps, desktop-only)

### 4.2 Auth Simplification

For desktop mode:
- Remove JWT auth flow
- Create default "local" user on first launch
- All requests authenticated as local user
- Keep auth middleware but make it a no-op in desktop mode
- Optional: passphrase lock for sensitive workspaces

### 4.3 Data Import/Export

| Feature | Implementation |
|:--------|:--------------|
| Export all data | Dump all SQLite tables to JSON file via file dialog |
| Import data | Parse JSON → insert into SQLite tables |
| Backup | Copy `data.db` file to user-chosen location |

---

## 5. Phase 4: Advanced Desktop Features (Estimated: 5-7 days)

### 5.1 Settings Panel

| File | Purpose |
|:-----|:--------|
| `apps/web/src/pages/SettingsPage.tsx` | Full-page settings with tabbed navigation |
| `apps/web/src/pages/SettingsPage.module.css` | Settings page styling |

Settings sections: General, AI, Proxy, Certificates, Data, About

### 5.2 Proxy Configuration

| File | Purpose |
|:-----|:--------|
| `apps/api/src/modules/executor/proxy-config.ts` | Read proxy settings, apply to request execution |
| `apps/desktop/src/main/proxy.ts` | Read system proxy settings via Electron API |

### 5.3 Certificate Management

| File | Purpose |
|:-----|:--------|
| `apps/desktop/src/main/cert-manager.ts` | Import .pem/.pfx files, store in app data directory |
| `apps/api/src/modules/executor/cert-config.ts` | Apply certs to HTTPS agent per request |

### 5.4 Code Generation

| File | Purpose |
|:-----|:--------|
| `apps/api/src/modules/code-gen/code-gen.service.ts` | Generate cURL, Python, JavaScript, Go from request config |
| `apps/web/src/components/request-builder/CodeGenModal.tsx` | Modal with language selector and copy button |

---

## 6. Testing Strategy

### 6.1 Unit Tests

| Layer | Tool | Coverage Target |
|:------|:-----|:---------------|
| Backend services | Vitest | 80%+ |
| Zustand stores | Vitest | 70%+ |
| Utility functions | Vitest | 90%+ |

### 6.2 Integration Tests

| Test | Tool |
|:-----|:-----|
| API endpoint tests | Vitest + supertest |
| Database operations | Vitest + SQLite in-memory |

### 6.3 E2E Tests

| Test | Tool |
|:-----|:-----|
| Desktop app flows | Playwright + Electron |
| Key workflows | Request → Response → Test → Save |

### 6.4 Manual Testing Checklist

- [ ] App starts on Windows, macOS, Linux
- [ ] Request builder sends and displays response
- [ ] Collections CRUD works
- [ ] AI features generate tests/docs
- [ ] Collection runner executes with SSE
- [ ] Dashboard loads with widgets
- [ ] Settings persist across restarts
- [ ] Auto-update downloads and installs
- [ ] System tray works
- [ ] File import/export works

---

## 7. Risk Assessment

| Risk | Impact | Mitigation |
|:-----|:-------|:-----------|
| SQLite migration breaks queries | High | Migrate one service at a time, keep MongoDB as fallback flag |
| Electron app size too large | Medium | Tree-shake deps, use `electron-builder` asar packaging |
| AI features without internet | Medium | Show clear offline indicators, queue requests |
| Cross-platform native menu differences | Low | Test on all 3 platforms, use conditional logic |
| `better-sqlite3` native module rebuild issues | Medium | Use `electron-rebuild`, pin Node version |
| Auto-updater code signing costs | Low | Optional for non-Mac platforms |

---

## 8. Timeline Summary

| Phase | Duration | Deliverable |
|:------|:---------|:------------|
| **Phase 1**: Electron Shell | 5-7 days | Working desktop app (Electron + existing web) |
| **Phase 2**: Native Features | 4-5 days | Menus, tray, file dialogs, auto-update |
| **Phase 3**: Local-First | 7-10 days | SQLite storage, simplified auth, offline |
| **Phase 4**: Advanced | 5-7 days | Proxy, certs, code gen, settings panel |
| **Testing & Polish** | 3-4 days | E2E tests, bug fixes, performance tuning |
| **Total** | **24-33 days** | **Production-ready desktop app** |

---

## 9. File Change Summary

### New Files

| Path | Phase |
|:-----|:------|
| `apps/desktop/` (entire package) | P1 |
| `packages/db/` (Drizzle schemas) | P3 |
| `apps/web/src/pages/SettingsPage.tsx` | P4 |
| `apps/web/src/pages/SettingsPage.module.css` | P4 |
| `apps/api/src/modules/code-gen/*` | P4 |

### Modified Files

| Path | Change | Phase |
|:-----|:-------|:------|
| `apps/web/vite.config.ts` | Add `base: './'` | P1 |
| `apps/web/src/app/router.tsx` | HashRouter for Electron | P1 |
| `apps/web/src/services/api.ts` | Dynamic base URL | P1 |
| `apps/api/src/config/database.ts` | SQLite connection | P3 |
| `apps/api/src/config/env.ts` | DESKTOP_MODE flag | P3 |
| All `apps/api/src/modules/*/service.ts` | Mongoose → Drizzle | P3 |
| All `apps/api/src/models/*.ts` | Deprecated (replaced by db package) | P3 |
| `apps/api/src/middleware/authenticate.ts` | No-op in desktop mode | P3 |
| `package.json` (root) | Add desktop workspace | P1 |
