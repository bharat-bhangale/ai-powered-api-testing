# ATX Desktop Application — UI/UX Design Brief

> **Version:** 1.0  
> **Date:** June 2026

---

## 1. Design Philosophy

### 1.1 Core Principles

1. **Pro-Tool Aesthetic**: Dark-mode-first, high-contrast, dense information layout — like VS Code, not like a consumer app
2. **Zero-Friction AI**: AI features are ambient, not modal — they appear contextually without interrupting workflow
3. **Information Density**: Show as much data as possible without clutter — collapsible panels, compact tables, micro-status indicators
4. **Speed Over Animation**: Prefer instant transitions over decorative animations — users are power-users
5. **Keyboard-First**: Every action reachable via keyboard — shortcuts visible on hover

### 1.2 Visual Identity

| Property | Value |
|:---------|:------|
| App Name | ATX Desktop |
| Tagline | "AI-Native API Testing" |
| Primary Brand Color | `#6366f1` (Indigo 500) |
| Accent Color | `#8b5cf6` (Violet 500) |
| Success | `#10b981` (Emerald) |
| Warning | `#f59e0b` (Amber) |
| Danger | `#ef4444` (Red) |
| Font — UI | Inter (Google Fonts) |
| Font — Code | JetBrains Mono |
| Icon Set | Lucide React (existing) |
| Corner Radius | 4px (small), 8px (medium), 12px (large) |

---

## 2. Design System (Existing — CSS Modules)

### 2.1 Color Tokens (Dark Theme — Primary)

```css
:root[data-theme="dark"] {
  /* Backgrounds */
  --color-bg-app: #0f1117;           /* Main app background */
  --color-bg-surface: #161822;       /* Cards, panels */
  --color-bg-elevated: #1c1f2e;      /* Modals, dropdowns */
  --color-bg-input: #232637;         /* Input fields */
  --color-bg-hover: #2a2d3e;         /* Hover states */
  
  /* Text */
  --color-text-primary: #e2e8f0;     /* Primary text */
  --color-text-secondary: #94a3b8;   /* Secondary/label text */
  --color-text-tertiary: #64748b;    /* Muted/placeholder text */
  
  /* Borders */
  --color-border: #2d3148;           /* Default borders */
  --color-border-active: #4f46e5;    /* Focused/active borders */
  
  /* Interactive */
  --color-primary: #6366f1;          /* Buttons, links, active states */
  --color-primary-hover: #818cf8;    /* Primary hover */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
}
```

### 2.2 Typography Scale

```css
--text-xs: 0.6875rem;    /* 11px — badges, micro-labels */
--text-sm: 0.8125rem;    /* 13px — secondary text, table data */
--text-base: 0.875rem;   /* 14px — body text (dense UI) */
--text-lg: 1rem;         /* 16px — section headers */
--text-xl: 1.25rem;      /* 20px — page titles */
--text-2xl: 1.5rem;      /* 24px — dashboard numbers */
```

### 2.3 Spacing Scale

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
```

---

## 3. Layout Specifications

### 3.1 Main Application Layout

```
┌─ Title Bar (32px) ──────────────────────────────────────┐
│  ATX icon + "ATX Desktop"  │  [─] [□] [✕]               │
├─ Menu Bar (28px, optional — hide for more space) ───────┤
│  File  Edit  View  Collection  Run  AI  Help             │
├───────┬─────────────────────────────────────┬───────────┤
│       │  Tab Bar (36px)                     │           │
│ Side- │  [GET /users ✕] [POST /auth ✕] [+] │ AI Chat   │
│ bar   ├─────────────────────────────────────┤ Panel     │
│       │                                     │           │
│ 260px │        Work Area                    │ 320px     │
│ (re-  │        (flexible)                   │ (col-     │
│ siz-  │                                     │ laps-     │
│ able) │                                     │ ible)     │
│       │                                     │           │
├───────┴─────────────────────────────────────┴───────────┤
│  Status Bar (24px)                                       │
│  [ENV: Production ▼] │ Ready │ 0 requests │ v1.0.0      │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Panel Dimensions

