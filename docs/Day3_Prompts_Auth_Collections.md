# Day 3 Prompts: Authentication & Collections

## Copy-Paste Ready Prompts for Claude Opus 4.6 in Antigravity

**Day:** 3 of 7 | **Features:** 4 (JWT Auth, Collections CRUD, Sidebar Tree, Save/Load)  
**Prerequisites:** Day 1-2 features working (request builder, executor, response viewer)

---

## Quick Reference

| # | Feature | Prompt Type | Est. Time |
|:--|:--------|:------------|:----------|
| P11 | Backend Auth System | 🏗️ Backend | 25 min |
| P12 | Frontend Auth (Login/Register) | 🎨 Frontend | 25 min |
| P13 | Backend Collections CRUD | 🏗️ Backend | 20 min |
| P14 | Frontend Sidebar Tree | 🎨 Frontend | 30 min |
| P15 | Save/Load Requests | 🔌 Integration | 20 min |
| P16 | Auth + Collections Tests | 🧪 Testing | 15 min |

---

## ORCHESTRATOR PROMPT (Day 3 — Paste This First)

```
Build authentication and collections for our API testing tool (Day 3).

Today's goal: Users can register, login, create collections with folders, save requests to collections, and load saved requests from the sidebar.

Execute in order:
1. Backend Auth: User model (bcrypt), register/login/refresh/logout/me endpoints, JWT tokens, authenticate middleware
2. Frontend Auth: authStore (Zustand), login/register pages, Axios interceptor (auto-attach token, auto-refresh on 401), protected routes
3. Backend Collections: Collection model (with folders), SavedRequest model, full CRUD endpoints for both
4. Frontend Sidebar: collectionStore, CollectionTree component (recursive expand/collapse, method badges), create collection modal
5. Save/Load: Save button → modal (select collection, name request) → persist; Click sidebar request → load into tab

The executor from Day 2 should now require authentication. Update it to use the authenticate middleware and save executions to history (prepare the hook but history module is Day 5).

Use Skills files for all architecture patterns.
```

---

## Individual Feature Prompts

### P11: Backend Auth System

```
[BE] Build authentication at apps/api/src/modules/auth/ and apps/api/src/models/.

1. User.model.ts:
   - Fields: email (unique, lowercase), name, passwordHash, avatar?, preferences.theme, preferences.editorFontSize
   - Pre-save hook: bcrypt hash (12 rounds) if passwordHash modified
   - Method: comparePassword(password): Promise<boolean>
   - toJSON: remove passwordHash and __v
   - timestamps: true

2. auth.service.ts:
   - register(email, name, password): check existing, validate pw length≥8, create user, generateTokens
   - login(email, password): find user, comparePassword, generateTokens
   - refreshTokens(refreshToken): verify JWT, find user, generateTokens
   - getMe(userId): findById
   - generateTokens(userId): access (15min, ACCESS_TOKEN_SECRET), refresh (7day, REFRESH_TOKEN_SECRET)

3. auth.controller.ts:
   - register: 201, set refreshToken cookie (httpOnly, secure, sameSite strict, 7d maxAge)
   - login: 200, same cookie
   - refresh: read cookie, issue new pair, rotate cookie
   - logout: clear cookie
   - getMe: return user (requires authenticate middleware)

4. middleware/authenticate.ts:
   - Read Authorization: Bearer <token>
   - Verify with ACCESS_TOKEN_SECRET
   - Set req.userId = decoded.userId
   - 401 if missing/invalid/expired

5. auth.routes.ts: POST register, login, refresh, logout + GET me
6. Register: app.use('/api/auth', authRoutes)
```

### P12: Frontend Auth (Login/Register)

```
[FE] Build frontend authentication.

1. stores/authStore.ts (Zustand):
   - State: user, accessToken, isAuthenticated, isLoading
   - Actions: login(email, pw), register(email, name, pw), logout(), refreshToken(), checkAuth()
   - checkAuth: call refreshToken → getMe → set user+isAuthenticated

2. services/api.ts — update with interceptors:
   - Request interceptor: attach Authorization: Bearer {accessToken} if present
   - Response interceptor: on 401 (not retry), call refreshToken → retry original request
   - On refresh failure: call logout, redirect to /login

3. pages/LoginPage.tsx + .module.css:
   - Centered card: email input, password input, "Sign In" button, "Create account" link
   - Loading state on button, error message display
   - On success: navigate to "/"

4. pages/RegisterPage.tsx + .module.css:
   - Same layout + name input
   - Password min length validation (client-side)

5. App.tsx routing:
   - /login → LoginPage (public)
   - /register → RegisterPage (public)
   - / → MainApp (protected — redirect to /login if not authenticated)
   - Show loading spinner during checkAuth()

Premium design: glassmorphism card, gradient background, smooth transitions.
```

### P13: Backend Collections CRUD

