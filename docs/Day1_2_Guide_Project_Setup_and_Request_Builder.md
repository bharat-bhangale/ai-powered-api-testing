# Day 1–2 Guide: Project Setup, Request Builder & Response Viewer

**Sprint Day:** 1–2 of 7  
**Goal:** Build the core "send request → see response" loop  
**Features:** Project Setup, Request Builder, Key-Value Editors, Monaco Body Editor, Backend Executor, Response Viewer, Multi-Tabs

---

## Table of Contents

1. [Day 1 Morning: Project Scaffolding](#1-day-1-morning-project-scaffolding)
2. [Day 1 Morning: Design System](#2-day-1-morning-design-system)
3. [Day 1 Afternoon: Request Builder UI](#3-day-1-afternoon-request-builder-ui)
4. [Day 1 Afternoon: Key-Value Editors](#4-day-1-afternoon-key-value-editors)
5. [Day 1 Evening: Monaco Body Editor](#5-day-1-evening-monaco-body-editor)
6. [Day 2 Morning: Backend Execution Engine](#6-day-2-morning-backend-execution-engine)
7. [Day 2 Morning: SSRF Protection](#7-day-2-morning-ssrf-protection)
8. [Day 2 Afternoon: Response Viewer](#8-day-2-afternoon-response-viewer)
9. [Day 2 Afternoon: Multi-Tab Interface](#9-day-2-afternoon-multi-tab-interface)
10. [Day 2 Evening: Frontend ↔ Backend Integration](#10-day-2-evening-frontend--backend-integration)
11. [Antigravity Prompts for Day 1–2](#11-antigravity-prompts-for-day-12)

---

## 1. Day 1 Morning: Project Scaffolding

### What We're Building

A monorepo with two apps: `apps/web` (React frontend) and `apps/api` (Express backend), sharing TypeScript types via `packages/shared`.

### Step-by-Step

#### Step 1.1: Initialize Root Monorepo

```bash
mkdir api-testing-tool
cd api-testing-tool
npm init -y
```

Update `package.json`:

```json
{
  "name": "api-testing-tool",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "concurrently \"npm run dev:web\" \"npm run dev:api\"",
    "dev:web": "npm run dev --workspace=apps/web",
    "dev:api": "npm run dev --workspace=apps/api",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  }
}
```

```bash
npm install -D concurrently typescript
```

#### Step 1.2: Create Frontend App (Vite + React + TypeScript)

```bash
mkdir -p apps
cd apps
npm create vite@latest web -- --template react-ts
cd web
npm install
```

Install frontend dependencies:

```bash
npm install zustand @tanstack/react-query axios react-router-dom lucide-react sonner
npm install -D @types/react-router-dom
```

#### Step 1.3: Create Backend App (Express + TypeScript)

```bash
cd ../
mkdir api
cd api
npm init -y
```

Install backend dependencies:

```bash
npm install express cors helmet cookie-parser dotenv mongoose zod jsonwebtoken bcryptjs
npm install -D typescript @types/express @types/cors @types/cookie-parser @types/jsonwebtoken @types/bcryptjs ts-node nodemon vitest
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Create `nodemon.json`:

```json
{
  "watch": ["src"],
  "ext": "ts",
  "exec": "ts-node src/server.ts"
}
```

Add scripts to `apps/api/package.json`:

```json
{
  "scripts": {
    "dev": "nodemon",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run"
  }
}
```

#### Step 1.4: Create Shared Package

```bash
cd ../../
mkdir -p packages/shared/src/types
```

Create `packages/shared/src/types/request.types.ts`:

```typescript
export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
}

export interface RequestBody {
  mode:
    | "none"
    | "json"
    | "form-data"
    | "urlencoded"
    | "raw"
    | "binary"
    | "graphql";
  content: string;
  contentType?: string;
}

export interface AuthConfig {
  type: "none" | "apikey" | "bearer" | "basic";
  apiKey?: { key: string; value: string; addTo: "header" | "query" };
  bearer?: { token: string };
  basic?: { username: string; password: string };
}

export interface RequestConfig {
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;
  settings?: {
    timeout?: number;
    followRedirects?: boolean;
  };
}
```

Create `packages/shared/src/types/response.types.ts`:

```typescript
export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  size: number; // bytes
  timing: {
    total: number; // ms
    dns?: number;
    tcp?: number;
    tls?: number;
    ttfb?: number;
    download?: number;
  };
  cookies?: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
  }>;
}

export interface ExecutionResult {
  success: boolean;
  request: {
    resolvedUrl: string;
    resolvedHeaders: Record<string, string>;
    resolvedBody: any;
  };
  response: ResponseData;
  error?: {
    code: string;
    message: string;
  };
  executedAt: string;
}
```

#### Step 1.5: Backend Entry Point

Create `apps/api/src/app.ts`:

```typescript
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes will be added here

// Error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    });
  },
);

export default app;
```

Create `apps/api/src/server.ts`:

```typescript
import app from "./app";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 8000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/api-testing-tool";

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

start();
```

Create `apps/api/.env`:

```env
PORT=8000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.xxxxx.mongodb.net/api-testing-tool
FRONTEND_URL=http://localhost:5173
ACCESS_TOKEN_SECRET=your-access-token-secret-min-32-chars
REFRESH_TOKEN_SECRET=your-refresh-token-secret-min-32-chars
OPENAI_API_KEY=sk-xxxx
```

#### Step 1.6: Create .gitignore

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
```

#### Step 1.7: Verify Setup

From the project root:

```bash
npm install    # Install all workspace dependencies
npm run dev    # Should start both frontend (5173) and backend (8000)
```

✅ **Checkpoint:** Both apps start. Frontend shows Vite default page. Backend responds to `GET /health`.

---

## 2. Day 1 Morning: Design System

### What We're Building

A complete CSS design system with dark mode as default — CSS variables for colors, spacing, typography, and animations.

### Step-by-Step

#### Step 2.1: Install Google Font

Add to `apps/web/index.html` inside `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
  rel="stylesheet"
/>
```

#### Step 2.2: Create CSS Variables

Create `apps/web/src/styles/variables.css`:

```css
:root {
  /* ===== Color Tokens ===== */

  /* Primary (Blue) */
  --color-primary: hsl(220, 90%, 56%);
  --color-primary-hover: hsl(220, 90%, 50%);
  --color-primary-active: hsl(220, 90%, 44%);
  --color-primary-subtle: hsla(220, 90%, 56%, 0.12);

  /* Backgrounds */
  --color-bg-app: hsl(220, 20%, 10%);
  --color-bg-surface: hsl(220, 18%, 14%);
  --color-bg-elevated: hsl(220, 16%, 18%);
  --color-bg-hover: hsl(220, 15%, 20%);
  --color-bg-active: hsl(220, 14%, 22%);
  --color-bg-input: hsl(220, 18%, 12%);

  /* Borders */
  --color-border: hsl(220, 15%, 22%);
  --color-border-hover: hsl(220, 15%, 28%);
  --color-border-focus: var(--color-primary);

  /* Text */
  --color-text-primary: hsl(0, 0%, 93%);
  --color-text-secondary: hsl(220, 10%, 60%);
  --color-text-tertiary: hsl(220, 10%, 45%);
  --color-text-inverse: hsl(220, 20%, 10%);

  /* Status Colors */
  --color-success: hsl(142, 70%, 49%);
  --color-warning: hsl(38, 92%, 50%);
  --color-error: hsl(0, 84%, 60%);
  --color-info: hsl(199, 89%, 48%);

  /* HTTP Method Colors */
  --color-method-get: #22c55e;
  --color-method-post: #f97316;
  --color-method-put: #3b82f6;
  --color-method-patch: #a855f7;
  --color-method-delete: #ef4444;
  --color-method-head: #06b6d4;
  --color-method-options: #6b7280;

  /* Status Code Colors */
  --color-status-2xx: var(--color-success);
  --color-status-3xx: var(--color-info);
  --color-status-4xx: var(--color-warning);
  --color-status-5xx: var(--color-error);

  /* ===== Spacing ===== */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* ===== Typography ===== */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;

  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 14px;
  --text-md: 15px;
  --text-lg: 16px;
  --text-xl: 18px;
  --text-2xl: 20px;
  --text-3xl: 24px;

  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  /* ===== Border Radius ===== */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  /* ===== Shadows ===== */
  --shadow-sm: 0 1px 2px hsla(0, 0%, 0%, 0.3);
  --shadow-md: 0 4px 6px -1px hsla(0, 0%, 0%, 0.3);
  --shadow-lg: 0 10px 15px -3px hsla(0, 0%, 0%, 0.3);
  --shadow-xl: 0 20px 25px -5px hsla(0, 0%, 0%, 0.4);

  /* ===== Transitions ===== */
  --transition-fast: 100ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;

  /* ===== Layout ===== */
  --sidebar-width: 280px;
  --topbar-height: 48px;
  --statusbar-height: 28px;
  --tab-height: 36px;
  --ai-panel-width: 360px;
}

/* ===== Light Theme Override ===== */
[data-theme="light"] {
  --color-bg-app: hsl(220, 20%, 97%);
  --color-bg-surface: hsl(0, 0%, 100%);
  --color-bg-elevated: hsl(220, 20%, 98%);
  --color-bg-hover: hsl(220, 15%, 94%);
  --color-bg-active: hsl(220, 14%, 91%);
  --color-bg-input: hsl(0, 0%, 100%);

  --color-border: hsl(220, 15%, 88%);
  --color-border-hover: hsl(220, 15%, 80%);

  --color-text-primary: hsl(220, 20%, 14%);
  --color-text-secondary: hsl(220, 10%, 44%);
  --color-text-tertiary: hsl(220, 10%, 60%);

  --shadow-sm: 0 1px 2px hsla(0, 0%, 0%, 0.06);
  --shadow-md: 0 4px 6px -1px hsla(0, 0%, 0%, 0.08);
  --shadow-lg: 0 10px 15px -3px hsla(0, 0%, 0%, 0.1);
}
```

#### Step 2.3: Create Global Styles

Create `apps/web/src/styles/index.css`:

```css
@import "./variables.css";

/* ===== CSS Reset ===== */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
  background-color: var(--color-bg-app);
  overflow: hidden; /* Prevent body scroll — app manages its own scrolling */
}

/* ===== Scrollbar Styling ===== */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-hover);
}

/* ===== Selection ===== */
::selection {
  background: var(--color-primary-subtle);
  color: var(--color-primary);
}

/* ===== Focus Ring ===== */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ===== Links ===== */
a {
  color: var(--color-primary);
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}

/* ===== Code ===== */
code,
pre {
  font-family: var(--font-mono);
}

/* ===== Utility Classes ===== */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

✅ **Checkpoint:** App has a dark-themed background with Inter font. All colors use CSS variables.

---

## 3. Day 1 Afternoon: Request Builder UI

### What We're Building

The main request composition interface: method selector dropdown, URL input bar, Send button, and tab bar for Params/Headers/Body/Auth.

### Step-by-Step

#### Step 3.1: Create Zustand Store for Request State

Create `apps/web/src/stores/requestStore.ts`:

```typescript
import { create } from "zustand";

type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  description: string;
  enabled: boolean;
}

interface RequestTab {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: {
    mode: "none" | "json" | "form-data" | "urlencoded" | "raw";
    content: string;
  };
  auth: {
    type: "none" | "apikey" | "bearer" | "basic";
    apiKey?: { key: string; value: string; addTo: "header" | "query" };
    bearer?: { token: string };
    basic?: { username: string; password: string };
  };
  response: any | null;
  isLoading: boolean;
  isDirty: boolean;
}

interface RequestStore {
  tabs: RequestTab[];
  activeTabId: string | null;

  // Tab actions
  addTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;

  // Update active tab
  updateMethod: (method: HttpMethod) => void;
  updateUrl: (url: string) => void;
  updateHeaders: (headers: KeyValuePair[]) => void;
  updateParams: (params: KeyValuePair[]) => void;
  updateBody: (body: { mode: string; content: string }) => void;
  updateAuth: (auth: any) => void;

  // Response
  setResponse: (tabId: string, response: any) => void;
  setLoading: (tabId: string, loading: boolean) => void;
}

const createNewTab = (): RequestTab => ({
  id: crypto.randomUUID(),
  name: "Untitled Request",
  method: "GET",
  url: "",
  headers: [
    {
      id: crypto.randomUUID(),
      key: "",
      value: "",
      description: "",
      enabled: true,
    },
  ],
  params: [
    {
      id: crypto.randomUUID(),
      key: "",
      value: "",
      description: "",
      enabled: true,
    },
  ],
  body: { mode: "none", content: "" },
  auth: { type: "none" },
  response: null,
  isLoading: false,
  isDirty: false,
});

export const useRequestStore = create<RequestStore>((set, get) => ({
  tabs: [createNewTab()],
  activeTabId: null,

  addTab: () => {
    const newTab = createNewTab();
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }));
  },

  closeTab: (id) => {
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== id);
      if (newTabs.length === 0) {
        const freshTab = createNewTab();
        return { tabs: [freshTab], activeTabId: freshTab.id };
      }
      const newActiveId =
        state.activeTabId === id
          ? newTabs[Math.max(0, state.tabs.findIndex((t) => t.id === id) - 1)]
              .id
          : state.activeTabId;
      return { tabs: newTabs, activeTabId: newActiveId };
    });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  updateMethod: (method) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === state.activeTabId ? { ...t, method, isDirty: true } : t,
      ),
    }));
  },

  updateUrl: (url) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === state.activeTabId ? { ...t, url, isDirty: true } : t,
      ),
    }));
  },

  updateHeaders: (headers) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === state.activeTabId ? { ...t, headers, isDirty: true } : t,
      ),
    }));
  },

  updateParams: (params) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === state.activeTabId ? { ...t, params, isDirty: true } : t,
      ),
    }));
  },

  updateBody: (body) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === state.activeTabId ? { ...t, body, isDirty: true } : t,
      ),
    }));
  },

  updateAuth: (auth) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === state.activeTabId ? { ...t, auth, isDirty: true } : t,
      ),
    }));
  },

  setResponse: (tabId, response) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, response, isLoading: false } : t,
      ),
    }));
  },

  setLoading: (tabId, loading) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, isLoading: loading } : t,
      ),
    }));
  },
}));
```

#### Step 3.2: Build MethodSelector Component

Create `apps/web/src/components/request-builder/MethodSelector.tsx`:

```tsx
import React, { useState, useRef, useEffect } from "react";
import styles from "./MethodSelector.module.css";