| Panel | Default Width/Height | Min | Max | Resizable |
|:------|:--------------------|:----|:----|:----------|
| Sidebar | 260px | 200px | 400px | Yes (drag edge) |
| AI Chat Panel | 320px | 280px | 500px | Yes (drag edge) |
| Request Panel | 50% of work area height | 200px | — | Yes (drag divider) |
| Response Panel | 50% of work area height | 200px | — | Yes (drag divider) |
| Tab Bar | 36px | — | — | No |
| Status Bar | 24px | — | — | No |

### 3.3 Custom Title Bar (Electron)

```
┌──────────────────────────────────────────────────────┐
│ ⚡ ATX Desktop          File  Edit  View  ...  [─][□][✕]│
└──────────────────────────────────────────────────────┘

- Custom drawn (frameless window)
- Draggable area for window moving
- Integrated menu items (macOS: system menu, Windows/Linux: custom)
- App icon + name on left
- Window controls on right (platform-specific style)
```

---

## 4. Component Design Specifications

### 4.1 Request Builder

```
┌─────────────────────────────────────────────────────┐
│  [GET ▼]  [https://api.example.com/users    ] [Send]│
│                                                      │
│  [Params] [Headers(3)] [Body] [Auth] [Pre-Req] [Tests]│
│  ─────────────────────────────────────────────────── │
│  │ Key              │ Value           │ Desc │ ☑ │  │
│  │ page             │ 1               │      │ ☑ │  │
│  │ limit            │ 20              │      │ ☑ │  │
│  │ [Add parameter]  │                 │      │   │  │
│  └──────────────────┴─────────────────┴──────┴───┘  │
└─────────────────────────────────────────────────────┘

Method Selector Colors:
  GET     → #10b981 (green)
  POST    → #3b82f6 (blue)
  PUT     → #f59e0b (amber)
  PATCH   → #8b5cf6 (violet)
  DELETE  → #ef4444 (red)
  OPTIONS → #6b7280 (gray)
  HEAD    → #6b7280 (gray)

Send Button:
  - Default: Indigo background, white text
  - Loading: Spinner icon, disabled state
  - Shortcut hint: "Ctrl+Enter" shown on hover
```

### 4.2 Response Viewer

```
┌─────────────────────────────────────────────────────┐
│  [200 OK] [245ms] [1.2 KB]              [AI ✨] [Copy]│
│                                                      │
│  [Body] [Headers(12)] [Cookies(2)] [Timeline] [Tests]│
│  ─────────────────────────────────────────────────── │
│  {                                                   │
│    "users": [                                        │
│      {                                               │
│        "id": 1,                                      │
│        "name": "Deepak Kumar",                       │
│        "email": "deepak@example.com"                 │
│      }                                               │
│    ],                                                │
│    "total": 42                                       │
│  }                                                   │
│                                                      │
│  [Pretty] [Raw] [Preview] [Wrap ☐]                   │
└─────────────────────────────────────────────────────┘

Status Badge Colors:
  2xx → Green (#10b981)
  3xx → Blue (#3b82f6)
  4xx → Amber (#f59e0b)
  5xx → Red (#ef4444)
  Error → Red with icon

AI Quick Actions (floating buttons):
  ✨ Generate Tests  → Triggers AI test generation
  🐛 Debug This     → Opens AI chat with error context (only on 4xx/5xx)
  📋 Copy Response  → Copy body to clipboard
```

### 4.3 Sidebar

