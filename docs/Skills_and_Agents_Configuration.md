# Skills & Agents Configuration

## Ready-to-Use Files for Google Antigravity IDE

**Purpose:** Create these files in your project BEFORE Day 1. They give Claude persistent context so every prompt is shorter and more accurate.

---

## Table of Contents

1. [Skills Files (4 files)](#1-skills-files)
2. [AGENTS.md (1 file)](#2-agentsmd)
3. [Hooks (1 file)](#3-hooks)
4. [How to Create These Files](#4-how-to-create-these-files)

---

## 1. Skills Files

### Skill 1: `project-architecture.md`

**File Path:** `.agent/skills/project-architecture.md`  
**Purpose:** Core architecture knowledge — architecture, stack, response format, file locations

```markdown
# Project: AI-Powered API Testing Tool (ATX)

## Stack
- Monorepo: npm workspaces
- Frontend: apps/web — React 19, Vite 6, TypeScript strict
- Backend: apps/api — Express 5, TypeScript strict, Mongoose 8
- Shared types: packages/shared/src/types/
- Database: MongoDB Atlas (Mongoose ODM)
- Cache: Redis (Upstash — future)
- AI: OpenAI GPT-4o-mini via structured outputs (Zod + zodResponseFormat)

## Response Format (ALL endpoints)
Success: { success: true, data: { ... } }
Error: { success: false, error: { code: "ERROR_CODE", message: "Human message" } }

## Auth Architecture
- Access token: JWT, 15min, sent in Authorization: Bearer header
- Refresh token: JWT, 7 days, sent in HTTP-only secure cookie
- Password: bcrypt, 12 salt rounds
- Middleware: authenticate.ts verifies JWT, sets req.userId

## File Locations
- Backend modules: apps/api/src/modules/{name}/{name}.controller.ts, .service.ts, .routes.ts, .validation.ts
- Backend models: apps/api/src/models/{Name}.model.ts
- Backend middleware: apps/api/src/middleware/
- Frontend components: apps/web/src/components/{feature}/{ComponentName}.tsx + .module.css
- Frontend stores: apps/web/src/stores/{name}Store.ts
- Frontend services: apps/web/src/services/{name}.service.ts
- Frontend hooks: apps/web/src/hooks/use{Name}.ts
- CSS variables: apps/web/src/styles/variables.css
- Global styles: apps/web/src/styles/index.css

## Key Dependencies
- Frontend: zustand, @tanstack/react-query, axios, react-router-dom, lucide-react, sonner, @monaco-editor/react
- Backend: express, mongoose, zod, jsonwebtoken, bcryptjs, cors, helmet, cookie-parser, openai
```

---

### Skill 2: `backend-patterns.md`

**File Path:** `.agent/skills/backend-patterns.md`  
**Purpose:** Backend coding conventions — module pattern, validation, error handling

```markdown
# Backend Module Pattern

## Module Structure
Every module: {name}.controller.ts → {name}.service.ts → {name}.routes.ts → {name}.validation.ts

## Controller Rules (THIN)
- Parse request (req.body, req.params, req.query)
- Call service method with typed params (NEVER pass req/res to service)
- Return { success: true, data: result } or { success: false, error: { code, message } }
- Wrap in try-catch; pass errors to next()

## Service Rules (THICK)
- All business logic lives here
- Receives plain TypeScript params (not Express types)
- Returns plain data objects
- Throws errors with meaningful messages
- Interacts with Mongoose models

## Validation Rules
- Use Zod schemas for ALL request bodies
- Validate in controller before calling service
- Schema naming: {action}{Entity}Schema (e.g., createCollectionSchema)

## Route Rules
- Group by resource: router.post('/', validate(schema), authenticate, controller.create)
- Protected routes: apply authenticate middleware
- Register in app.ts: app.use('/api/{resource}', routes)

## Error Codes
- VALIDATION_ERROR: Invalid input
- AUTH_ERROR: Login/register failures
- UNAUTHORIZED: Missing/invalid token
- TOKEN_EXPIRED: Expired access token
- NOT_FOUND: Resource not found
- FORBIDDEN: Insufficient permissions
- INTERNAL_ERROR: Unexpected server error

## Mongoose Model Pattern
- Use interface I{Model} extending Document
- Use timestamps: true
- Set toJSON transform to remove __v and sensitive fields
- Create compound indexes for frequent queries
```

---

### Skill 3: `frontend-patterns.md`

**File Path:** `.agent/skills/frontend-patterns.md`  
**Purpose:** Frontend coding conventions — components, state, hooks

```markdown
# Frontend Component Pattern

## Component Structure
- PascalCase file: ComponentName.tsx
- Co-located CSS: ComponentName.module.css
- Named export: export const ComponentName: React.FC<Props>
- Props interface: interface ComponentNameProps { ... }

## State Management
- Client state (UI, tabs, panels): Zustand stores in src/stores/
- Server state (API data): TanStack Query via custom hooks in src/hooks/
- Store naming: use{Name}Store — e.g., useRequestStore, useAuthStore

## Zustand Store Pattern
```ts
import { create } from 'zustand';
interface XStore { /* state + actions */ }
export const useXStore = create<XStore>((set, get) => ({
  // state: initialValue,
  // action: () => set((state) => ({ ... })),
}));
```

## API Service Layer
- Base client: src/services/api.ts (axios instance with interceptors)
- Module services: src/services/{name}.service.ts
- Auto-attach Bearer token via request interceptor
- Auto-refresh on 401 via response interceptor

## CSS Module Rules
- Import: import styles from './Component.module.css'
- Use: className={styles.container}
- ALL colors, spacing, borders from CSS variables (NEVER hardcoded)
- NO Tailwind — CSS Modules + CSS Variables only
- Animations: use @keyframes in component CSS or animations.css

## Lucide Icons
- Import: import { IconName } from 'lucide-react'
- Props: size={16} for small, size={20} for default
- Use in buttons, sidebar items, status indicators
```

---

### Skill 4: `design-system.md`

**File Path:** `.agent/skills/design-system.md`  
**Purpose:** Complete design token reference — colors, spacing, method colors

```markdown
# Design System Reference

## Colors (Dark Theme Default)
- Primary: hsl(220, 90%, 56%) — buttons, links, focus rings
- Background: hsl(220, 20%, 10%) — app background
- Surface: hsl(220, 18%, 14%) — cards, panels
- Elevated: hsl(220, 16%, 18%) — dropdowns, modals
- Hover: hsl(220, 15%, 20%)
- Border: hsl(220, 15%, 22%)
- Text primary: hsl(0, 0%, 93%)
- Text secondary: hsl(220, 10%, 60%)
- Text tertiary: hsl(220, 10%, 45%)

## HTTP Method Colors
GET=#22c55e POST=#f97316 PUT=#3b82f6 PATCH=#a855f7 DELETE=#ef4444 HEAD=#06b6d4 OPTIONS=#6b7280

## Status Code Colors
2xx=success(green) 3xx=info(blue) 4xx=warning(orange) 5xx=error(red)

## Typography
- Sans: 'Inter', -apple-system, sans-serif
- Mono: 'JetBrains Mono', monospace
- Sizes: xs=11px sm=13px base=14px lg=16px xl=18px

## Spacing Scale
1=4px 2=8px 3=12px 4=16px 5=20px 6=24px 8=32px 10=40px

## Radius
sm=4px md=6px lg=8px xl=12px full=9999px

## Layout Dimensions
sidebar=280px topbar=48px statusbar=28px tab=36px ai-panel=360px

## Animation Durations
fast=100ms normal=200ms slow=300ms

## Use CSS variables ALWAYS:
var(--color-primary), var(--color-bg-surface), var(--space-4), var(--radius-lg), etc.
```

---

## 2. AGENTS.md

**File Path:** `AGENTS.md` (project root)  
**Purpose:** Universal rules for any AI agent — cross-tool compatible

```markdown
# Agent Instructions — AI-Powered API Testing Tool

## Rules (MANDATORY)
1. TypeScript strict mode in ALL files
2. CSS Modules + CSS Variables only — NO Tailwind CSS
3. Validate ALL request bodies with Zod schemas
4. Backend services NEVER access req/res — receive typed params only
5. ALL API responses: { success: boolean, data?: any, error?: { code: string, message: string } }
6. ALL colors/spacing/borders from CSS variables in variables.css
7. Components: self-contained with co-located .module.css files
8. Backend module pattern: controller (thin) → service (thick) → routes
9. Named exports only — no default exports for components
10. Use crypto.randomUUID() for client-side IDs

## Available Scripts
- npm run dev — Start frontend + backend
- npm run dev:web — Frontend only (port 5173)
- npm run dev:api — Backend only (port 8000)
- npm run lint — ESLint all files
- npm run type-check — TypeScript verification
- npm run test — Run Vitest

## Key Architecture Decisions
- Frontend state: Zustand (client) + TanStack Query (server)
- Auth: JWT access (15min) + refresh cookie (7 days)
- AI: OpenAI structured outputs with Zod schemas
- Executor: Server-side proxy (solves CORS) with SSRF guard
```

---

## 3. Hooks

### Post-Edit Hook (auto-runs after Claude edits any file)

**File Path:** `.agent/hooks/post-edit-lint.sh`

```bash
#!/bin/bash
# Runs after every file edit to catch errors early
FILE="$1"

# Only check TypeScript/JavaScript files
if [[ "$FILE" == *.ts || "$FILE" == *.tsx ]]; then
  echo "🔍 Type-checking..."
  npx tsc --noEmit --pretty 2>&1 | head -15
fi
```

---

## 4. How to Create These Files

### Step-by-Step Instructions

**Before starting Day 1, run these commands in your project root:**

```bash
# 1. Create the directory structure
mkdir -p .agent/skills
mkdir -p .agent/hooks

# 2. The Skills files, AGENTS.md, and hooks should be created
#    by copying the content from the sections above into the
#    following files:

# .agent/skills/project-architecture.md
# .agent/skills/backend-patterns.md
# .agent/skills/frontend-patterns.md
# .agent/skills/design-system.md
# AGENTS.md (project root)
# .agent/hooks/post-edit-lint.sh
```

**Quick Antigravity prompt to create all files at once:**

```
Create the following agent configuration files for our AI-Powered API Testing Tool project. Read the Skills_and_Agents_Configuration.md file in the project folder for the exact content of each file:

1. .agent/skills/project-architecture.md
2. .agent/skills/backend-patterns.md
3. .agent/skills/frontend-patterns.md
4. .agent/skills/design-system.md
5. AGENTS.md (project root)
6. .agent/hooks/post-edit-lint.sh

Copy the content exactly as specified in the configuration file.
```

### Verification

After creating these files, test them by asking Claude:

```
What is our project's response format for API endpoints?
What CSS variable should I use for the primary button color?
What is the file path pattern for a backend module called "collections"?
```

Claude should answer correctly without you providing any additional context — that's the Skills working.

---

*Next: Open the Day 1-2 Prompts file to start building.*
