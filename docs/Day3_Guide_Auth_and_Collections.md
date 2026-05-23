# Day 3 Guide: Authentication & Collections

**Sprint Day:** 3 of 7  
**Goal:** Users can register, login, create collections, save/load requests  
**Features:** JWT Auth, Collections CRUD, Sidebar Collection Tree, Save/Load Requests

---

## Table of Contents

1. [Backend Authentication](#1-backend-authentication)
2. [Frontend Auth (Login/Register)](#2-frontend-auth-loginregister)
3. [Backend Collections & Requests CRUD](#3-backend-collections--requests-crud)
4. [Frontend Sidebar Collection Tree](#4-frontend-sidebar-collection-tree)
5. [Save & Load Requests](#5-save--load-requests)
6. [Antigravity Prompts for Day 3](#6-antigravity-prompts-for-day-3)

---

## 1. Backend Authentication

### What We're Building
Secure JWT authentication: Register (email+password), Login (returns access token + HTTP-only refresh cookie), Token Refresh, Logout, Protected route middleware.

### Step-by-Step

#### Step 1.1: User Model

Create `apps/api/src/models/User.model.ts`:
```typescript
import mongoose, { Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  name: string;
  passwordHash: string;
  avatar?: string;
  preferences: {
    theme: 'dark' | 'light' | 'system';
    editorFontSize: number;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true },
  avatar: { type: String },
  preferences: {
    theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
    editorFontSize: { type: Number, default: 14 },
  },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

// Don't return passwordHash in queries
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model<IUser>('User', userSchema);
```

#### Step 1.2: Auth Service

Create `apps/api/src/modules/auth/auth.service.ts`:
```typescript
import jwt from 'jsonwebtoken';
import { User, IUser } from '../../models/User.model';

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access-secret-change-me';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-change-me';

export class AuthService {
  async register(email: string, name: string, password: string): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) throw new Error('Email already registered');

    // Validate password strength
    if (password.length < 8) throw new Error('Password must be at least 8 characters');

    // Create user
    const user = new User({ email, name, passwordHash: password });
    await user.save();

    const tokens = this.generateTokens(user._id.toString());
    return { user, ...tokens };
  }

  async login(email: string, password: string): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const user = await User.findOne({ email });
    if (!user) throw new Error('Invalid email or password');

    const isValid = await user.comparePassword(password);
    if (!isValid) throw new Error('Invalid email or password');

    const tokens = this.generateTokens(user._id.toString());
    return { user, ...tokens };
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as { userId: string };
      const user = await User.findById(decoded.userId);
      if (!user) throw new Error('User not found');
      return this.generateTokens(user._id.toString());
    } catch {
      throw new Error('Invalid refresh token');
    }
  }

  async getMe(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  }

  private generateTokens(userId: string) {
    const accessToken = jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }
}
```

#### Step 1.3: Auth Controller

Create `apps/api/src/modules/auth/auth.controller.ts`:
```typescript
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

const authService = new AuthService();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

export async function register(req: Request, res: Response) {
  try {
    const { email, name, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.register(email, name, password);
    
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.status(201).json({ success: true, data: { user, accessToken } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'AUTH_ERROR', message: error.message } });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login(email, password);
    
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.json({ success: true, data: { user, accessToken } });
  } catch (error: any) {
    res.status(401).json({ success: false, error: { code: 'AUTH_ERROR', message: error.message } });
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const oldRefreshToken = req.cookies.refreshToken;
    if (!oldRefreshToken) {
      return res.status(401).json({ success: false, error: { code: 'NO_TOKEN', message: 'No refresh token' } });
    }

    const { accessToken, refreshToken } = await authService.refreshTokens(oldRefreshToken);
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.json({ success: true, data: { accessToken } });
  } catch (error: any) {
    res.clearCookie('refreshToken', COOKIE_OPTIONS);
    res.status(401).json({ success: false, error: { code: 'TOKEN_ERROR', message: error.message } });
  }
}

export async function logout(req: Request, res: Response) {
  res.clearCookie('refreshToken', COOKIE_OPTIONS);
  res.json({ success: true, data: { message: 'Logged out' } });
}

export async function getMe(req: Request, res: Response) {
  try {
    const user = await authService.getMe((req as any).userId);
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    res.json({ success: true, data: { user } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
}
```

#### Step 1.4: Auth Middleware

Create `apps/api/src/middleware/authenticate.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access-secret-change-me';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Access token required' },
    });
  }

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as { userId: string };
    (req as any).userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Access token expired' },
    });
  }
}
```

#### Step 1.5: Auth Routes

Create `apps/api/src/modules/auth/auth.routes.ts`:
```typescript
import { Router } from 'express';
import { register, login, refresh, logout, getMe } from './auth.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

export default router;
```

Register in `apps/api/src/app.ts`:
```typescript
import authRoutes from './modules/auth/auth.routes';
app.use('/api/auth', authRoutes);
```

---

## 2. Frontend Auth (Login/Register)

### What We're Building
Login and Register pages with form validation, Zustand auth store, and Axios interceptor for automatic token refresh.

### Step-by-Step

#### Step 2.1: Auth Store (Zustand)

Create `apps/web/src/stores/authStore.ts`:
```typescript
import { create } from 'zustand';
import api from '../services/api';

interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  preferences: { theme: string; editorFontSize: number };
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    const { user, accessToken } = res.data.data;
    set({ user, accessToken, isAuthenticated: true });
  },

  register: async (email, name, password) => {
    const res = await api.post('/api/auth/register', { email, name, password });
    const { user, accessToken } = res.data.data;
    set({ user, accessToken, isAuthenticated: true });
  },

  logout: async () => {
    await api.post('/api/auth/logout');
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  refreshToken: async () => {
    try {
      const res = await api.post('/api/auth/refresh');
      const { accessToken } = res.data.data;
      set({ accessToken });
    } catch {
      set({ user: null, accessToken: null, isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    try {
      await get().refreshToken();
      const res = await api.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${get().accessToken}` },
      });
      set({ user: res.data.data.user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
```

#### Step 2.2: Axios Interceptor for Auto-Refresh

Add to `apps/web/src/services/api.ts`:
```typescript
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 60000,
  withCredentials: true,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        await useAuthStore.getState().refreshToken();
        original.headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

#### Step 2.3: Login/Register Pages

Build `LoginPage.tsx` and `RegisterPage.tsx` with:
- Clean form with email + password inputs (+ name for register)
- Loading state on submit button
- Error message display
- Link to switch between login/register
- Redirect to main app on success

---

## 3. Backend Collections & Requests CRUD

### What We're Building
MongoDB models and CRUD endpoints for Collections (with folders) and Saved Requests.

### Step-by-Step

#### Step 3.1: Collection Model

Create `apps/api/src/models/Collection.model.ts`:
```typescript
import mongoose, { Document } from 'mongoose';

export interface ICollection extends Document {
  name: string;
  description?: string;
  userId: mongoose.Types.ObjectId;
  folders: Array<{
    _id: mongoose.Types.ObjectId;
    name: string;
    parentFolderId: mongoose.Types.ObjectId | null;
    sortOrder: number;
  }>;
  auth: {
    type: string;
    config: any;
  };
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const collectionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  folders: [{
    name: { type: String, required: true },
    parentFolderId: { type: mongoose.Schema.Types.ObjectId, default: null },
    sortOrder: { type: Number, default: 0 },
  }],
  auth: {
    type: { type: String, enum: ['none', 'apikey', 'bearer', 'basic'], default: 'none' },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

collectionSchema.index({ userId: 1, sortOrder: 1 });

export const Collection = mongoose.model<ICollection>('Collection', collectionSchema);
```

#### Step 3.2: Request Model

Create `apps/api/src/models/Request.model.ts`:
```typescript
import mongoose, { Document } from 'mongoose';

export interface ISavedRequest extends Document {
  name: string;
  collectionId: mongoose.Types.ObjectId;
  folderId: mongoose.Types.ObjectId | null;
  userId: mongoose.Types.ObjectId;
  method: string;
  url: string;
  headers: Array<{ key: string; value: string; description: string; enabled: boolean }>;
  params: Array<{ key: string; value: string; description: string; enabled: boolean }>;
  body: { mode: string; content: string; contentType: string };
  auth: { type: string; config: any };
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const savedRequestSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', required: true },
  folderId: { type: mongoose.Schema.Types.ObjectId, default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  method: { type: String, required: true, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] },
  url: { type: String, default: '' },
  headers: [{ key: String, value: String, description: String, enabled: Boolean }],
  params: [{ key: String, value: String, description: String, enabled: Boolean }],
  body: {
    mode: { type: String, default: 'none' },
    content: { type: String, default: '' },
    contentType: { type: String, default: '' },
  },
  auth: {
    type: { type: String, default: 'none' },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

savedRequestSchema.index({ collectionId: 1, sortOrder: 1 });
savedRequestSchema.index({ folderId: 1 });
savedRequestSchema.index({ userId: 1 });

export const SavedRequest = mongoose.model<ISavedRequest>('SavedRequest', savedRequestSchema);
```

#### Step 3.3: Collections Controller & Routes

Build `modules/collections/` with CRUD for:
- `POST /api/collections` — Create collection
- `GET /api/collections` — List user's collections (with populated requests)
- `GET /api/collections/:id` — Get single collection with all requests
- `PATCH /api/collections/:id` — Update collection
- `DELETE /api/collections/:id` — Delete collection and all its requests
- `POST /api/collections/:id/folders` — Add folder
- `PATCH /api/collections/:id/folders/:fid` — Rename folder
- `DELETE /api/collections/:id/folders/:fid` — Delete folder

#### Step 3.4: Requests Controller & Routes

Build `modules/requests/` with CRUD for:
- `POST /api/requests` — Save request to collection
- `GET /api/requests/:id` — Get request details
- `PATCH /api/requests/:id` — Update request
- `DELETE /api/requests/:id` — Delete request
- `POST /api/requests/:id/duplicate` — Duplicate request

---

## 4. Frontend Sidebar Collection Tree

### What We're Building
A collapsible sidebar tree showing: Collections → Folders → Requests. Each request shows its HTTP method badge (colored). Context menu for rename/delete.

### Key Implementation Points

1. **Tree Structure**: Recursive component rendering
   ```
   📁 My API (collection)
     📁 Auth (folder)
       🟢 GET /users
       🟠 POST /auth/login
     📁 Products (folder)
       🟢 GET /products
       🔴 DELETE /products/:id
   ```

2. **Interactions**:
   - Click collection/folder → expand/collapse
   - Click request → load into active tab
   - Right-click → context menu (rename, delete, duplicate, move)
   - Drag-and-drop → reorder (optional for Day 3)

3. **Zustand Store**: Create `collectionStore.ts` with:
   - `collections: []`
   - `expandedIds: Set<string>`
   - `fetchCollections()`
   - `createCollection(name)`
   - `toggleExpanded(id)`

4. **Visual Design**:
   - Indent each nesting level by 16px
   - Method badge: small colored text (GET, POST, etc.)
   - Active request highlighted with primary color background
   - Hover state on all items
   - Collection/folder icons from Lucide (Folder, FolderOpen)

---

## 5. Save & Load Requests

### What We're Building
"Save" button in request builder that saves the current state to a collection. Clicking a request in the sidebar loads it into a tab.

### Key Flow

**Saving:**
1. User clicks "Save" (or Ctrl+S)
2. If request is new → show "Save to Collection" modal:
   - Select collection dropdown
   - Select folder dropdown (optional)
   - Request name input
3. If request already saved → update in place (PATCH)
4. After save → mark tab as "not dirty"

**Loading:**
1. User clicks request in sidebar
2. If already open in a tab → switch to that tab
3. Otherwise → create new tab with request data
4. Tab name shows the saved request name

---

## 6. Antigravity Prompts for Day 3

### Prompt 1: Backend Auth
```
Build the authentication system at apps/api/src/modules/auth/:
1. User model with bcrypt password hashing (salt rounds: 12)
2. AuthService: register, login, refreshTokens, getMe
3. AuthController: register, login, refresh, logout, getMe endpoints
4. authenticate middleware: verify JWT from Authorization header
5. Auth routes: POST /api/auth/register, POST /api/auth/login, POST /api/auth/refresh, POST /api/auth/logout, GET /api/auth/me

JWT: 15min access token, 7-day refresh token in HTTP-only secure cookie.
Response format: { success: boolean, data: { user, accessToken } }
Password minimum: 8 characters.
```

### Prompt 2: Backend Collections
```
Build Collections and Requests CRUD at apps/api/src/modules/:
1. Collection model: name, userId, folders[], auth, sortOrder
2. SavedRequest model: name, collectionId, folderId, userId, method, url, headers[], params[], body, auth, sortOrder
3. Full CRUD for both (controllers + services + routes)
4. GET /api/collections should return collections with their requests populated
5. DELETE collection should cascade-delete all requests in it
6. All routes protected with authenticate middleware

Follow our backend module pattern: controller → service → routes → validation
```

### Prompt 3: Frontend Auth + Sidebar
```
Build the frontend auth and sidebar:
1. authStore.ts (Zustand): user, accessToken, login, register, logout, refreshToken, checkAuth
2. Axios interceptor: auto-attach token, auto-refresh on 401
3. LoginPage.tsx and RegisterPage.tsx with form validation
4. Protected routes (redirect to /login if not authenticated)
5. collectionStore.ts: collections, expandedIds, fetchCollections, toggleExpanded
6. Sidebar/CollectionTree.tsx: recursive tree with expand/collapse, method badges, click-to-load
7. "Save" button + modal for saving request to collection

Follow our design system. CSS Modules. No Tailwind.
```

---

*End of Day 3 Guide. Next: Open Day 4 Guide for Environments & Variables.*