```
Width: 260px (resizable)
Background: var(--color-bg-surface)

Sections (tabs at top):
┌───────────────────────────────────┐
│ [📁 Collections] [⏱ History] [📊 Dashboard] │
├───────────────────────────────────┤
│                                   │
│  [+ New] [Import ↓]              │
│                                   │
│  📁 User API                     │
│    ├── 📂 Auth                   │
│    │   ├── POST Login            │
│    │   └── POST Register         │
│    ├── GET List Users            │
│    ├── POST Create User          │
│    └── DELETE Delete User        │
│                                   │
│  📁 Product API                  │
│    ├── GET Products              │
│    └── GET Product by ID         │
│                                   │
│  ─── Footer ────────────────     │
│  👤 Bharat    [⚙] [🚪]          │
└───────────────────────────────────┘

Tree Item Design:
  - Indent: 16px per level
  - Icon: Lucide icon (Folder, FileText)
  - Method badge: Colored (e.g., GET = green, POST = blue)
  - Hover: background highlight
  - Active: left border accent + stronger highlight
  - Context menu on right-click
  - Drag handle appears on hover
```

### 4.4 AI Chat Panel

```
Width: 320px (collapsible, resizable)
Background: var(--color-bg-surface)

┌───────────────────────────────────┐
│  🤖 AI Assistant            [✕]  │
│  Context: GET /users              │
├───────────────────────────────────┤
│                                   │
│  ┌─ AI ──────────────────────┐   │
│  │ I see your GET /users     │   │
│  │ returns a 401 error.      │   │
│  │                           │   │
│  │ The issue is that your    │   │
│  │ Bearer token has expired. │   │
│  │                           │   │
│  │ ```javascript             │   │
│  │ // Fix: refresh token     │   │
│  │ const token = await       │   │
│  │   refreshToken();         │   │
│  │ ```                       │   │
│  │                           │   │
│  │ [Apply Fix]               │   │
│  └───────────────────────────┘   │
│                                   │
│  ┌─ You ─────────────────────┐   │
│  │ Why is this 401?          │   │
│  └───────────────────────────┘   │
│                                   │
├───────────────────────────────────┤
│  [Type a message...]        [↑]  │
│  [Ctrl+Shift+A to toggle]        │
└───────────────────────────────────┘

Message Styling:
  AI messages: bg-surface, left-aligned, avatar icon
  User messages: bg-primary/10, right-aligned
  Code blocks: dark background, copy button, syntax highlighting
  Streaming: cursor animation while tokens arrive
```

### 4.5 Dashboard Widgets

```
Pass Rate Gauge:
  - Circular SVG ring (140x140)
  - Color: green (≥80%), amber (≥50%), red (<50%)
  - Center: percentage number (bold, 2xl)
  - Below: "X passed / Y failed"

Trend Chart:
  - Stacked bar chart (30 bars = 30 days)
  - Green segments: passed tests
  - Red segments: failed tests
  - Hover tooltip: date + counts

Slowest Endpoints:
  - Horizontal bar chart
  - Method badge + URL label
  - Gradient fill bar with ms value
  - Max 5 endpoints

Collection Health Cards:
  - Grid layout (auto-fill, min 200px)
  - Each card: name, pass rate (colored), test count, last run time
  - Hover: slight border glow
```

---

## 5. Desktop-Specific UI Elements

### 5.1 Native Menu Bar

