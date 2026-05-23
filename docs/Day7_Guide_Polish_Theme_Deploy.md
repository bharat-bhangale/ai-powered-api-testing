# Day 7 Guide: Polish, Dark/Light Theme & Deployment

**Sprint Day:** 7 of 7  
**Goal:** Dark/light theme, UI polish, error handling, deployment  
**Features:** Theme Switcher, Micro-animations, Error Handling, Deployment, Final Checklist

---

## Table of Contents

1. [Dark/Light Theme System](#1-darklight-theme-system)
2. [UI Polish & Micro-Animations](#2-ui-polish--micro-animations)
3. [Error Handling & Edge Cases](#3-error-handling--edge-cases)
4. [Keyboard Shortcuts](#4-keyboard-shortcuts)
5. [Deployment](#5-deployment)
6. [Final Checklist](#6-final-checklist)
7. [Antigravity Prompts for Day 7](#7-antigravity-prompts-for-day-7)

---

## 1. Dark/Light Theme System

### What We're Building
A theme system using CSS variables with `data-theme` attribute. Dark mode is default. Supports: Dark, Light, and System (auto-detect OS preference).

### Step-by-Step

#### Step 1.1: Theme Hook

Create `apps/web/src/hooks/useTheme.ts`:
```typescript
import { useState, useEffect, useCallback } from 'react';

type Theme = 'dark' | 'light' | 'system';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'dark';
  });

  const getSystemTheme = useCallback((): 'dark' | 'light' => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    localStorage.setItem('theme', theme);

    // Listen for system theme changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme, resolvedTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return { theme, resolvedTheme, setTheme };
}
```

#### Step 1.2: Prevent Flash of Wrong Theme

Add this script to `apps/web/index.html` inside `<head>` (before any CSS):
```html
<script>
  (function() {
    const theme = localStorage.getItem('theme') || 'dark';
    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.setAttribute('data-theme', resolved);
  })();
</script>
```

#### Step 1.3: Theme Switcher Component

Create `apps/web/src/components/common/ThemeSwitcher.tsx`:
```tsx
import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import styles from './ThemeSwitcher.module.css';

const THEME_OPTIONS = [
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'system', icon: Monitor, label: 'System' },
] as const;

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className={styles.container} role="radiogroup" aria-label="Theme">
      {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          className={`${styles.option} ${theme === value ? styles.active : ''}`}
          onClick={() => setTheme(value)}
          aria-label={label}
          title={label}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
};
```

Create `apps/web/src/components/common/ThemeSwitcher.module.css`:
```css
.container {
  display: flex;
  align-items: center;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: 2px;
  gap: 2px;
}

.option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-normal);
}

.option:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
}

.option.active {
  color: var(--color-primary);
  background: var(--color-primary-subtle);
}
```

#### Step 1.4: CSS Variable Overrides

The light theme variables are already defined in `variables.css` from Day 1 under `[data-theme="light"]`. The system works by:
1. Default (no attribute) → dark theme variables
2. `[data-theme="dark"]` → dark theme (explicit)
3. `[data-theme="light"]` → light theme overrides

---

## 2. UI Polish & Micro-Animations

### What We're Building
Subtle animations that make the app feel alive and premium.

### Step-by-Step

#### Step 2.1: Create Animation Utilities

Create `apps/web/src/styles/animations.css`:
```css
/* ===== Entrance Animations ===== */

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-16px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* ===== Loading Animations ===== */

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== Utility Classes ===== */

.animate-fade-in { animation: fadeIn 200ms ease; }
.animate-fade-in-up { animation: fadeInUp 250ms ease; }
.animate-fade-in-down { animation: fadeInDown 250ms ease; }
.animate-slide-in-right { animation: slideInRight 200ms ease; }
.animate-slide-in-left { animation: slideInLeft 200ms ease; }
.animate-scale-in { animation: scaleIn 200ms ease; }
.animate-pulse { animation: pulse 2s ease-in-out infinite; }

/* ===== Skeleton Loading ===== */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg-hover) 25%,
    var(--color-bg-elevated) 50%,
    var(--color-bg-hover) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}

/* ===== Transitions ===== */
.transition-all {
  transition: all var(--transition-normal);
}

.transition-colors {
  transition: color var(--transition-normal),
              background-color var(--transition-normal),
              border-color var(--transition-normal);
}
```

#### Step 2.2: Apply Animations to Components

Add these animations throughout the app:

| Component | Animation | CSS |
|:----------|:----------|:----|
| **Dropdown menus** | Scale in from top | `animation: scaleIn 150ms ease` with `transform-origin: top` |
| **Modals** | Fade in + scale | Backdrop: `fadeIn 200ms`, Content: `scaleIn 200ms ease` |
| **Sidebar items** | Slide in from left | `animation: slideInLeft 150ms ease` |
| **Response viewer** | Fade in up | `animation: fadeInUp 200ms ease` when response arrives |
| **Toast notifications** | Slide in from right | Using `sonner` library (already handles this) |
| **Tab switching** | Crossfade | `opacity` transition on tab content |
| **Status badge** | Subtle pulse on new response | Short `pulse` animation (once) |
| **Loading state** | Skeleton shimmer | Applied to response area while loading |
| **AI chat messages** | Fade in up | Each new message animates in |
| **Button hover** | Lift + shadow | `transform: translateY(-1px); box-shadow: var(--shadow-md)` |

#### Step 2.3: Status Bar

Build `apps/web/src/components/layout/StatusBar.tsx`:
```
┌──────────────────────────────────────────────────────────────────┐
│ 🟢 Connected to localhost:8000  │  Env: Development  │  ✨ 12/50  │  🌙 │
└──────────────────────────────────────────────────────────────────┘
```

- Left: Connection status (green dot + backend URL)
- Center: Active environment name
- Right: AI usage indicator + theme switcher

---

## 3. Error Handling & Edge Cases

### What We're Building
Comprehensive error handling so the app never crashes or shows broken states.

### Step-by-Step

#### Step 3.1: Global Error Boundary

Create `apps/web/src/app/error-boundary.tsx`:
```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            {this.state.error?.message}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{ marginTop: '16px', padding: '8px 16px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

#### Step 3.2: Edge Cases to Handle

| Scenario | Handling |
|:---------|:---------|
| **Network offline** | Detect with `navigator.onLine`. Show banner: "You're offline — requests will fail" |
| **Backend down** | Show toast: "Cannot connect to server" with retry button |
| **Token expired during operation** | Auto-refresh interceptor handles this (from Day 3) |
| **Empty response body** | Show "No content" message instead of blank area |
| **Huge response (> 1MB)** | Show warning: "Large response. Rendering may be slow." Add "Raw" toggle |
| **Invalid JSON in body editor** | Show red border on Monaco + inline error: "Invalid JSON: Unexpected token at line X" |
| **URL without protocol** | Auto-prepend `https://` when sending if no protocol specified |
| **Special characters in variables** | URL-encode values when used in query params |
| **Collection tree empty** | Show empty state: "No collections yet. Create one to get started." with CTA button |
| **History empty** | Show empty state: "No history yet. Send a request to see it here." |

---

## 4. Keyboard Shortcuts

### What We're Building
Global keyboard shortcuts for power users.

### Shortcut Map

| Shortcut | Action |
|:---------|:-------|
| `Ctrl+Enter` | Send request |
| `Ctrl+S` | Save request to collection |
| `Ctrl+N` | New tab |
| `Ctrl+W` | Close current tab |
| `Ctrl+Tab` | Switch to next tab |
| `Ctrl+Shift+Tab` | Switch to previous tab |
| `Ctrl+L` | Focus URL bar |
| `Ctrl+Shift+I` | Toggle AI chat panel |
| `Ctrl+E` | Toggle environment selector |
| `Ctrl+H` | Toggle history panel |
| `Ctrl+Shift+C` | Copy response as cURL |

### Implementation

Create `apps/web/src/hooks/useKeyboardShortcuts.ts`:
```typescript
import { useEffect } from 'react';
import { useRequestStore } from '../stores/requestStore';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'Enter') {
        e.preventDefault();
        // Trigger send request
        document.getElementById('send-button')?.click();
      }

      if (ctrl && e.key === 's') {
        e.preventDefault();
        // Trigger save
        document.getElementById('save-button')?.click();
      }

      if (ctrl && e.key === 'n') {
        e.preventDefault();
        useRequestStore.getState().addTab();
      }

      if (ctrl && e.key === 'w') {
        e.preventDefault();
        const activeId = useRequestStore.getState().activeTabId;
        if (activeId) useRequestStore.getState().closeTab(activeId);
      }

      if (ctrl && e.key === 'l') {
        e.preventDefault();
        document.getElementById('url-input')?.focus();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
```

---

## 5. Deployment

### What We're Building
Deploy frontend to Vercel, backend to Railway, database on MongoDB Atlas (free tier).

### Step-by-Step

#### Step 5.1: MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create free M0 cluster
3. Create database user
4. Add `0.0.0.0/0` to IP whitelist (for Railway access)
5. Get connection string: `mongodb+srv://user:pass@cluster.xxx.mongodb.net/api-testing-tool`

#### Step 5.2: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Select the `apps/api` directory as root
4. Add environment variables:
   ```
   PORT=8000
   MONGODB_URI=mongodb+srv://...
   ACCESS_TOKEN_SECRET=generate-a-random-64-char-string
   REFRESH_TOKEN_SECRET=generate-another-random-64-char-string
   FRONTEND_URL=https://your-app.vercel.app
   OPENAI_API_KEY=sk-...
   NODE_ENV=production
   ```
5. Build command: `npm run build`
6. Start command: `npm start`
7. Get the deployment URL (e.g., `https://your-api.up.railway.app`)

#### Step 5.3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import from GitHub repo
3. Set root directory: `apps/web`
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variable:
   ```
   VITE_API_URL=https://your-api.up.railway.app
   ```
7. Deploy
8. Get the deployment URL (e.g., `https://your-app.vercel.app`)

#### Step 5.4: Update CORS

After deployment, update the backend's `FRONTEND_URL` environment variable on Railway to match your Vercel URL.

#### Step 5.5: Custom Domain (Optional)

If you have a domain:
- Vercel: Add custom domain in project settings
- Railway: Add custom domain in service settings
- Update CORS to use custom domain

---

## 6. Final Checklist

### Feature Verification Checklist

| # | Feature | Test Steps | Status |
|:--|:--------|:-----------|:-------|
| 1 | **App loads** | Open the URL → see the app with dark theme | ☐ |
| 2 | **Register** | Create account with email + password → redirected to main app | ☐ |
| 3 | **Login** | Login with credentials → see main app | ☐ |
| 4 | **Send GET** | Enter `https://jsonplaceholder.typicode.com/posts/1` → click Send → see JSON response | ☐ |
| 5 | **Send POST** | POST to `https://jsonplaceholder.typicode.com/posts` with JSON body → see 201 response | ☐ |
| 6 | **Headers** | Add custom header → verify it's sent (check request in history) | ☐ |
| 7 | **Query Params** | Add params → verify URL updates with `?key=value` | ☐ |
| 8 | **Multi-tabs** | Open 3 tabs → switch between them → data persists | ☐ |
| 9 | **Create Collection** | Create "My API" collection → appears in sidebar | ☐ |
| 10 | **Save Request** | Save current request to collection → appears in sidebar tree | ☐ |
| 11 | **Load Request** | Click saved request in sidebar → loads into tab | ☐ |
| 12 | **Create Folder** | Create folder in collection → drag request into it | ☐ |
| 13 | **Create Environment** | Create "Dev" environment with variables | ☐ |
| 14 | **Use Variables** | Set `base_url` variable → use `{{base_url}}/posts` → works | ☐ |
| 15 | **Switch Environment** | Create "Prod" env with different base_url → switch → request uses new URL | ☐ |
| 16 | **Bearer Auth** | Set Bearer token → verify Authorization header is sent | ☐ |
| 17 | **History** | Send requests → check history panel → see all entries | ☐ |
| 18 | **cURL Import** | Paste cURL command in URL bar → auto-populates request builder | ☐ |
| 19 | **cURL Export** | Build request → "Copy as cURL" → verify the cURL command | ☐ |
| 20 | **Postman Import** | Upload Postman Collection JSON → see it in sidebar | ☐ |
| 21 | **AI Chat** | Open AI panel → ask "What is a 200 status code?" → get response | ☐ |
| 22 | **AI Test Gen** | Send request → click "Generate Tests" → see test suggestions | ☐ |
| 23 | **AI Debug** | Trigger 401 error → click "Debug" → see diagnosis + fix suggestions | ☐ |
| 24 | **Dark/Light Theme** | Toggle theme → all colors update smoothly | ☐ |
| 25 | **Ctrl+Enter** | Press Ctrl+Enter → request sends | ☐ |
| 26 | **Responsive** | Resize window → layout adjusts (sidebar collapses on small screens) | ☐ |
| 27 | **Error handling** | Enter invalid URL → see error message (not crash) | ☐ |
| 28 | **Production** | All features work on deployed URL (not just localhost) | ☐ |

### Performance Targets

| Metric | Target |
|:-------|:-------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Response viewer render (1MB JSON) | < 500ms |
| API request execution latency | < 50ms overhead (excluding target API) |
| Bundle size (gzipped) | < 500KB |

---

## 7. Antigravity Prompts for Day 7

### Prompt 1: Theme System
```
Implement dark/light theme system:
1. useTheme hook: manages theme state (dark/light/system), persists to localStorage, applies data-theme attribute, listens for OS preference changes
2. Add anti-flash script to index.html <head> that reads localStorage and sets data-theme before render
3. ThemeSwitcher component: 3-button toggle (Moon/Sun/Monitor icons from Lucide) with active state
4. Add to status bar

The CSS variables are already defined in variables.css with [data-theme="light"] overrides.
Ensure smooth transition on theme change (transition on background-color and color).
```

### Prompt 2: UI Polish
```
Add micro-animations and polish throughout the app:

1. Create animations.css with: fadeIn, fadeInUp, fadeInDown, slideInRight, slideInLeft, scaleIn, pulse, shimmer, spin
2. Apply animations: dropdown menus (scaleIn), modals (fadeIn + scaleIn), sidebar items (slideInLeft), response arrival (fadeInUp), toast notifications, loading skeletons (shimmer)
3. Status bar: connection status, active environment, AI usage, theme switcher
4. Empty states: collection tree, history, response area (with illustrations or icons + CTA)
5. Loading states: skeleton loaders for response area, history list, collection tree
6. Keyboard shortcuts: Ctrl+Enter (send), Ctrl+S (save), Ctrl+N (new tab), Ctrl+W (close tab), Ctrl+L (focus URL)
7. Error boundary: global error boundary with reload button
8. URL auto-prepend: add https:// if no protocol specified
```

### Prompt 3: Deploy
```
Prepare the app for deployment:

1. Backend (apps/api):
   - Ensure production build works: npm run build → npm start
   - All secrets from environment variables
   - CORS configured for production frontend URL
   - Health check endpoint at GET /health

2. Frontend (apps/web):
   - Ensure production build works: npm run build
   - VITE_API_URL environment variable for backend URL
   - Add meta tags: title, description, OG tags

3. Create README.md at project root with:
   - Project description
   - Tech stack
   - Getting started (local development)
   - Environment variables list
   - Deployment instructions
   - Screenshots placeholder
```

---

## 🎉 Congratulations!

If you've followed this 7-day guide, you now have:

1. ✅ A working API testing tool with request builder, response viewer, and multi-tabs
2. ✅ User authentication with secure JWT + refresh tokens
3. ✅ Collections and folders for organizing requests
4. ✅ Environment variables with resolution engine
5. ✅ Request history with search and replay
6. ✅ cURL import/export and Postman collection import
7. ✅ AI-powered test generation, debugging, and chat
8. ✅ Dark/light theme with premium design
9. ✅ Deployed and live on the internet

### What's Next (Post-Sprint)

| Priority | Feature | Effort |
|:---------|:--------|:-------|
| High | OAuth login (GitHub, Google) | 1 day |
| High | Collection Runner (run all requests sequentially) | 2 days |
| Medium | WebSocket testing | 2 days |
| Medium | Code snippet generation (JavaScript, Python, Go, etc.) | 1 day |
| Medium | Stripe billing integration | 2 days |
| Low | API monitoring (scheduled runs + alerts) | 3 days |
| Low | Team workspaces (collaboration) | 3 days |
| Low | Self-hosted LLM option (Ollama) | 1 day |

---

*End of 7-Day Sprint Guide. Good luck building! 🚀*