```
[BE] Build collections and saved requests at apps/api/src/modules/.

1. models/Collection.model.ts:
   - Fields: name, description, userId (ref User), folders[{name, parentFolderId, sortOrder}], auth, sortOrder
   - Index: {userId: 1, sortOrder: 1}

2. models/Request.model.ts (SavedRequest):
   - Fields: name, collectionId (ref Collection), folderId, userId, method, url, headers[], params[], body, auth, sortOrder
   - Indexes: {collectionId: 1, sortOrder: 1}, {userId: 1}

3. modules/collections/collection.service.ts:
   - create(userId, name, description?)
   - list(userId): find all, populate request count per collection
   - getById(userId, id): include all requests
   - update(userId, id, updates)
   - delete(userId, id): cascade delete all SavedRequests in collection
   - addFolder(userId, collectionId, folderName)
   - deleteFolder(userId, collectionId, folderId): move contained requests to root

4. modules/requests/request.service.ts:
   - create(userId, data): save request to collection
   - getById(userId, id)
   - update(userId, id, data)
   - delete(userId, id)
   - duplicate(userId, id): clone with " (copy)" suffix

5. Routes (all protected with authenticate):
   - POST/GET/PATCH/DELETE /api/collections
   - POST /api/collections/:id/folders, DELETE /api/collections/:id/folders/:fid
   - POST/GET/PATCH/DELETE /api/requests
   - POST /api/requests/:id/duplicate

6. Zod validation schemas for create/update bodies
```

### P14: Frontend Sidebar Collection Tree

```
[FE] Build the sidebar with collection tree at apps/web/src/components/sidebar/.

1. stores/collectionStore.ts (Zustand):
   - State: collections[], expandedIds: Set<string>, isLoading
   - Actions: fetchCollections, createCollection(name), toggleExpanded(id), deleteCollection(id)

2. Sidebar.tsx + .module.css:
   - Fixed left panel, width var(--sidebar-width)
   - Header: "Collections" title + "+" create button
   - Scrollable tree area
   - Footer: user avatar + name + settings icon

3. CollectionTree.tsx:
   - Recursive rendering: Collection → Folder → Request
   - Click collection/folder: toggle expand/collapse with chevron animation
   - Click request: load into active tab (or new tab if already open)
   - Each request item shows: method badge (colored, monospace) + request name
   - Active request: highlighted with primary-subtle background

4. CreateCollectionModal.tsx:
   - Modal with name input + optional description
   - "Create" button → POST /api/collections → refresh tree

5. Context menu (right-click):
   - Collection: Rename, Add Folder, Delete
   - Folder: Rename, Delete
   - Request: Duplicate, Move to..., Delete

Visual: 16px indent per nesting level. FolderOpen/FolderClosed icons from Lucide.
Animations: slideInLeft for sidebar, fadeIn for tree items.
```

### P15: Save/Load Requests

```
[INT] Implement save and load request functionality.

1. Save flow:
   - "Save" button (Ctrl+S) in request builder toolbar
   - If request is NEW (no savedRequestId): open SaveModal
     - SaveModal: select collection dropdown, optional folder dropdown, request name input
     - Submit → POST /api/requests → mark tab as saved (isDirty=false, set savedRequestId)
   - If request is ALREADY SAVED: PATCH /api/requests/:id with current state
   - Show toast: "Request saved" / "Request updated"

2. Load flow:
   - Click request in sidebar CollectionTree
   - If already open in a tab: switch to that tab
   - Otherwise: create new tab, populate with saved request data (method, url, headers, params, body, auth)
   - Set tab name to saved request name

3. Dirty indicator:
   - Modified saved request: show dot (•) after tab name
   - Tab name shows saved name when loaded

4. Update requestStore:
   - Add: savedRequestId?, savedCollectionId? to RequestTab
   - Add: loadRequest(savedRequest) action
```

### P16: Auth + Collections Tests

```
[TEST] Write tests for auth and collections modules.

1. apps/api/src/modules/auth/__tests__/auth.service.test.ts:
   - Register: creates user, returns tokens, rejects duplicate email
   - Login: valid credentials return tokens, invalid credentials throw
   - Token refresh: valid refresh returns new pair, expired token throws

2. apps/api/src/modules/collections/__tests__/collection.service.test.ts:
   - CRUD: create, list, update, delete (cascade)
   - Folder operations: add, delete (with request reassignment)
   - Authorization: user A can't access user B's collections

Use Vitest. Mock Mongoose models with vi.mock(). Test service layer only (not controllers).
```

---

## Sub-Agent Delegation Map (Day 3)

```
ORCHESTRATOR
├── Backend Sub-Agent:  P11 (auth) → P13 (collections CRUD)
├── Frontend Sub-Agent: P12 (auth pages) → P14 (sidebar tree)
├── Integration Sub-Agent: P15 (save/load wiring)
└── Testing Sub-Agent: P16 (unit tests)
```

---

*End of Day 3 Prompts. Refer to Day3_Guide_Auth_and_Collections.md for detailed code.*