```
File
  ├── New Request          Ctrl+N
  ├── New Collection       Ctrl+Shift+N
  ├── ─────────────
  ├── Import Collection    Ctrl+I
  ├── Export Collection    Ctrl+E
  ├── ─────────────
  ├── Save Request         Ctrl+S
  ├── Save As...           Ctrl+Shift+S
  ├── ─────────────
  ├── Settings             Ctrl+,
  └── Exit                 Ctrl+Q

Edit
  ├── Undo                 Ctrl+Z
  ├── Redo                 Ctrl+Shift+Z
  ├── ─────────────
  ├── Cut                  Ctrl+X
  ├── Copy                 Ctrl+C
  ├── Paste                Ctrl+V
  └── Select All           Ctrl+A

View
  ├── Toggle Sidebar       Ctrl+B
  ├── Toggle AI Panel      Ctrl+Shift+A
  ├── Toggle Status Bar
  ├── ─────────────
  ├── Zoom In              Ctrl++
  ├── Zoom Out             Ctrl+-
  ├── Reset Zoom           Ctrl+0
  ├── ─────────────
  ├── Full Screen          F11
  └── Toggle DevTools      Ctrl+Shift+I

Collection
  ├── Run Collection       Ctrl+Shift+R
  ├── Run with Environment...
  ├── ─────────────
  ├── Generate Test Suite  (AI)
  ├── Analyze Coverage     (AI)
  └── Generate API Docs    (AI)

Run
  ├── Send Request         Ctrl+Enter
  ├── Resend Last          F5
  ├── ─────────────
  ├── Run Tests            Ctrl+Shift+T
  └── Cancel Request       Escape

AI
  ├── Generate Tests       Ctrl+Shift+G
  ├── Debug Response       Ctrl+Shift+D
  ├── Open AI Chat         Ctrl+Shift+A
  └── ─────────────
      AI Settings...

Help
  ├── Keyboard Shortcuts   Ctrl+/
  ├── Documentation
  ├── Report Bug
  ├── ─────────────
  ├── Check for Updates
  └── About ATX Desktop
```

### 5.2 System Tray

```
Right-click tray icon:
  ├── Open ATX Desktop
  ├── ─────────────
  ├── Quick Request...
  ├── ─────────────
  ├── Scheduled Runs: 3 active
  ├── Last Run: 2m ago ✅
  ├── ─────────────
  └── Quit

Tray icon states:
  - Default: ATX logo (normal)
  - Running: ATX logo with green dot
  - Failed: ATX logo with red dot
  - Update available: ATX logo with blue badge
```

### 5.3 Settings Modal

```
Full-screen modal with sidebar navigation:

┌─────────────────────────────────────────────────┐
│  ⚙ Settings                              [✕]   │
├────────────┬────────────────────────────────────┤
│            │                                    │
│  General   │  Theme                             │
│  AI        │  ○ Dark  ● Light  ○ System         │
│  Proxy     │                                    │
│  Certs     │  Font Size                         │
│  Data      │  [──────●──────] 14px              │
│  About     │                                    │
│            │  Auto-save requests                │
│            │  [ON ●━━━━━━━━]                    │
│            │                                    │
│            │  Minimize to tray on close         │
│            │  [━━━━━━━● OFF]                    │
│            │                                    │
└────────────┴────────────────────────────────────┘
```

---

## 6. Micro-Interactions & Animations

| Interaction | Animation | Duration |
|:------------|:----------|:---------|
| Tab open/close | Slide in/fade out | 150ms |
| Panel collapse/expand | Width/height transition | 200ms |
| Response appear | Fade in from top | 100ms |
| Toast notification | Slide in from right | 200ms |
| Loading spinner | Rotate 360° | 1s linear infinite |
| AI streaming text | Character-by-character | 20ms per token |
| Hover highlight | Background color fade | 100ms |
| Button click | Scale 0.97 → 1.0 | 80ms |
| Modal open | Fade + scale 0.95 → 1.0 | 150ms |
| Drag reorder | Translate with ghost preview | Real-time |

---

## 7. Responsive Behavior

The desktop app has a **minimum window size** of `1024 × 600`.

| Window Width | Layout Change |
|:-------------|:-------------|
| ≥ 1440px | Full layout: sidebar + work area + AI panel |
| 1024–1440px | AI panel auto-collapsed, expandable on click |
| < 1024px | Not supported (minimum enforced) |

---

## 8. Accessibility Specifications

| Requirement | Implementation |
|:------------|:--------------|
| Keyboard navigation | Tab order follows visual flow, focus rings visible |
| Screen reader | ARIA labels on all interactive elements |
| Color contrast | Minimum 4.5:1 for text, 3:1 for large text |
| Focus indicators | 2px solid var(--color-primary) outline |
| Reduced motion | Respect `prefers-reduced-motion` media query |
| Font scaling | Support up to 150% zoom without layout break |
| High contrast | Works with Windows High Contrast Mode |