type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

interface MethodSelectorProps {
  method: HttpMethod;
  onChange: (method: HttpMethod) => void;
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "var(--color-method-get)",
  POST: "var(--color-method-post)",
  PUT: "var(--color-method-put)",
  PATCH: "var(--color-method-patch)",
  DELETE: "var(--color-method-delete)",
  HEAD: "var(--color-method-head)",
  OPTIONS: "var(--color-method-options)",
};

const METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

export const MethodSelector: React.FC<MethodSelectorProps> = ({
  method,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.container} ref={ref}>
      <button
        className={styles.trigger}
        style={{ color: METHOD_COLORS[method] }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select HTTP method"
      >
        {method}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path
            d="M3 5l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
      </button>

      {isOpen && (
        <ul className={styles.dropdown}>
          {METHODS.map((m) => (
            <li key={m}>
              <button
                className={`${styles.option} ${m === method ? styles.active : ""}`}
                style={{ color: METHOD_COLORS[m] }}
                onClick={() => {
                  onChange(m);
                  setIsOpen(false);
                }}
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

Create `apps/web/src/components/request-builder/MethodSelector.module.css`:

```css
.container {
  position: relative;
  flex-shrink: 0;
}

.trigger {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  border-right: 1px solid var(--color-border);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  cursor: pointer;
  height: 100%;
  min-width: 90px;
  transition: background var(--transition-fast);
}

.trigger:hover {
  background: var(--color-bg-hover);
}

.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 50;
  min-width: 120px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-1);
  list-style: none;
  box-shadow: var(--shadow-lg);
  animation: slideDown 150ms ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.option {
  display: block;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.option:hover {
  background: var(--color-bg-hover);
}

.option.active {
  background: var(--color-primary-subtle);
}
```

#### Step 3.3: Build URL Input + Send Button

Create `apps/web/src/components/request-builder/UrlBar.tsx`:

```tsx
import React, { useRef } from "react";
import { MethodSelector } from "./MethodSelector";
import styles from "./UrlBar.module.css";

interface UrlBarProps {
  method: string;
  url: string;
  isLoading: boolean;
  onMethodChange: (method: any) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
}

export const UrlBar: React.FC<UrlBarProps> = ({
  method,
  url,
  isLoading,
  onMethodChange,
  onUrlChange,
  onSend,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      onSend();
    }
  };

  return (
    <div className={styles.urlBar}>
      <MethodSelector method={method as any} onChange={onMethodChange} />
      <input
        ref={inputRef}
        className={styles.urlInput}
        type="text"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter request URL or paste cURL"
        spellCheck={false}
        autoComplete="off"
      />
      <button
        className={styles.sendButton}
        onClick={onSend}
        disabled={isLoading || !url.trim()}
        aria-label="Send request"
      >
        {isLoading ? <span className={styles.spinner} /> : "Send"}
      </button>
    </div>
  );
};
```

Create `apps/web/src/components/request-builder/UrlBar.module.css`:

```css
.urlBar {
  display: flex;
  align-items: center;
  height: 42px;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color var(--transition-normal);
}

.urlBar:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-subtle);
}

.urlInput {
  flex: 1;
  height: 100%;
  padding: 0 var(--space-3);
  background: transparent;
  border: none;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  outline: none;
}

.urlInput::placeholder {
  color: var(--color-text-tertiary);
}

.sendButton {
  flex-shrink: 0;
  height: 100%;
  padding: 0 var(--space-5);
  background: var(--color-primary);
  border: none;
  color: white;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: background var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
}

.sendButton:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.sendButton:active:not(:disabled) {
  background: var(--color-primary-active);
}

.sendButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 600ms linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

#### Step 3.4: Build Request Tab Bar

Create `apps/web/src/components/request-builder/RequestTabs.tsx` — a tab bar showing open request tabs with method color indicators, close buttons, and a "+" button to add new tabs.

**Key Implementation Points:**

- Each tab shows the method abbreviation (colored) + request name or URL
- Close button (×) on hover
- "+" button at the end to add new tabs
- Active tab has a highlighted bottom border
- Tabs are draggable for reordering (optional — can skip for MVP)

---

## 4. Day 1 Afternoon: Key-Value Editors

### What We're Building

Reusable key-value pair editors for Headers and Query Parameters. Each row has: Enable checkbox, Key input, Value input, Description input, Delete button.

### Step-by-Step

Create `apps/web/src/components/common/KeyValueEditor/KeyValueEditor.tsx`:

```tsx
import React from "react";
import styles from "./KeyValueEditor.module.css";
import { Trash2, Plus } from "lucide-react";

interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  description: string;
  enabled: boolean;
}

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export const KeyValueEditor: React.FC<KeyValueEditorProps> = ({
  pairs,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}) => {
  const updatePair = (id: string, field: keyof KeyValuePair, value: any) => {
    const updated = pairs.map((p) =>
      p.id === id ? { ...p, [field]: value } : p,
    );

    // Auto-add empty row if last row has content
    const lastPair = updated[updated.length - 1];
    if (lastPair && (lastPair.key || lastPair.value)) {
      updated.push({
        id: crypto.randomUUID(),
        key: "",
        value: "",
        description: "",
        enabled: true,
      });
    }

    onChange(updated);
  };

  const deletePair = (id: string) => {
    if (pairs.length <= 1) return;
    onChange(pairs.filter((p) => p.id !== id));
  };

  const addPair = () => {
    onChange([
      ...pairs,
      {
        id: crypto.randomUUID(),
        key: "",
        value: "",
        description: "",
        enabled: true,
      },
    ]);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerCheck}></span>
        <span className={styles.headerKey}>{keyPlaceholder}</span>
        <span className={styles.headerValue}>{valuePlaceholder}</span>
        <span className={styles.headerDesc}>Description</span>
        <span className={styles.headerAction}></span>
      </div>

      {pairs.map((pair) => (
        <div
          key={pair.id}
          className={`${styles.row} ${!pair.enabled ? styles.disabled : ""}`}
        >
          <input
            type="checkbox"
            checked={pair.enabled}
            onChange={(e) => updatePair(pair.id, "enabled", e.target.checked)}
            className={styles.checkbox}
          />
          <input
            className={styles.keyInput}
            value={pair.key}
            onChange={(e) => updatePair(pair.id, "key", e.target.value)}
            placeholder={keyPlaceholder}
            spellCheck={false}
          />
          <input
            className={styles.valueInput}
            value={pair.value}
            onChange={(e) => updatePair(pair.id, "value", e.target.value)}
            placeholder={valuePlaceholder}
            spellCheck={false}
          />
          <input
            className={styles.descInput}
            value={pair.description}
            onChange={(e) => updatePair(pair.id, "description", e.target.value)}
            placeholder="Description"
          />
          <button
            className={styles.deleteBtn}
            onClick={() => deletePair(pair.id)}
            aria-label="Delete row"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
```

Create `apps/web/src/components/common/KeyValueEditor/KeyValueEditor.module.css`:

```css
.container {
  font-size: var(--text-sm);
}

.header {
  display: grid;
  grid-template-columns: 28px 1fr 1fr 0.8fr 32px;
  gap: 1px;
  padding: var(--space-1) 0;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
}

.row {
  display: grid;
  grid-template-columns: 28px 1fr 1fr 0.8fr 32px;
  gap: 1px;
  border-bottom: 1px solid var(--color-border);
  transition: background var(--transition-fast);
}

.row:hover {
  background: var(--color-bg-hover);
}

.row.disabled {
  opacity: 0.4;
}

.checkbox {
  place-self: center;
  width: 14px;
  height: 14px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.keyInput,
.valueInput,
.descInput {
  padding: var(--space-2) var(--space-2);
  background: transparent;
  border: none;
  border-right: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  outline: none;
}

.keyInput:focus,
.valueInput:focus,
.descInput:focus {
  background: var(--color-bg-input);
}

.descInput {
  font-family: var(--font-sans);
  color: var(--color-text-secondary);
  border-right: none;
}

.deleteBtn {
  place-self: center;
  padding: var(--space-1);
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: all var(--transition-fast);
}

.row:hover .deleteBtn {
  opacity: 1;
}

.deleteBtn:hover {
  background: hsla(0, 84%, 60%, 0.15);
  color: var(--color-error);
}
```

---

## 5. Day 1 Evening: Monaco Body Editor

### What We're Building

Monaco code editor for JSON request bodies with syntax highlighting, auto-formatting, and bracket matching.

### Step-by-Step

Install Monaco:

```bash
npm install @monaco-editor/react --workspace=apps/web
```

Create `apps/web/src/components/request-builder/BodyEditor.tsx`:

```tsx
import React from "react";
import Editor from "@monaco-editor/react";
import styles from "./BodyEditor.module.css";

interface BodyEditorProps {
  mode: string;
  content: string;
  onModeChange: (mode: string) => void;
  onContentChange: (content: string) => void;
}

const BODY_MODES = [
  { value: "none", label: "none" },
  { value: "json", label: "JSON" },
  { value: "raw", label: "Raw" },
  { value: "form-data", label: "Form Data" },
  { value: "urlencoded", label: "x-www-form-urlencoded" },
];

export const BodyEditor: React.FC<BodyEditorProps> = ({
  mode,
  content,
  onModeChange,
  onContentChange,
}) => {
  const getLanguage = () => {
    switch (mode) {
      case "json":
        return "json";
      case "raw":
        return "plaintext";
      default:
        return "plaintext";
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.modeSelector}>
        {BODY_MODES.map((m) => (
          <label key={m.value} className={styles.modeOption}>
            <input
              type="radio"
              name="bodyMode"
              value={m.value}
              checked={mode === m.value}
              onChange={() => onModeChange(m.value)}
            />
            <span>{m.label}</span>
          </label>
        ))}
      </div>

      {mode !== "none" && (
        <div className={styles.editorWrapper}>
          {mode === "json" || mode === "raw" ? (
            <Editor
              height="200px"
              language={getLanguage()}
              value={content}
              onChange={(value) => onContentChange(value || "")}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "on",
                padding: { top: 8 },
                renderLineHighlight: "none",
                scrollbar: { verticalScrollbarSize: 8 },
              }}
              loading={
                <div className={styles.editorLoading}>Loading editor...</div>
              }
            />
          ) : (
            <div className={styles.placeholder}>
              {/* KeyValueEditor for form-data and urlencoded modes */}
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  padding: "var(--space-4)",
                }}
              >
                Form data editor — uses the KeyValueEditor component
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## 6. Day 2 Morning: Backend Execution Engine

### What We're Building

A `POST /api/execute` endpoint that receives a request configuration from the frontend, executes the actual HTTP call server-side, captures timing information, and returns the full response.

### Why Server-Side Execution is Required

Browsers enforce CORS — they block requests to APIs that don't include your origin in their `Access-Control-Allow-Origin` header. Since users will test **any** API (not just yours), the backend must act as a proxy.

### Step-by-Step

#### Step 6.1: Create the Executor Service

Create `apps/api/src/modules/executor/executor.service.ts`:

```typescript
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

interface ExecuteParams {
  method: string;
  url: string;
  headers: Record<string, string>;
  params: Record<string, string>;
  body: any;
  timeout?: number;
}

interface ExecutionResult {
  success: boolean;
  request: {
    resolvedUrl: string;
    resolvedHeaders: Record<string, string>;
    resolvedBody: any;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: any;
    size: number;
    timing: {
      total: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
  executedAt: string;
}

export class ExecutorService {
  async execute(params: ExecuteParams): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Build axios config
      const config: AxiosRequestConfig = {
        method: params.method.toLowerCase() as any,
        url: params.url,
        headers: params.headers || {},
        params: params.params || {},
        data: params.body || undefined,
        timeout: params.timeout || 30000,
        validateStatus: () => true, // Don't throw on any status code
        maxRedirects: 5,
        // Capture response as-is
        transformResponse: [(data) => data],
      };

      const response: AxiosResponse = await axios(config);
      const endTime = Date.now();

      // Parse body
      let parsedBody: any;
      try {
        parsedBody = JSON.parse(response.data);
      } catch {
        parsedBody = response.data;
      }

      // Calculate size
      const size =
        typeof response.data === "string"
          ? Buffer.byteLength(response.data, "utf8")
          : 0;

      return {
        success: true,
        request: {
          resolvedUrl: params.url,
          resolvedHeaders: params.headers,
          resolvedBody: params.body,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers as Record<string, string>,
          body: parsedBody,
          size,
          timing: {
            total: endTime - startTime,
          },
        },
        executedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      const endTime = Date.now();

      // Handle network errors (DNS failure, timeout, refused)
      return {
        success: false,
        request: {
          resolvedUrl: params.url,
          resolvedHeaders: params.headers,
          resolvedBody: params.body,
        },
        response: {
          status: 0,
          statusText: "Error",
          headers: {},
          body: null,
          size: 0,
          timing: { total: endTime - startTime },
        },
        error: {
          code: error.code || "NETWORK_ERROR",
          message: error.message || "Request failed",
        },
        executedAt: new Date().toISOString(),
      };
    }
  }
}
```

#### Step 6.2: Create the Executor Controller

Create `apps/api/src/modules/executor/executor.controller.ts`:

```typescript
import { Request, Response } from "express";
import { ExecutorService } from "./executor.service";

const executorService = new ExecutorService();

export async function executeRequest(req: Request, res: Response) {
  try {
    const { method, url, headers, params, body, timeout } = req.body;

    if (!url || !method) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "URL and method are required",
        },
      });
    }

    // Convert headers array to object
    const headerObj: Record<string, string> = {};
    if (Array.isArray(headers)) {
      headers.forEach((h: any) => {
        if (h.enabled && h.key) {
          headerObj[h.key] = h.value;
        }
      });
    }

    // Convert params array to object
    const paramObj: Record<string, string> = {};
    if (Array.isArray(params)) {
      params.forEach((p: any) => {
        if (p.enabled && p.key) {
          paramObj[p.key] = p.value;
        }
      });
    }

    // Parse body content
    let parsedBody: any = undefined;
    if (body && body.mode !== "none" && body.content) {
      if (body.mode === "json") {
        try {
          parsedBody = JSON.parse(body.content);
        } catch {
          parsedBody = body.content;
        }
      } else {
        parsedBody = body.content;
      }
    }

    // Set content-type if not already set
    if (
      parsedBody &&
      !headerObj["Content-Type"] &&
      !headerObj["content-type"]
    ) {
      if (body?.mode === "json") {
        headerObj["Content-Type"] = "application/json";
      }
    }

    const result = await executorService.execute({
      method,
      url,
      headers: headerObj,
      params: paramObj,
      body: parsedBody,
      timeout,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: "EXECUTION_ERROR", message: error.message },
    });
  }
}
```

#### Step 6.3: Create the Routes

Create `apps/api/src/modules/executor/executor.routes.ts`:

```typescript
import { Router } from "express";
import { executeRequest } from "./executor.controller";

const router = Router();

router.post("/execute", executeRequest);

export default router;
```

Register in `apps/api/src/app.ts`:

```typescript
import executorRoutes from "./modules/executor/executor.routes";
app.use("/api", executorRoutes);
```

---

## 7. Day 2 Morning: SSRF Protection

### What We're Building

A guard that blocks the execution engine from making requests to internal network addresses. Without this, a user could use your tool to scan your internal infrastructure.

### Step-by-Step

Create `apps/api/src/utils/ssrf-guard.ts`:

```typescript
import { URL } from "url";
import dns from "dns";
import { promisify } from "util";

const resolve4 = promisify(dns.resolve4);

const BLOCKED_IP_RANGES = [
  /^127\./, // Loopback
  /^10\./, // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private Class B
  /^192\.168\./, // Private Class C
  /^169\.254\./, // Link-local / AWS metadata
  /^0\./, // Current network
  /^::1$/, // IPv6 loopback
  /^fe80:/, // IPv6 link-local
  /^fc00:/, // IPv6 unique local
  /^fd/, // IPv6 unique local
];

const BLOCKED_HOSTNAMES = [
  "localhost",
  "metadata.google.internal",
  "metadata.internal",
];

export async function validateUrl(rawUrl: string): Promise<void> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL format");
  }

  // Block non-HTTP protocols
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(
      `Protocol "${parsedUrl.protocol}" is not allowed. Use http:// or https://`,
    );
  }

  // Block known internal hostnames
  const hostname = parsedUrl.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new Error(
      `Requests to "${hostname}" are blocked for security reasons`,
    );
  }

  // Resolve hostname to IP and check against blocked ranges
  try {
    const ips = await resolve4(hostname);
    for (const ip of ips) {
      for (const pattern of BLOCKED_IP_RANGES) {
        if (pattern.test(ip)) {
          throw new Error(
            `Requests to internal IP addresses are blocked for security reasons`,
          );
        }
      }
    }
  } catch (err: any) {
    if (err.message.includes("blocked")) throw err;
    // DNS resolution failed — let the actual request handle the error
  }
}
```

Add SSRF check to executor service:

```typescript
import { validateUrl } from "../../utils/ssrf-guard";

// In execute method, before making the request:
await validateUrl(params.url);
```

---

## 8. Day 2 Afternoon: Response Viewer

### What We're Building

A response display panel with: status badge (color-coded), response time, payload size, tabbed view (Body/Headers/Cookies), pretty-printed JSON with collapsible tree, and raw text toggle.

### Key Implementation Points

1. **Status Badge**: Color-code based on status range:
   - `2xx` → green badge
   - `3xx` → blue badge
   - `4xx` → yellow/orange badge
   - `5xx` → red badge
   - `0` (network error) → gray badge

2. **Response Time**: Show in ms with color indicator (green < 200ms, yellow < 1000ms, red > 1000ms)

3. **Payload Size**: Show in human-readable format (e.g., "1.2 KB", "3.5 MB")

4. **JSON Pretty-Print**: Use a recursive React component or `react-json-view-lite` for collapsible JSON tree

5. **Response Headers**: Simple table of key-value pairs

---

## 9. Day 2 Afternoon: Multi-Tab Interface

### What We're Building

Browser-style tabs allowing users to work on multiple requests simultaneously.

### Key Implementation Points

1. Tab bar at the top showing open tabs with method color dot + tab name
2. "+" button at the end to add new tab
3. "×" close button appears on hover
4. Active tab is visually distinguished with bottom border color
5. At least one tab must always exist (closing last tab creates a new empty one)
6. Tab state managed by `requestStore` Zustand store (already built)

---

## 10. Day 2 Evening: Frontend ↔ Backend Integration

### What We're Building

Wire up the frontend Send button to call the backend executor API and display the response.

### Step-by-Step

Create `apps/web/src/services/api.ts`:

```typescript
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 60000,
  withCredentials: true,
});

export default api;
```

Create `apps/web/src/services/executor.service.ts`:

```typescript
import api from "./api";

export async function executeRequest(config: {
  method: string;
  url: string;
  headers: any[];
  params: any[];
  body: any;
}) {
  const response = await api.post("/api/execute", config);
  return response.data;
}
```

Wire up in the main `RequestBuilder` component:

```typescript
const handleSend = async () => {
  const activeTab = useRequestStore
    .getState()
    .tabs.find((t) => t.id === activeTabId);
  if (!activeTab || !activeTab.url.trim()) return;

  useRequestStore.getState().setLoading(activeTab.id, true);

  try {
    const result = await executeRequest({
      method: activeTab.method,
      url: activeTab.url,
      headers: activeTab.headers,
      params: activeTab.params,
      body: activeTab.body,
    });
    useRequestStore.getState().setResponse(activeTab.id, result);
  } catch (error: any) {
    useRequestStore.getState().setResponse(activeTab.id, {
      success: false,
      error: { code: "CLIENT_ERROR", message: error.message },
    });
  }
};
```

✅ **End of Day 2 Milestone:** User can build a request, send it, and see the response. The core product loop works!

---

## 11. Antigravity Prompts for Day 1–2

### Prompt 1: Project Scaffolding

```
Set up a monorepo for an API testing tool with:
- apps/web: Vite + React 19 + TypeScript
- apps/api: Express 5 + TypeScript + Mongoose
- packages/shared: Shared TypeScript types

Use npm workspaces. Add concurrently for dev script.
Install these frontend deps: zustand, @tanstack/react-query, axios, react-router-dom, lucide-react, sonner, @monaco-editor/react
Install these backend deps: express, cors, helmet, cookie-parser, dotenv, mongoose, zod, jsonwebtoken, bcryptjs, axios

Follow the folder structure from our research reports.
```

### Prompt 2: Design System

```
Create the CSS design system at apps/web/src/styles/:
1. variables.css — Complete design tokens (colors, spacing, typography, shadows, transitions) with dark mode default and [data-theme="light"] override
2. index.css — CSS reset, scrollbar styling, selection colors, focus ring, utility classes

Use Inter (sans) and JetBrains Mono (mono) fonts.
Dark theme: hsl(220, 20%, 10%) background, hsl(220, 90%, 56%) primary.
Use our HTTP method color system: GET=green, POST=orange, PUT=blue, PATCH=purple, DELETE=red.
```

### Prompt 3: Request Builder

```
Build the Request Builder at apps/web/src/components/request-builder/:
1. MethodSelector.tsx — Dropdown for HTTP methods (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS) with colored text
2. UrlBar.tsx — Method selector + URL input + Send button in one bar with focus ring
3. RequestTabs.tsx — Browser-style request tabs with method dot, name, close button, "+" button
4. RequestPanel.tsx — Tab bar (Params/Headers/Body/Auth) with sub-panel content

Use requestStore.ts (Zustand) for all state.
Use CSS Modules with our design tokens from variables.css.
Ctrl+Enter keyboard shortcut to send.
```

### Prompt 4: Backend Executor

```
Build the request execution engine at apps/api/src/modules/executor/:
1. executor.service.ts — Receives request config, makes HTTP call via axios, captures timing, returns structured response
2. executor.controller.ts — Express handler for POST /api/execute
3. executor.routes.ts — Route registration
4. Add SSRF guard (ssrf-guard.ts) that blocks internal IPs, metadata endpoints, non-HTTP protocols

The executor must:
- Accept method, url, headers[], params[], body, timeout
- Convert headers/params arrays to objects (only enabled=true entries)
- Auto-set Content-Type for JSON bodies
- Return: { success, request: { resolvedUrl, resolvedHeaders, resolvedBody }, response: { status, statusText, headers, body, size, timing: { total } }, error?, executedAt }
- Never throw on HTTP error status codes (4xx/5xx are valid responses)
```

---

_End of Day 1–2 Guide. Next: Open Day 3 Guide for Auth + Collections._
