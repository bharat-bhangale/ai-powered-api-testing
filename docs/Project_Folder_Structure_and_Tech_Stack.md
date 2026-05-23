# Complete Project Folder Structure & Tech Stack Report

## AI-Powered API Testing Tool — Industry-Ready Architecture

**Author:** Bharat Bhangale  
**Date:** May 23, 2026  
**Purpose:** Definitive folder structure with agent configuration, latest tech stack, and industry-standard patterns  
**Research Sources:** Express.js docs, React 19 docs, Vite 6 docs, Mongoose 9 docs, TanStack Query v5, Zustand v5, OpenAI Structured Outputs, Google Antigravity agent standards

---

## Table of Contents

1. [Latest Tech Stack (May 2026)](#1-latest-tech-stack-may-2026)
2. [Complete Folder Structure (Visual Tree)](#2-complete-folder-structure)
3. [Root-Level Configuration Files](#3-root-level-configuration-files)
4. [Agent Configuration (.agents/)](#4-agent-configuration)
5. [Frontend Structure (apps/web/)](#5-frontend-structure)
6. [Backend Structure (apps/api/)](#6-backend-structure)
7. [Shared Packages (packages/)](#7-shared-packages)
8. [Tooling Configuration (tooling/)](#8-tooling-configuration)
9. [File-by-File Explanation](#9-file-by-file-explanation)
10. [Architecture Decision Records](#10-architecture-decision-records)
11. [Tech Stack Version Compatibility Matrix](#11-version-compatibility-matrix)

---

## 1. Latest Tech Stack (May 2026)

### Verified Production Versions

| Layer | Technology | Version | Release Date | Why This Version |
|:------|:-----------|:--------|:-------------|:-----------------|
| **Runtime** | Node.js | **22.x LTS** | Active LTS | Required by MongoDB Driver 7.x; Node 18 is EOL |
| **Package Manager** | npm | **10.x** | Built into Node 22 | Native workspaces; no extra tooling needed |
| **Monorepo** | npm workspaces | Native | — | Zero config; Turborepo optional for CI caching |
| **Frontend Framework** | React | **19.x** | Dec 2024 | Actions, useActionState, useOptimistic, React Compiler |
| **Build Tool** | Vite | **6.x** | Dec 2025 | Environment API, Rolldown support, fastest DX |
| **Backend Framework** | Express | **5.x** | Oct 2024 | Async error handling, modernized routing, secure path-to-regexp v8 |
| **Database ODM** | Mongoose | **8.x** | Stable | Aligned with MongoDB Driver 6.x; widely production-tested |
| **Database** | MongoDB Atlas | **7.0+** | — | Free M0 tier; serverless option available |
| **Client State** | Zustand | **5.x** | 2025 | No providers, selective subscriptions, <2KB |
| **Server State** | TanStack Query | **5.x** | 2024 | Background refetching, optimistic updates, cache |
| **Validation** | Zod | **3.x** | Stable | Runtime + static types, zodResponseFormat for OpenAI |
| **AI Provider** | OpenAI SDK | **4.x** | 2025 | Structured outputs with `beta.chat.completions.parse` |
| **Styling** | CSS Modules + CSS Variables | Native | — | Zero-dependency, scoped, design-token driven |
| **Icons** | Lucide React | **0.4x** | Rolling | Tree-shakeable, consistent, Figma-aligned |
| **Code Editor** | Monaco Editor React | **4.x** | Stable | VS Code engine, LSP support, JSON schema validation |
| **Notifications** | Sonner | **1.x** | Stable | Lightweight toast, theme-aware, accessible |
| **Routing** | React Router | **7.x** | 2025 | Framework mode, type-safe routes, RSC-ready |
| **Auth (JWT)** | jsonwebtoken | **9.x** | Stable | RSA/ECDSA support, modern defaults |
| **Password** | bcryptjs | **3.x** | Stable | Pure JS, no native build step |
| **Testing** | Vitest | **3.x** | 2026 | Vite-native, workspace mode, ESM-first |
| **E2E Testing** | Playwright | **1.4x** | Rolling | Cross-browser, CI-friendly, auto-waiting |
| **Linting** | ESLint | **9.x** | 2024 | Flat config, faster, modern plugins |
| **Formatting** | Prettier | **3.x** | Stable | Consistent code formatting |
| **Git Hooks** | Husky | **9.x** | 2024 | Pre-commit quality gates |
| **HTTP Client (BE)** | undici | **7.x** | Built into Node 22 | Node's native HTTP client; faster than axios on server |
| **HTTP Client (FE)** | axios | **1.x** | Stable | Interceptors, request/response transforms |

### Why These Choices?

```
React 19 over Next.js → We need a pure SPA (no SSR). Our API testing tool runs entirely
                         in the browser. Next.js adds SSR complexity we don't need.

Express 5 over Hono/Fastify → Express has the largest middleware ecosystem. Express 5
                               adds async error handling (our #1 pain point with v4).

Mongoose 8 over Prisma → Mongoose's schema flexibility is essential for our dynamic
                          request/response storage. Prisma's strict schema would fight
                          against storing arbitrary API response bodies.

CSS Modules over Tailwind → Component-level scoping without build dependencies.
                             CSS Variables give us theme switching for free.

Zustand over Redux → 10x less boilerplate. No providers. Perfect for UI state
                     like tabs, panels, theme. TanStack Query handles API data.

undici over axios (backend) → undici is Node's native HTTP client (built into Node 22).
                               Faster, lower memory, better for our executor proxy.

axios (frontend only) → We need request/response interceptors for JWT auto-refresh.
                         undici doesn't work in browsers.
```

---

## 2. Complete Folder Structure

```
api-testing-tool/
│
├── 📂 .agents/                          ← AGENT CONFIGURATION (Antigravity)
│   ├── 📂 skills/                       ← Persistent knowledge modules
│   │   ├── 📂 project-architecture/
│   │   │   └── SKILL.md                 ← Stack, conventions, file paths
│   │   ├── 📂 backend-module/
│   │   │   ├── SKILL.md                 ← Backend module creation pattern
│   │   │   └── references/
│   │   │       └── module-template.md   ← Controller/Service/Route template
│   │   ├── 📂 frontend-component/
│   │   │   ├── SKILL.md                 ← React component creation pattern
│   │   │   └── references/
│   │   │       └── component-template.md
│   │   ├── 📂 design-system/
│   │   │   └── SKILL.md                 ← Color tokens, spacing, typography
│   │   ├── 📂 database-schema/
│   │   │   └── SKILL.md                 ← Mongoose model patterns, indexes
│   │   └── 📂 ai-integration/
│   │       ├── SKILL.md                 ← LLM Gateway, structured outputs
│   │       └── references/
│   │           └── prompt-templates.md
│   ├── 📂 workflows/                    ← Custom slash commands
│   │   ├── new-feature.md               ← /new-feature → scaffolds full module
│   │   └── debug-session.md             ← /debug → structured debugging flow
│   └── 📂 hooks/                        ← Lifecycle hooks
│       ├── post-edit-lint.json          ← Auto-lint after file edits
│       └── pre-commit-check.json        ← Quality gates before commits
│
├── 📂 apps/                             ← DEPLOYABLE APPLICATIONS
│   │
│   ├── 📂 web/                          ← FRONTEND (React 19 + Vite 6)
│   │   ├── 📂 public/
│   │   │   ├── favicon.svg
│   │   │   └── robots.txt
│   │   ├── 📂 src/
│   │   │   ├── 📂 components/           ← Shared/global components
│   │   │   │   ├── 📂 common/           ← Reusable primitives
│   │   │   │   │   ├── 📂 KeyValueEditor/
│   │   │   │   │   │   ├── KeyValueEditor.tsx
│   │   │   │   │   │   └── KeyValueEditor.module.css
│   │   │   │   │   ├── 📂 VariableInput/
│   │   │   │   │   │   ├── VariableInput.tsx
│   │   │   │   │   │   └── VariableInput.module.css
│   │   │   │   │   ├── 📂 Modal/
│   │   │   │   │   │   ├── Modal.tsx
│   │   │   │   │   │   └── Modal.module.css
│   │   │   │   │   ├── 📂 Skeleton/
│   │   │   │   │   │   └── Skeleton.tsx
│   │   │   │   │   └── 📂 ThemeSwitcher/
│   │   │   │   │       ├── ThemeSwitcher.tsx
│   │   │   │   │       └── ThemeSwitcher.module.css
│   │   │   │   ├── 📂 layout/           ← App shell components
│   │   │   │   │   ├── AppLayout.tsx
│   │   │   │   │   ├── AppLayout.module.css
│   │   │   │   │   ├── TopBar.tsx
│   │   │   │   │   ├── StatusBar.tsx
│   │   │   │   │   └── StatusBar.module.css
│   │   │   │   ├── 📂 request-builder/  ← Core: request composition
│   │   │   │   │   ├── RequestBuilder.tsx
│   │   │   │   │   ├── RequestBuilder.module.css
│   │   │   │   │   ├── MethodSelector.tsx
│   │   │   │   │   ├── MethodSelector.module.css
│   │   │   │   │   ├── UrlBar.tsx
│   │   │   │   │   ├── UrlBar.module.css
│   │   │   │   │   ├── RequestTabs.tsx
│   │   │   │   │   ├── RequestTabs.module.css
│   │   │   │   │   ├── RequestPanel.tsx
│   │   │   │   │   ├── BodyEditor.tsx
│   │   │   │   │   ├── BodyEditor.module.css
│   │   │   │   │   └── AuthConfig.tsx
│   │   │   │   ├── 📂 response-viewer/  ← Core: response display
│   │   │   │   │   ├── ResponseViewer.tsx
│   │   │   │   │   ├── ResponseViewer.module.css
│   │   │   │   │   ├── ResponseMeta.tsx
│   │   │   │   │   ├── ResponseBody.tsx
│   │   │   │   │   └── ResponseHeaders.tsx
│   │   │   │   ├── 📂 sidebar/          ← Collection tree navigation
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   ├── Sidebar.module.css
│   │   │   │   │   ├── CollectionTree.tsx
│   │   │   │   │   ├── CollectionItem.tsx
│   │   │   │   │   ├── RequestItem.tsx
│   │   │   │   │   └── CreateCollectionModal.tsx
│   │   │   │   ├── 📂 environment/      ← Environment management
│   │   │   │   │   ├── EnvSelector.tsx
│   │   │   │   │   ├── EnvSelector.module.css
│   │   │   │   │   └── EnvManagerModal.tsx
│   │   │   │   ├── 📂 history/          ← Request history
│   │   │   │   │   ├── HistoryPanel.tsx
│   │   │   │   │   ├── HistoryPanel.module.css
│   │   │   │   │   └── HistoryList.tsx
│   │   │   │   ├── 📂 import/           ← Import/export tools
│   │   │   │   │   └── ImportModal.tsx
│   │   │   │   └── 📂 ai/              ← AI-powered features
│   │   │   │       ├── AIChatPanel.tsx
│   │   │   │       ├── AIChatPanel.module.css
│   │   │   │       ├── AITestSuggestions.tsx
│   │   │   │       ├── AIDebugPanel.tsx
│   │   │   │       └── AIUsageIndicator.tsx
│   │   │   ├── 📂 hooks/               ← Custom React hooks
│   │   │   │   ├── useTheme.ts
│   │   │   │   ├── useKeyboardShortcuts.ts
│   │   │   │   └── useDebounce.ts
│   │   │   ├── 📂 pages/               ← Route-level page components
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── LoginPage.module.css
│   │   │   │   ├── RegisterPage.tsx
│   │   │   │   └── MainApp.tsx
│   │   │   ├── 📂 services/            ← API client layer
│   │   │   │   ├── api.ts              ← Axios instance + interceptors
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── collection.service.ts
│   │   │   │   ├── environment.service.ts
│   │   │   │   ├── executor.service.ts
│   │   │   │   ├── history.service.ts
│   │   │   │   └── ai.service.ts
│   │   │   ├── 📂 stores/              ← Zustand client state
│   │   │   │   ├── authStore.ts
│   │   │   │   ├── requestStore.ts
│   │   │   │   ├── collectionStore.ts
│   │   │   │   ├── environmentStore.ts
│   │   │   │   ├── historyStore.ts
│   │   │   │   └── aiStore.ts
│   │   │   ├── 📂 styles/              ← Design system
│   │   │   │   ├── variables.css       ← All CSS custom properties
│   │   │   │   ├── index.css           ← CSS reset + global styles
│   │   │   │   └── animations.css      ← Keyframes + utility animations
│   │   │   ├── 📂 utils/               ← Pure utility functions
│   │   │   │   ├── curl-parser.ts
│   │   │   │   ├── curl-generator.ts
│   │   │   │   ├── format.ts           ← Size formatter, time formatter
│   │   │   │   └── constants.ts        ← HTTP methods, status codes
│   │   │   ├── 📂 app/                 ← App shell + routing
│   │   │   │   ├── App.tsx
│   │   │   │   ├── router.tsx
│   │   │   │   └── ErrorBoundary.tsx
│   │   │   ├── main.tsx                ← Entry point
│   │   │   └── vite-env.d.ts           ← Vite type declarations
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json               ← Extends tooling/tsconfig/react.json
│   │   ├── tsconfig.node.json
│   │   ├── package.json
│   │   └── .env.example
│   │
│   └── 📂 api/                          ← BACKEND (Express 5 + TypeScript)
│       ├── 📂 src/
│       │   ├── 📂 config/              ← App configuration
│       │   │   ├── database.ts         ← MongoDB connection
│       │   │   ├── env.ts              ← Environment variable validation (Zod)
│       │   │   └── cors.ts             ← CORS configuration
│       │   ├── 📂 middleware/           ← Express middleware
│       │   │   ├── authenticate.ts     ← JWT verification
│       │   │   ├── validate.ts         ← Zod schema validation middleware
│       │   │   ├── rateLimiter.ts      ← Rate limiting
│       │   │   └── errorHandler.ts     ← Centralized error handling
│       │   ├── 📂 models/              ← Mongoose schemas
│       │   │   ├── User.model.ts
│       │   │   ├── Collection.model.ts
│       │   │   ├── Request.model.ts
│       │   │   ├── Environment.model.ts
│       │   │   └── History.model.ts
│       │   ├── 📂 modules/             ← Feature modules (controller → service → routes)
│       │   │   ├── 📂 auth/
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── auth.routes.ts
│       │   │   │   ├── auth.validation.ts   ← Zod schemas
│       │   │   │   └── 📂 __tests__/
│       │   │   │       └── auth.service.test.ts
│       │   │   ├── 📂 executor/
│       │   │   │   ├── executor.controller.ts
│       │   │   │   ├── executor.service.ts
│       │   │   │   ├── executor.routes.ts
│       │   │   │   ├── variable-resolver.ts
│       │   │   │   ├── auth-resolver.ts
│       │   │   │   └── 📂 __tests__/
│       │   │   │       └── variable-resolver.test.ts
│       │   │   ├── 📂 collections/
│       │   │   │   ├── collection.controller.ts
│       │   │   │   ├── collection.service.ts
│       │   │   │   ├── collection.routes.ts
│       │   │   │   └── collection.validation.ts
│       │   │   ├── 📂 requests/
│       │   │   │   ├── request.controller.ts
│       │   │   │   ├── request.service.ts
│       │   │   │   ├── request.routes.ts
│       │   │   │   └── request.validation.ts
│       │   │   ├── 📂 environments/
│       │   │   │   ├── environment.controller.ts
│       │   │   │   ├── environment.service.ts
│       │   │   │   ├── environment.routes.ts
│       │   │   │   └── environment.validation.ts
│       │   │   ├── 📂 history/
│       │   │   │   ├── history.controller.ts
│       │   │   │   ├── history.service.ts
│       │   │   │   └── history.routes.ts
│       │   │   ├── 📂 import/
│       │   │   │   ├── import.controller.ts
│       │   │   │   ├── import.routes.ts
│       │   │   │   └── 📂 parsers/
│       │   │   │       └── postman.parser.ts
│       │   │   └── 📂 ai/
│       │   │       ├── ai.controller.ts
│       │   │       ├── ai.routes.ts
│       │   │       ├── llm-gateway.ts
│       │   │       ├── 📂 features/
│       │   │       │   ├── chat.service.ts
│       │   │       │   ├── test-generator.service.ts
│       │   │       │   └── debug-assistant.service.ts
│       │   │       ├── 📂 prompts/
│       │   │       │   ├── test-generation.prompt.ts
│       │   │       │   └── debug-analysis.prompt.ts
│       │   │       └── 📂 utils/
│       │   │           └── usage-tracker.ts
│       │   ├── 📂 utils/               ← Shared utilities
│       │   │   ├── ssrf-guard.ts
│       │   │   ├── logger.ts           ← Structured logging (pino)
│       │   │   └── crypto.ts           ← AES-256-GCM for secret variables
│       │   ├── app.ts                  ← Express app setup
│       │   └── server.ts               ← Entry point (connect DB, listen)
│       ├── tsconfig.json               ← Extends tooling/tsconfig/node.json
│       ├── nodemon.json
│       ├── package.json
│       ├── .env.example
│       └── Dockerfile                  ← Production container
│
├── 📂 packages/                         ← SHARED INTERNAL PACKAGES
│   │
│   ├── 📂 shared/                       ← Shared TypeScript types + Zod schemas
│   │   ├── 📂 src/
│   │   │   ├── 📂 types/
│   │   │   │   ├── request.types.ts    ← HttpMethod, RequestConfig, KeyValuePair
│   │   │   │   ├── response.types.ts   ← ResponseData, ExecutionResult
│   │   │   │   ├── auth.types.ts       ← User, AuthTokens
│   │   │   │   ├── collection.types.ts ← Collection, SavedRequest
│   │   │   │   ├── environment.types.ts← Environment, Variable
│   │   │   │   ├── ai.types.ts         ← TestSuite, DebugAnalysis
│   │   │   │   └── api.types.ts        ← ApiResponse<T>, ApiError
│   │   │   ├── 📂 schemas/            ← Shared Zod validation schemas
│   │   │   │   ├── request.schema.ts
│   │   │   │   ├── auth.schema.ts
│   │   │   │   └── collection.schema.ts
│   │   │   └── index.ts               ← Barrel export
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── 📂 utils/                        ← Shared utility functions
│       ├── 📂 src/
│       │   ├── format.ts               ← formatBytes, formatDuration
│       │   ├── http-methods.ts         ← METHOD_COLORS, STATUS_RANGES
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── 📂 tooling/                          ← SHARED CONFIGURATION
│   ├── 📂 tsconfig/
│   │   ├── base.json                   ← Base TypeScript config
│   │   ├── react.json                  ← Frontend TypeScript config
│   │   └── node.json                   ← Backend TypeScript config
│   ├── 📂 eslint-config/
│   │   ├── base.mjs                    ← ESLint flat config base
│   │   ├── react.mjs                   ← React-specific rules
│   │   └── node.mjs                    ← Node.js-specific rules
│   └── 📂 prettier-config/
│       └── index.mjs                   ← Shared Prettier configuration
│
├── 📂 docs/                             ← PROJECT DOCUMENTATION
│   ├── API.md                          ← API endpoint reference
│   ├── ARCHITECTURE.md                 ← Architecture decision records
│   └── DEPLOYMENT.md                   ← Deployment runbook
│
├── AGENTS.md                            ← AGENT RULES (cross-tool compatible)
├── GEMINI.md                            ← Symlink to AGENTS.md (Antigravity override)
├── package.json                         ← Root workspace config
├── turbo.json                           ← (Optional) Turborepo pipeline config
├── .gitignore
├── .nvmrc                               ← Node version (22)
├── .prettierrc                          ← Link to tooling config
├── eslint.config.mjs                    ← Root ESLint (extends tooling)
├── README.md
└── LICENSE
```

---

## 3. Root-Level Configuration Files

### `package.json` (Root)

```json
{
  "name": "api-testing-tool",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*",
    "tooling/*"
  ],
  "scripts": {
    "dev": "concurrently -n web,api -c cyan,green \"npm run dev -w apps/web\" \"npm run dev -w apps/api\"",
    "dev:web": "npm run dev -w apps/web",
    "dev:api": "npm run dev -w apps/api",
    "build": "npm run build -w apps/web && npm run build -w apps/api",
    "build:web": "npm run build -w apps/web",
    "build:api": "npm run build -w apps/api",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc -b",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepare": "husky"
  },
  "devDependencies": {
    "concurrently": "^9.1.0",
    "husky": "^9.1.0",
    "lint-staged": "^15.3.0",
    "prettier": "^3.4.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  },
  "engines": {
    "node": ">=22.0.0"
  }
}
```

### `.nvmrc`

```
22
```

### `.gitignore`

```
node_modules/
dist/
.env
.env.local
.env.*.local
*.log
.DS_Store
.turbo/
coverage/
.vite/
```

---

## 4. Agent Configuration

### Directory: `.agents/`

This directory configures Google Antigravity's agentic system. The agent reads these files automatically at the start of every session.

### 4.1 Skill Structure Pattern

Each skill follows this standard:

```
.agents/skills/{skill-name}/
├── SKILL.md          ← Required: YAML frontmatter + instructions
├── references/       ← Optional: detailed schemas, templates
│   └── {name}.md
└── scripts/          ← Optional: executable automation scripts
    └── {name}.sh
```

### 4.2 SKILL.md Format

```yaml
---
name: backend-module
description: "Use when creating a new backend API module (controller, service, routes, validation). Applies to Express 5 + TypeScript + Mongoose."
---

# Backend Module Creation

## When to Use
- Creating a new API endpoint or feature module
- Adding CRUD operations for a new resource

## Module Pattern
[...detailed instructions follow...]
```

> **Key insight from research:** The `description` field is the most important part — it acts as a **search query** for the agent. Be specific about *when* to use the skill.

### 4.3 Workflows (Custom Slash Commands)

**`.agents/workflows/new-feature.md`** — Invoked via `/new-feature {name}`

```markdown
# New Feature Workflow

When the user says "/new-feature {name}", execute this workflow:

1. Create backend module at `apps/api/src/modules/{name}/`:
   - {name}.controller.ts
   - {name}.service.ts
   - {name}.routes.ts
   - {name}.validation.ts
   - __tests__/{name}.service.test.ts

2. Create Mongoose model at `apps/api/src/models/{Name}.model.ts`

3. Register routes in `apps/api/src/app.ts`

4. Create frontend service at `apps/web/src/services/{name}.service.ts`

5. Create Zustand store at `apps/web/src/stores/{name}Store.ts`

6. Run type-check: `npx tsc --noEmit`
```

### 4.4 Hooks (Lifecycle Automation)

**`.agents/hooks/post-edit-lint.json`**

```json
{
  "name": "post-edit-lint",
  "trigger": "PostToolUse",
  "category": "inspect",
  "condition": {
    "toolNames": ["replace_file_content", "write_to_file", "multi_replace_file_content"],
    "filePatterns": ["*.ts", "*.tsx"]
  },
  "action": {
    "command": "npx tsc --noEmit --pretty 2>&1 | head -20"
  }
}
```

**`.agents/hooks/pre-commit-check.json`**

```json
{
  "name": "pre-commit-check",
  "trigger": "PreToolUse",
  "category": "decide",
  "condition": {
    "toolNames": ["run_command"],
    "commandPatterns": ["git commit"]
  },
  "action": {
    "command": "npm run lint && npm run type-check && npm run test -- --run"
  }
}
```

### 4.5 AGENTS.md (Cross-Tool Compatible)

```markdown
# Agent Instructions — ATX (API Testing Tool)

## Project Type
SPA monorepo: React 19 + Vite 6 frontend, Express 5 + TypeScript backend.

## Non-Negotiable Rules
1. TypeScript strict mode — ALL files
2. CSS Modules + CSS Variables — NO Tailwind
3. Zod validation for ALL API request bodies
4. Backend: controller (thin) → service (thick) → routes
5. Services NEVER import Express types (no req/res)
6. API responses: { success: boolean, data?: T, error?: { code, message } }
7. Named exports only (no `export default` for components)
8. crypto.randomUUID() for client-side IDs

## When Tests Fail
Stop and report the failure. Do not auto-fix without user approval.

## When Linting Fails
Auto-fix if --fix resolves it. Otherwise, stop and report.

## Commands
- dev: npm run dev (starts both apps)
- lint: npm run lint
- test: npm run test
- type: npm run type-check
```

### 4.6 GEMINI.md (Antigravity Override)

Symlink to AGENTS.md for Antigravity-specific priority:

```bash
# In project root:
ln -s AGENTS.md GEMINI.md
```

Or a separate file with Antigravity-specific additions:

```markdown
# Antigravity-Specific Instructions

## Extends
Read and follow all rules from AGENTS.md.

## Additional Antigravity Behaviors
- Use sub-agents for parallel backend + frontend work
- Auto-run type-check after creating new TypeScript files
- When creating CSS modules, reference variables.css tokens
- When creating Mongoose models, add proper indexes
```

---

## 5. Frontend Structure

### Design Principles

| Principle | Implementation |
|:----------|:---------------|
| **Component co-location** | Each component has `.tsx` + `.module.css` in the same folder |
| **Grouped by feature** | `request-builder/`, `response-viewer/`, `ai/` — not by file type |
| **Flat services** | All API calls in `services/` — no nesting needed |
| **Stores = client state only** | Zustand stores in `stores/` — never duplicate TanStack Query data |
| **Hooks = reusable logic** | Custom hooks in `hooks/` — only truly shared ones |
| **Utils = pure functions** | No React, no side effects — just transforms |

### TypeScript Configuration (Frontend)

```json
{
  "extends": "../../tooling/tsconfig/react.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../../packages/shared/src/*"]
    }
  },
  "include": ["src"]
}
```

---

## 6. Backend Structure

### Module Pattern (Every Backend Feature)

```
modules/{feature}/
├── {feature}.controller.ts    ← HTTP layer (parse req, call service, format res)
├── {feature}.service.ts       ← Business logic (pure TypeScript, no Express types)
├── {feature}.routes.ts        ← Route definitions + middleware chain
├── {feature}.validation.ts    ← Zod schemas for request bodies
└── __tests__/
    └── {feature}.service.test.ts  ← Unit tests for service
```

### Why This Pattern?

```
Controller: "What came in from HTTP? Let me parse it."
     ↓
Service: "Here's the business logic. I don't know about HTTP."
     ↓
Model: "Here's the database interaction."

Benefits:
- Services are testable without HTTP (no mocking Express)
- Controllers are thin and replaceable (could swap Express for Fastify)
- Validation is separate and reusable
```

### TypeScript Configuration (Backend)

```json
{
  "extends": "../../tooling/tsconfig/node.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["../../packages/shared/src/*"]
    }
  },
  "include": ["src"]
}
```

---

## 7. Shared Packages

### `packages/shared/` — Types + Schemas

This is the **single source of truth** for all TypeScript types used by both frontend and backend.

```typescript
// packages/shared/src/types/api.types.ts
export type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };
```

Both `apps/web` and `apps/api` import from this package:
```typescript
import type { ApiResponse, RequestConfig } from '@shared/types';
```

### `packages/utils/` — Shared Utilities

Pure functions used by both frontend and backend:
```typescript
// packages/utils/src/format.ts
export function formatBytes(bytes: number): string { ... }
export function formatDuration(ms: number): string { ... }
```

---

## 8. Tooling Configuration

### Base TypeScript (`tooling/tsconfig/base.json`)

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### React TypeScript (`tooling/tsconfig/react.json`)

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "noEmit": true,
    "types": ["vite/client"]
  }
}
```

### Node TypeScript (`tooling/tsconfig/node.json`)

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "./dist",
    "declaration": true
  }
}
```

---

## 9. File-by-File Explanation

### Why Each File Exists

| File | Purpose | Can Be Deleted? |
|:-----|:--------|:----------------|
| `AGENTS.md` | Agent rules — read by Claude/Gemini/Copilot automatically | No — core agent config |
| `.agents/skills/*/SKILL.md` | Persistent knowledge modules for the AI agent | No — reduces prompt tokens by ~300 each |
| `.agents/hooks/*.json` | Auto-lint/test after agent edits files | Optional — but saves debugging time |
| `.agents/workflows/*.md` | Custom slash commands for scaffolding | Optional — convenience feature |
| `packages/shared/` | Single source of truth for types | No — prevents type duplication |
| `tooling/tsconfig/` | Centralized TS config | Recommended — consistency across apps |
| `apps/api/src/config/env.ts` | Validates .env with Zod at startup | No — fails fast on missing env vars |
| `apps/api/src/middleware/validate.ts` | Zod validation middleware factory | No — DRY validation across routes |
| `apps/web/src/styles/variables.css` | Design token source of truth | No — all colors/spacing reference this |
| `apps/web/src/services/api.ts` | Axios instance + JWT interceptors | No — centralizes auth token management |

---

## 10. Architecture Decision Records

### ADR-001: Monorepo over Polyrepo

**Decision:** Use npm workspaces monorepo  
**Rationale:** Atomic changes to shared types, single `npm run dev` command, consistent dependency versions  
**Trade-off:** Slightly more complex initial setup  

### ADR-002: Feature-Grouped over Type-Grouped (Frontend)

**Decision:** Group components by feature (`request-builder/`, `ai/`) not by type (`components/`, `hooks/`)  
**Rationale:** Co-located code reduces cognitive load. Adding a feature = adding one folder, not touching 5 folders.  
**Exception:** Truly global primitives go in `components/common/`

### ADR-003: Controller → Service → Routes (Backend)

**Decision:** Strict layered architecture  
**Rationale:** Services are testable without mocking HTTP. Controllers are replaceable.  
**Rule:** Services NEVER import from `express`  

### ADR-004: CSS Modules over Tailwind

**Decision:** CSS Modules + CSS Variables  
**Rationale:** Zero build dependency, native browser features, true component scoping, easy theme switching via `data-theme` attribute  
**Trade-off:** More verbose than utility-first CSS  

### ADR-005: Zustand + TanStack Query over Redux

**Decision:** Purpose-driven state management  
**Rationale:** Zustand for client state (tabs, panels, theme) — ~2KB, no boilerplate. TanStack Query for server state (API data) — handles caching, refetching, optimistic updates.  
**Rule:** NEVER copy TanStack Query data into Zustand  

### ADR-006: OpenAI Structured Outputs over Free-Form JSON

**Decision:** Use `zodResponseFormat` with `beta.chat.completions.parse`  
**Rationale:** Guaranteed valid JSON matching schema. CFG engine ensures the model cannot produce invalid output. No parsing errors in production.  
**Fallback:** Check `message.refusal` before accessing `parsed`  

---

## 11. Version Compatibility Matrix

### Tested Together (May 2026)

```
Node.js 22.x LTS
├── Express 5.1.x          ← requires Node 18+
├── Mongoose 8.24.x        ← uses MongoDB Driver 6.x
├── MongoDB Atlas 7.0       ← compatible with Driver 6.x
├── OpenAI SDK 4.x         ← beta.chat.completions.parse
└── undici 7.x             ← built into Node 22 (native fetch)

React 19.x
├── Vite 6.x               ← Environment API, React plugin
├── Zustand 5.x            ← zero boilerplate, no Provider
├── TanStack Query 5.x     ← queryClient, useMutation
├── React Router 7.x       ← framework mode available
├── Monaco Editor React 4.x← VS Code engine
└── Lucide React 0.4x      ← tree-shakeable icons

TypeScript 5.7.x
├── ESLint 9.x (flat config)
├── Vitest 3.x             ← Vite-native test runner
├── Zod 3.x                ← zodResponseFormat support
└── Prettier 3.x
```

### npm Install Commands (Complete)

**Root:**
```bash
npm install -D concurrently typescript husky lint-staged prettier vitest
```

**Frontend (`apps/web`):**
```bash
npm install react@19 react-dom@19 zustand @tanstack/react-query axios react-router-dom lucide-react sonner @monaco-editor/react
npm install -D @types/react @types/react-dom @vitejs/plugin-react vite typescript
```

**Backend (`apps/api`):**
```bash
npm install express@5 cors helmet cookie-parser dotenv mongoose@8 zod openai jsonwebtoken bcryptjs pino
npm install -D @types/express @types/cors @types/cookie-parser @types/jsonwebtoken @types/bcryptjs ts-node nodemon vitest supertest @types/supertest
```

---

*This folder structure is designed to scale from your MVP (7-day sprint) to a production SaaS with team collaboration. Every file has a purpose. Every pattern has a rationale.*
