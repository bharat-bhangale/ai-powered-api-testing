# ATX Core Library — Reusable NPM Package Architecture Report

> **Version:** 1.0  
> **Author:** Bharat Bhangale  
> **Date:** June 2026  
> **Status:** Research Complete  
> **Scope:** Converting the ATX API Testing backend into a reusable npm package library (`@atx/core`) to serve as a shared engine for both the Web Application and a Desktop Application.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Feasibility & Scalability Analysis](#2-feasibility--scalability-analysis)
3. [Current Architecture Audit](#3-current-architecture-audit)
4. [NPM Package Design & Structure](#4-npm-package-design--structure)
5. [Modularization Strategy](#5-modularization-strategy)
6. [Desktop Application Integration](#6-desktop-application-integration)
7. [Best Practices for Code Reuse](#7-best-practices-for-code-reuse)
8. [Migration Roadmap](#8-migration-roadmap)
9. [Risk Assessment](#9-risk-assessment)
10. [Master Prompt for Building @atx/core](#10-master-prompt-for-building-atxcore)

---

## 1. Executive Summary

### 1.1 The Problem

The current ATX API Testing Tool has all business logic tightly coupled to an Express.js server. Every service directly imports Mongoose models and environment config. To build a desktop app, naively you'd have two choices — both bad:

| Approach | Flaw |
|:---------|:-----|
| **Clone the backend code** | Double maintenance, feature drift, bugs fixed in one place not the other |
| **Desktop calls web backend over HTTP** | Requires internet, latency, can't work offline, defeats desktop purpose |

### 1.2 The Solution: `@atx/core`

Extract all **platform-independent business logic** into a shared npm package:

```
┌─────────────────────────────────────────────────────────┐
│                     @atx/core                            │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Executor │  │ Test     │  │ AI       │  │ Import/ │ │
│  │ Engine   │  │ Runner   │  │ Gateway  │  │ Export  │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Variable │  │ Chain    │  │ Schema   │  │ Trend   │ │
│  │ Resolver │  │ Resolver │  │ Validator│  │ Analyzer│ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│                                                          │
│  Interfaces:   IDataStore   |   ILLMProvider             │
│  (Dependency Injection — consumers provide their own)    │
└─────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│   Web App (API)  │          │  Desktop (Electron)│
│                  │          │                    │
│  Express server  │          │  Direct in-process │
│  MongoDB store   │          │  SQLite store      │
│  Same AI key     │          │  Same AI key       │
└──────────────────┘          └──────────────────┘
```

### 1.3 Key Insight

The critical architectural pattern is **Dependency Injection via interfaces**. The `@atx/core` library defines *what* data operations it needs (`IDataStore`, `ILLMProvider`), but the *how* (MongoDB vs SQLite, Gemini API key from env vs keychain) is provided by the consuming app.

---

## 2. Feasibility & Scalability Analysis

### 2.1 Feasibility Assessment

| Criterion | Assessment | Evidence |
|:----------|:-----------|:---------|
| **Is the business logic separable from Express?** | ✅ **Yes** | Services like `ExecutorService`, `TestRunnerService`, `VariableResolver` already accept plain TypeScript params and return plain objects. They **never access `req`/`res`**. |
| **Is the data access separable from Mongoose?** | ✅ **Yes (with work)** | Services call `Collection.find()`, `History.create()` etc. These can be replaced with `this.store.collections.find()` via dependency injection. |
| **Is the AI layer separable?** | ✅ **Yes** | `LLMGateway` already abstracts Gemini. It can become an interface (`ILLMProvider`) with Gemini as one implementation. |
| **Can the sandbox VM run without Express?** | ✅ **Yes** | `sandbox.ts` uses `node:vm` — pure Node.js, no Express dependency. |
| **Can the test assertion library run anywhere?** | ✅ **Yes** | `assertion-library.ts` is 354 lines of pure TypeScript with zero imports. |

**Verdict: Highly feasible.** The existing architecture already follows the pattern of stateless services with plain inputs/outputs. The main coupling point is Mongoose model imports.

### 2.2 Scalability Analysis

| Dimension | Current | With @atx/core | Improvement |
|:----------|:--------|:---------------|:------------|
| **New platforms** | Must rewrite/fork backend | `npm install @atx/core` + provide adapters | Add VS Code extension, CLI tool, or mobile app without rewriting logic |
| **Database swaps** | Rewrite every service | Implement new `IDataStore` adapter | 1 file change per database (SQLite adapter, PostgreSQL adapter, etc.) |
| **AI provider swaps** | Modify LLM Gateway | Implement new `ILLMProvider` | Swap Gemini → OpenAI → local LLM without touching core |
| **Feature additions** | Changes needed in 1 codebase | Change in `@atx/core`, both apps get it on `npm update` | Single source of truth |
| **Team scaling** | One monolith | Core library team + app teams | Independent velocity |

**Scalability rating: Excellent.** The library pattern is used by industry leaders — Prisma (ORM core), Supabase (shared client), Playwright (core engine + adapters).

### 2.3 Industry Precedents

| Tool | Shared Core Package | Consumers |
|:-----|:--------------------|:----------|
| **Prisma** | `@prisma/client` (core engine) | Web apps, CLIs, serverless |
| **Supabase** | `@supabase/supabase-js` | Web, mobile, Edge Functions |
| **Playwright** | `playwright-core` (browser engine) | CLI, VS Code extension, CI |
| **Bruno** | `bruno-query`, `bruno-lang` | Desktop app, CLI |
| **Insomnia** | `insomnia-sdk` (core services) | Desktop, Plugin system |

---

## 3. Current Architecture Audit

### 3.1 Code Classification

I audited every file in `apps/api/src/` and classified each as either **core logic** (belongs in the library) or **platform glue** (stays in the app):

#### ✅ CORE LOGIC — Moves to `@atx/core`

| File | Lines | Dependencies | Extraction Difficulty |
|:-----|:------|:-------------|:---------------------|
| `modules/executor/executor.service.ts` | 210 | axios, variable-resolver, sandbox, ssrf-guard | **Medium** — remove Mongoose, parameterize SSRF config |
| `modules/executor/variable-resolver.ts` | 76 | None (pure) | **Easy** — copy as-is |
| `modules/test-runner/test-runner.service.ts` | 71 | atx-api, sandbox | **Easy** — already pure |
| `modules/test-runner/sandbox.ts` | 95 | node:vm, atx-api | **Easy** — already pure |
| `modules/test-runner/atx-api.ts` | 211 | assertion-library, crypto | **Easy** — already pure |
| `modules/test-runner/assertion-library.ts` | 354 | None (pure) | **Easy** — copy as-is |
| `modules/collection-runner/chain-resolver.ts` | 124 | None (pure) | **Easy** — copy as-is |
| `modules/collection-runner/collection-runner.service.ts` | 409 | executor, test-runner, chain-resolver, **Mongoose** | **High** — heaviest Mongoose coupling |
| `modules/ai/llm-gateway.ts` | 253 | @google/genai, zod, **env config** | **Medium** — extract as interface |
| `modules/ai/features/test-generator.service.ts` | 42 | llm-gateway, prompts | **Easy** — small, clean |
| `modules/ai/features/debug-assistant.service.ts` | ~42 | llm-gateway, prompts | **Easy** |
| `modules/ai/features/suite-generator.service.ts` | ~200 | llm-gateway, **Mongoose** | **Medium** |
| `modules/ai/features/coverage-analyzer.service.ts` | ~120 | llm-gateway, **Mongoose** | **Medium** |
| `modules/ai/features/api-doc-generator.service.ts` | ~280 | llm-gateway, **Mongoose** | **Medium** |
| `modules/ai/prompts/*.prompt.ts` | ~500 total | None (pure strings) | **Easy** — copy all |
| `modules/ai/utils/usage-tracker.ts` | ~50 | None (in-memory) | **Easy** |
| `modules/import/parsers/postman.parser.ts` | ~100 | None (pure) | **Easy** |
| `modules/schema-validator/schema-validator.service.ts` | ~150 | llm-gateway, **Mongoose** | **Medium** |
| `modules/test-runs/test-trend.service.ts` | ~200 | **Mongoose** | **Medium** |
| `modules/dashboard/dashboard.service.ts` | ~200 | **Mongoose** | **Medium** |
| `utils/ssrf-guard.ts` | 78 | dns, url (Node built-ins) | **Easy** |

**Total core lines: ~3,500+**

#### 🔧 PLATFORM GLUE — Stays in the consuming app

| File | Purpose | Why it stays |
|:-----|:--------|:-------------|
| `app.ts` | Express setup, CORS, helmet | Express-specific |
| `server.ts` | HTTP listener | Express-specific |
| `config/env.ts` | Zod env validation | Environment-specific |
| `config/database.ts` | MongoDB connection | Database-specific |
| `middleware/*.ts` | Auth, error handling | Express-specific |
| `modules/*/controller.ts` | Parse req → call service → send res | Express-specific |
| `modules/*/routes.ts` | Express router | Express-specific |
| `models/*.model.ts` | Mongoose schemas | Database-specific |

### 3.2 Dependency Graph

```
PURE (zero dependencies — extract directly):
  assertion-library.ts
  variable-resolver.ts
  chain-resolver.ts
  all prompt templates (*.prompt.ts)
  postman.parser.ts

PURE NODE.JS (uses only Node built-ins):
  sandbox.ts         → node:vm
  atx-api.ts         → node:crypto
  ssrf-guard.ts      → node:dns, node:url

NPM DEPENDENCIES (need to be bundled):
  executor.service.ts → axios
  llm-gateway.ts      → @google/genai, zod

MONGOOSE-COUPLED (need refactoring via DI):
  collection-runner.service.ts → Collection, SavedRequest, Environment
  suite-generator.service.ts   → Collection, SavedRequest
  coverage-analyzer.service.ts → Collection, SavedRequest
  api-doc-generator.service.ts → Collection, SavedRequest, History
  test-trend.service.ts        → TestRun
  dashboard.service.ts         → TestRun, Collection
  schema-validator.service.ts  → SchemaContract, History
```

---

## 4. NPM Package Design & Structure

### 4.1 Package Identity

```json
{
  "name": "@atx/core",
  "version": "1.0.0",
  "description": "Core engine for ATX API Testing — HTTP execution, test scripting, AI analysis, and collection running",
  "license": "MIT",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./executor": "./dist/executor/index.js",
    "./testing": "./dist/testing/index.js",
    "./ai": "./dist/ai/index.js",
    "./runner": "./dist/runner/index.js",
    "./import": "./dist/import/index.js",
    "./analytics": "./dist/analytics/index.js"
  }
}
```

### 4.2 Directory Structure

```
packages/core/
├── src/
│   ├── index.ts                          # Barrel export
│   │
│   ├── interfaces/                       # ===== CONTRACTS =====
│   │   ├── data-store.interface.ts       # IDataStore — database abstraction
│   │   ├── llm-provider.interface.ts     # ILLMProvider — AI abstraction
│   │   ├── config.interface.ts           # ICoreConfig — configuration
│   │   └── logger.interface.ts           # ILogger — logging abstraction
│   │
│   ├── types/                            # ===== SHARED TYPES =====
│   │   ├── request.types.ts              # RequestConfig, ExecuteParams
│   │   ├── response.types.ts             # ExecutionResult, ResponseData
│   │   ├── test.types.ts                 # TestResult, RunTestsResult
│   │   ├── collection.types.ts           # Collection, SavedRequest
│   │   ├── environment.types.ts          # Environment, Variable
│   │   ├── ai.types.ts                   # GeneratedTest, DebugAnalysis
│   │   └── runner.types.ts              # RunEvent, RunOptions, ChainContextData
│   │
│   ├── executor/                         # ===== HTTP EXECUTION =====
│   │   ├── index.ts                      # Barrel
│   │   ├── executor.service.ts           # ExecutorService (HTTP calls)
│   │   ├── variable-resolver.ts          # {{variable}} substitution
│   │   └── ssrf-guard.ts                 # URL safety validation
│   │
│   ├── testing/                          # ===== TEST ENGINE =====
│   │   ├── index.ts
│   │   ├── test-runner.service.ts        # Test script orchestration
│   │   ├── sandbox.ts                    # Node.js VM sandbox
│   │   ├── atx-api.ts                    # atx global builder
│   │   └── assertion-library.ts          # expect() chain API
│   │
│   ├── runner/                           # ===== COLLECTION RUNNER =====
│   │   ├── index.ts
│   │   ├── collection-runner.service.ts  # Sequential execution engine
│   │   └── chain-resolver.ts             # {{chain.*}} variable resolution
│   │
│   ├── ai/                               # ===== AI ENGINE =====
│   │   ├── index.ts
│   │   ├── features/
│   │   │   ├── test-generator.service.ts
│   │   │   ├── debug-assistant.service.ts
│   │   │   ├── suite-generator.service.ts
│   │   │   ├── coverage-analyzer.service.ts
│   │   │   ├── api-doc-generator.service.ts
│   │   │   └── schema-validator.service.ts
│   │   ├── prompts/
│   │   │   ├── test-generation.prompt.ts
│   │   │   ├── debug-analysis.prompt.ts
│   │   │   ├── suite-generation.prompt.ts
│   │   │   ├── coverage-analysis.prompt.ts
│   │   │   └── api-doc-generation.prompt.ts
│   │   └── usage-tracker.ts
│   │
│   ├── import/                           # ===== IMPORT/EXPORT =====
│   │   ├── index.ts
│   │   ├── postman.parser.ts
│   │   ├── insomnia.parser.ts
│   │   ├── openapi.parser.ts
│   │   └── curl.parser.ts
│   │
│   ├── analytics/                        # ===== ANALYTICS =====
│   │   ├── index.ts
│   │   ├── trend-analyzer.service.ts     # Flaky, regression, performance
│   │   └── dashboard-aggregator.service.ts
│   │
│   └── utils/                            # ===== UTILITIES =====
│       ├── deep-equal.ts
│       ├── json-path.ts
│       └── rate-limiter.ts
│
├── adapters/                             # ===== REFERENCE ADAPTERS =====
│   ├── mongoose-store.ts                 # IDataStore → MongoDB/Mongoose
│   ├── sqlite-store.ts                   # IDataStore → SQLite/Drizzle
│   └── gemini-provider.ts               # ILLMProvider → Google Gemini
│
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### 4.3 Core Interfaces (The Heart of the Architecture)

#### `IDataStore` — Database Abstraction

```typescript
// packages/core/src/interfaces/data-store.interface.ts

export interface ICollectionStore {
  findAll(userId: string): Promise<Collection[]>;
  findById(id: string, userId: string): Promise<Collection | null>;
  create(data: CreateCollectionInput): Promise<Collection>;
  update(id: string, data: Partial<Collection>): Promise<Collection | null>;
  delete(id: string): Promise<void>;
}

export interface IRequestStore {
  findByCollection(collectionId: string, userId: string): Promise<SavedRequest[]>;
  findById(id: string): Promise<SavedRequest | null>;
  create(data: CreateRequestInput): Promise<SavedRequest>;
  update(id: string, data: Partial<SavedRequest>): Promise<SavedRequest | null>;
  delete(id: string): Promise<void>;
  reorder(ids: string[]): Promise<void>;
}

export interface IEnvironmentStore {
  findAll(userId: string): Promise<Environment[]>;
  findById(id: string): Promise<Environment | null>;
  create(data: CreateEnvironmentInput): Promise<Environment>;
  update(id: string, data: Partial<Environment>): Promise<Environment | null>;
  delete(id: string): Promise<void>;
}

export interface IHistoryStore {
  find(userId: string, options?: { page?: number; limit?: number }): Promise<PaginatedResult<HistoryEntry>>;
  create(entry: CreateHistoryInput): Promise<HistoryEntry>;
  deleteAll(userId: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ITestRunStore {
  create(run: CreateTestRunInput): Promise<TestRun>;
  update(id: string, data: Partial<TestRun>): Promise<TestRun | null>;
  findByCollection(collectionId: string, opts?: { limit?: number }): Promise<TestRun[]>;
  findByUser(userId: string, opts?: { page?: number; limit?: number }): Promise<PaginatedResult<TestRun>>;
}

export interface IScheduleStore {
  findAll(userId: string): Promise<Schedule[]>;
  findById(id: string): Promise<Schedule | null>;
  create(data: CreateScheduleInput): Promise<Schedule>;
  update(id: string, data: Partial<Schedule>): Promise<Schedule | null>;
  delete(id: string): Promise<void>;
  findEnabled(): Promise<Schedule[]>;
}

export interface ISchemaContractStore {
  findByIdentifier(userId: string, requestIdentifier: string): Promise<SchemaContract | null>;
  upsert(data: UpsertSchemaContractInput): Promise<SchemaContract>;
  findAll(userId: string): Promise<SchemaContract[]>;
  delete(id: string): Promise<void>;
}

/** Combined data store — consumers implement this once */
export interface IDataStore {
  collections: ICollectionStore;
  requests: IRequestStore;
  environments: IEnvironmentStore;
  history: IHistoryStore;
  testRuns: ITestRunStore;
  schedules: IScheduleStore;
  schemaContracts: ISchemaContractStore;
}
```

#### `ILLMProvider` — AI Abstraction

```typescript
// packages/core/src/interfaces/llm-provider.interface.ts

export interface LLMCompletionParams {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMCompletionResult {
  content: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  model: string;
}

export interface LLMStructuredParams<T> extends LLMCompletionParams {
  responseSchema: z.ZodType<T>;
  schemaName: string;
}

export interface LLMStructuredResult<T> extends LLMCompletionResult {
  parsed: T;
}

export interface ILLMProvider {
  complete(params: LLMCompletionParams): Promise<LLMCompletionResult>;
  completeStructured<T>(params: LLMStructuredParams<T>): Promise<LLMStructuredResult<T>>;
  stream(params: LLMCompletionParams): AsyncGenerator<string>;
}
```

#### `ICoreConfig` — Configuration

```typescript
// packages/core/src/interfaces/config.interface.ts

export interface ICoreConfig {
  /** Enable SSRF protection for server-side execution */
  ssrfProtection: boolean;
  /** Request execution timeout (ms) */
  requestTimeout: number;
  /** Test script execution timeout (ms) */
  sandboxTimeout: number;
  /** Daily AI usage limit (0 = unlimited) */
  aiDailyLimit: number;
}

export const DEFAULT_CONFIG: ICoreConfig = {
  ssrfProtection: true,
  requestTimeout: 30_000,
  sandboxTimeout: 5_000,
  aiDailyLimit: 100,
};
```

### 4.4 The ATXCore Facade

```typescript
// packages/core/src/index.ts

/**
 * ATXCore — the main entry point. Consumers create one instance
 * with their adapters, then call methods.
 *
 * Usage (Web App — Express):
 *   const core = new ATXCore({
 *     dataStore: new MongooseDataStore(),
 *     llmProvider: new GeminiProvider(process.env.GEMINI_API_KEY),
 *   });
 *
 * Usage (Desktop — Electron):
 *   const core = new ATXCore({
 *     dataStore: new SQLiteDataStore(dbPath),
 *     llmProvider: new GeminiProvider(keytar.getPassword('atx', 'gemini')),
 *     config: { ssrfProtection: false },  // Desktop: no SSRF needed
 *   });
 */
export class ATXCore {
  readonly executor: ExecutorService;
  readonly testRunner: TestRunnerService;
  readonly collectionRunner: CollectionRunnerService;
  readonly ai: {
    testGenerator: TestGeneratorService;
    debugAssistant: DebugAssistantService;
    suiteGenerator: SuiteGeneratorService;
    coverageAnalyzer: CoverageAnalyzerService;
    docGenerator: ApiDocGeneratorService;
    schemaValidator: SchemaValidatorService;
  };
  readonly importer: ImportService;
  readonly analytics: {
    trends: TrendAnalyzerService;
    dashboard: DashboardAggregatorService;
  };

  constructor(options: {
    dataStore: IDataStore;
    llmProvider?: ILLMProvider;
    config?: Partial<ICoreConfig>;
    logger?: ILogger;
  }) {
    const config = { ...DEFAULT_CONFIG, ...options.config };
    // Wire everything up via constructor injection
    // ...
  }
}
```

---

## 5. Modularization Strategy

### 5.1 Extraction Process — Step-by-Step

For each service that currently uses Mongoose, the extraction follows this pattern:

**Before (Tightly Coupled):**
```typescript
// apps/api/src/modules/ai/features/suite-generator.service.ts
import { Collection } from '../../../models/Collection.model';
import { SavedRequest } from '../../../models/Request.model';
import { llmGateway } from '../llm-gateway';

export class SuiteGeneratorService {
  async generate(userId: string, collectionId: string) {
    // ❌ Direct Mongoose call
    const collection = await Collection.findOne({ _id: collectionId, userId });
    const requests = await SavedRequest.find({ collectionId }).sort({ sortOrder: 1 });
    
    // ❌ Direct singleton reference
    const result = await llmGateway.completeStructured({...});
    return result.parsed;
  }
}
```

**After (Dependency Injected):**
```typescript
// packages/core/src/ai/features/suite-generator.service.ts
import type { IDataStore } from '../../interfaces/data-store.interface';
import type { ILLMProvider } from '../../interfaces/llm-provider.interface';

export class SuiteGeneratorService {
  constructor(
    private store: IDataStore,
    private llm: ILLMProvider,
  ) {}

  async generate(userId: string, collectionId: string) {
    // ✅ Uses interface — any database works
    const collection = await this.store.collections.findById(collectionId, userId);
    const requests = await this.store.requests.findByCollection(collectionId, userId);
    
    // ✅ Uses interface — any AI provider works
    const result = await this.llm.completeStructured({...});
    return result.parsed;
  }
}
```

### 5.2 Services That Need Zero Refactoring

These can be **copied directly** into `@atx/core` with no changes:

| Service | Lines | Why it's already clean |
|:--------|:------|:----------------------|
| `VariableResolver` | 76 | Pure class, no imports |
| `ChainResolver` | 124 | Pure class, no imports |
| `assertion-library.ts` | 354 | Zero dependencies |
| `atx-api.ts` | 211 | Only `node:crypto` |
| `sandbox.ts` | 95 | Only `node:vm` |
| `test-runner.service.ts` | 71 | Only uses sandbox + atx-api |
| `ssrf-guard.ts` | 78 | Only `node:dns`, `node:url` |
| All prompt templates | ~500 | Pure string functions |
| `postman.parser.ts` | ~100 | Pure parser |
| `usage-tracker.ts` | ~50 | In-memory, stateless |

**Total: ~1,700 lines copy-paste ready.**

### 5.3 Services Requiring Mongoose Decoupling

| Service | Current Mongoose Calls | Replacement Pattern |
|:--------|:----------------------|:-------------------|
| `CollectionRunnerService` | `SavedRequest.find()`, `Collection.findOne()`, `Environment.findOne()` | Inject `IDataStore`, call `this.store.requests.findByCollection()` |
| `SuiteGeneratorService` | `Collection.findOne()`, `SavedRequest.find()` | Inject `IDataStore` |
| `CoverageAnalyzerService` | `Collection.findOne()`, `SavedRequest.find()` | Inject `IDataStore` |
| `ApiDocGeneratorService` | `Collection.findOne()`, `SavedRequest.find()`, `History.findOne()` | Inject `IDataStore` |
| `SchemaValidatorService` | `SchemaContract.findOne()`, `SchemaContract.create()` | Inject `IDataStore` |
| `TestTrendService` | `TestRun.find()` | Inject `IDataStore` |
| `DashboardService` | `TestRun.find()`, `Collection.find()` | Inject `IDataStore` |
| `ExecutorService` | None (pure) but uses `validateUrl` | Make SSRF guard configurable |

### 5.4 The `ExecutorService` Special Case

The executor is unique — it makes outgoing HTTP requests. In a web server context, SSRF protection is critical. In a desktop app, the user is making requests from their own machine, so SSRF should be **optional**.

```typescript
export class ExecutorService {
  constructor(private config: { ssrfProtection: boolean; timeout: number }) {}

  async execute(params: ExecuteParams): Promise<ExecutionResult> {
    if (this.config.ssrfProtection) {
      await validateUrl(params.url);
    }
    // ... rest of execution
  }
}
```

---

## 6. Desktop Application Integration

### 6.1 Architecture: Desktop with `@atx/core`

```
┌─────────────────────────────────────────┐
│         Electron Desktop App             │
│                                          │
│  ┌─ Main Process ─────────────────────┐ │
│  │                                     │ │
│  │  ┌──────────────────────────────┐  │ │
│  │  │      @atx/core (in-process)  │  │ │
│  │  │                              │  │ │
│  │  │  core = new ATXCore({        │  │ │
│  │  │    dataStore: sqliteStore,   │  │ │
│  │  │    llmProvider: gemini,      │  │ │
│  │  │    config: { ssrf: false }   │  │ │
│  │  │  });                         │  │ │
│  │  └──────────────────────────────┘  │ │
│  │                                     │ │
│  │  IPC Handlers → call core methods  │ │
│  │  e.g., ipcMain.handle('execute',   │ │
│  │    (_, params) => core.executor     │ │
│  │      .execute(params))              │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ┌─ Renderer Process ─────────────────┐ │
│  │  React App (same UI codebase)       │ │
│  │                                     │ │
│  │  Services call:                     │ │
│  │  window.atxBridge.execute(params)   │ │
│  │  → ipcRenderer.invoke('execute')    │ │
│  │  → Main Process                     │ │
│  │  → @atx/core.executor.execute()    │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 6.2 Key Difference from Web App

| Aspect | Web App | Desktop App |
|:-------|:--------|:------------|
| Transport | HTTP (Express server) | IPC (Electron channels) |
| Core location | Express middleware → Service | Main process → @atx/core |
| Database | MongoDB (remote) | SQLite (local file) |
| AI key | Server env variable | OS Keychain |
| SSRF | Enabled (server protection) | Disabled (user's own machine) |
| Auth | JWT tokens | None (local user) |

### 6.3 Desktop IPC Layer (Thin Adapter)

```typescript
// apps/desktop/src/main/ipc-handlers.ts
import { ipcMain } from 'electron';
import { ATXCore } from '@atx/core';

export function registerHandlers(core: ATXCore) {
  // Execute HTTP request
  ipcMain.handle('execute', async (_, params) => {
    return core.executor.execute(params);
  });

  // Run tests
  ipcMain.handle('run-tests', async (_, params) => {
    return core.testRunner.runTests(params);
  });

  // Run collection
  ipcMain.handle('run-collection', async (_, options) => {
    const events: RunEvent[] = [];
    for await (const event of core.collectionRunner.run(options)) {
      events.push(event);
      // Also send to renderer for live progress
      mainWindow.webContents.send('collection-run-progress', event);
    }
    return events;
  });

  // AI: Generate tests
  ipcMain.handle('ai:generate-tests', async (_, request, response) => {
    return core.ai.testGenerator.generateTests(request, response);
  });

  // ... one handler per core method
}
```

### 6.4 Frontend Adaptation

The React frontend needs a **service adapter layer** that can either call HTTP (web) or IPC (desktop):

```typescript
// apps/web/src/services/platform-adapter.ts

interface IPlatformAdapter {
  execute(params: ExecuteParams): Promise<ExecutionResult>;
  runTests(params: RunTestsParams): Promise<RunTestsResult>;
  // ... all operations
}

// Web adapter (existing — calls Express API)
class WebAdapter implements IPlatformAdapter {
  async execute(params) {
    const { data } = await apiClient.post('/api/execute', params);
    return data;
  }
}

// Desktop adapter (new — calls IPC)
class DesktopAdapter implements IPlatformAdapter {
  async execute(params) {
    return window.atxBridge.execute(params);
  }
}

// Factory
export function createPlatformAdapter(): IPlatformAdapter {
  if (window.atxBridge) return new DesktopAdapter();
  return new WebAdapter();
}
```

---

## 7. Best Practices for Code Reuse

### 7.1 Package Versioning

| Practice | Implementation |
|:---------|:--------------|
| **Semantic Versioning** | `1.0.0` → `1.1.0` (new feature) → `2.0.0` (breaking interface change) |
| **Changesets** | Use `@changesets/cli` for coordinated version bumps across the monorepo |
| **Lock file** | Workspace-level `package-lock.json` ensures reproducible builds |
| **Peer dependencies** | `zod` as peerDep (both consumers already use it) |

### 7.2 API Stability

```
STABLE (will not change without major version):
  - IDataStore interface
  - ILLMProvider interface
  - ExecutionResult type
  - TestResult type
  - ATXCore constructor signature

EXPERIMENTAL (may change in minor versions):
  - Prompt templates
  - AI output schemas
  - Analytics algorithms
```

### 7.3 Coding Standards

| Rule | Reason |
|:-----|:-------|
| **No `process.env` in core** | Config passed via constructor — tests don't need env vars |
| **No framework imports** | No `express`, no `electron`, no `react` |
| **No global singletons** | Everything via constructor injection |
| **All AI outputs validated with Zod** | Structured, type-safe AI responses |
| **Async generators for streaming** | Collection runner yields events, not callbacks |
| **Pure functions where possible** | Easier to test, cache, parallelize |

### 7.4 Testing the Core Package

```typescript
// packages/core/src/__tests__/executor.test.ts
import { ExecutorService } from '../executor/executor.service';

test('executes GET request', async () => {
  const executor = new ExecutorService({ ssrfProtection: false, timeout: 5000 });
  const result = await executor.execute({
    method: 'GET',
    url: 'https://httpbin.org/get',
    headers: {},
    params: {},
    body: null,
  });
  
  expect(result.success).toBe(true);
  expect(result.response.status).toBe(200);
});

// Mock data store for service tests
const mockStore: IDataStore = {
  collections: {
    findById: vi.fn().mockResolvedValue({ id: '1', name: 'Test' }),
    // ...
  },
  // ...
};

test('suite generator uses store interface', async () => {
  const mockLLM: ILLMProvider = {
    completeStructured: vi.fn().mockResolvedValue({ parsed: { tests: [] } }),
    // ...
  };
  const service = new SuiteGeneratorService(mockStore, mockLLM);
  await service.generate('user1', 'collection1');
  
  expect(mockStore.collections.findById).toHaveBeenCalledWith('collection1', 'user1');
});
```

### 7.5 Documentation

Every public API of `@atx/core` must have:
1. **TSDoc comments** on classes and methods
2. **Usage examples** in JSDoc `@example` tags
3. **README.md** with quickstart for each sub-module
4. **CHANGELOG.md** maintained via changesets

---

## 8. Migration Roadmap

### 8.1 Phase Breakdown

```
Phase 1: Foundation (3-4 days)
├── Create packages/core structure
├── Copy pure modules (VariableResolver, ChainResolver, assertion-library, etc.)
├── Define interfaces (IDataStore, ILLMProvider, ICoreConfig)
├── Set up build (TypeScript + Vitest)
└── Verify: all pure modules pass tests

Phase 2: Service Extraction (5-7 days)
├── Extract ExecutorService (parameterize SSRF)
├── Extract TestRunnerService + sandbox
├── Extract AI services (replace llmGateway with ILLMProvider)
├── Extract CollectionRunnerService (replace Mongoose with IDataStore)
├── Extract analytics services
├── Extract import parsers
└── Verify: all services work with mock stores

Phase 3: Adapter Implementation (3-4 days)
├── Build MongooseDataStore adapter (for web app)
├── Build SQLiteDataStore adapter (for desktop)
├── Build GeminiProvider adapter
├── Refactor web app to use @atx/core + MongooseDataStore
└── Verify: web app works identically via @atx/core

Phase 4: Desktop Integration (5-7 days)
├── Create Electron shell (apps/desktop)
├── Wire IPC handlers to @atx/core
├── Implement SQLite data store
├── Adapt frontend service layer (HTTP → IPC)
└── Verify: desktop app fully functional

Total: 16-22 days
```

### 8.2 Phase 1 Detail: What Moves First

The safest extraction order is **dependencies first, dependents last**:

```
Batch 1 (Zero deps — copy directly):
  ├── types/ (all shared type definitions)
  ├── utils/deep-equal.ts
  ├── executor/variable-resolver.ts
  ├── runner/chain-resolver.ts
  ├── testing/assertion-library.ts
  ├── ai/prompts/ (all prompt templates)
  └── import/postman.parser.ts

Batch 2 (Node.js built-ins only):
  ├── executor/ssrf-guard.ts
  ├── testing/atx-api.ts
  └── testing/sandbox.ts

Batch 3 (Depends on Batch 1+2):
  ├── executor/executor.service.ts
  └── testing/test-runner.service.ts

Batch 4 (Needs interfaces — refactoring required):
  ├── interfaces/data-store.interface.ts  (define first)
  ├── interfaces/llm-provider.interface.ts  (define first)
  ├── runner/collection-runner.service.ts
  ├── ai/features/*.service.ts (all AI services)
  └── analytics/*.service.ts
```

---

## 9. Risk Assessment

### 9.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|:-----|:-------|:------------|:-----------|
| **Interface design wrong** — IDataStore doesn't cover all use cases | High | Medium | Audit EVERY Mongoose call across all services before finalizing interface |
| **Breaking the web app** during migration | High | Low | Keep web app on Mongoose adapter — identical behavior. Feature-flag the migration. |
| **SQLite limitations** — no `$regex`, no TTL indexes, no aggregation pipeline | Medium | High | Implement these patterns in application code (JS regex, cleanup cron, manual aggregation) |
| **Test sandbox (`node:vm`) may behave differently in Electron** | Medium | Low | Electron bundles Node.js — vm module should work. Validate early. |
| **Circular dependency** — core depends on something that depends on core | Medium | Low | Strict layering: core has zero imports from apps/ |
| **Performance regression** — extra abstraction layer adds latency | Low | Low | Interfaces are compile-time only (TypeScript). No runtime overhead. |

### 9.2 Organizational Risks

| Risk | Mitigation |
|:-----|:-----------|
| "Too much refactoring before new features" | Phase 1-2 can be done incrementally — extract 1 service at a time |
| "Desktop app doubles maintenance burden" | The entire point of @atx/core is to REDUCE burden. One fix → both apps get it. |
| "Versioning complexity" | Use changesets — automated changelogs, coordinated versions |

---

## 10. Master Prompt for Building @atx/core

The following prompt is designed to be copy-pasted into an AI coding agent (Claude/Antigravity) to build the entire `@atx/core` package.

---

### Master Prompt: Build @atx/core

````
GOAL: Extract all platform-independent business logic from the existing ATX API Testing web backend (apps/api/src/) into a reusable npm package library at packages/core/. This library will serve as the shared engine for both the Web Application (Express + MongoDB) and a Desktop Application (Electron + SQLite).

CONTEXT:
- Monorepo: npm workspaces (apps/web, apps/api, packages/shared, packages/utils, tooling/)
- Existing backend: Express 5, Mongoose/MongoDB, Gemini AI, Zod validation
- Existing frontend: React 19, Zustand, CSS Modules (NO Tailwind)
- TypeScript strict mode everywhere
- Services NEVER access req/res directly (already clean pattern)

ARCHITECTURE PRINCIPLE: Dependency Injection via interfaces.
- @atx/core defines WHAT operations it needs (IDataStore, ILLMProvider)
- Consuming apps provide HOW (MongooseDataStore, SQLiteDataStore, GeminiProvider)
- The core package has ZERO imports from express, mongoose, @google/genai, or electron

===== STEP 1: CREATE PACKAGE SKELETON =====

Create packages/core/ with:
- package.json: name "@atx/core", exports map for submodules (./executor, ./testing, ./ai, ./runner, ./import, ./analytics)
- tsconfig.json: strict, target ES2022, module NodeNext, composite true
- vitest.config.ts

Dependencies: axios, zod (peerDep), node:vm (built-in), node:crypto (built-in)
DevDependencies: vitest, typescript

Modify root package.json to add "packages/core" to workspaces.

===== STEP 2: DEFINE INTERFACES =====

Create packages/core/src/interfaces/:

1. data-store.interface.ts — IDataStore with sub-interfaces:
   - ICollectionStore: findAll, findById, create, update, delete
   - IRequestStore: findByCollection, findById, create, update, delete, reorder
   - IEnvironmentStore: findAll, findById, create, update, delete
   - IHistoryStore: find (paginated), create, deleteAll, delete
   - ITestRunStore: create, update, findByCollection, findByUser (paginated)
   - IScheduleStore: findAll, findById, create, update, delete, findEnabled
   - ISchemaContractStore: findByIdentifier, upsert, findAll, delete

2. llm-provider.interface.ts — ILLMProvider:
   - complete(params): Promise<LLMCompletionResult>
   - completeStructured<T>(params & { responseSchema: ZodType<T>, schemaName: string }): Promise<LLMStructuredResult<T>>
   - stream(params): AsyncGenerator<string>

3. config.interface.ts — ICoreConfig:
   - ssrfProtection: boolean (default true)
   - requestTimeout: number (default 30000)
   - sandboxTimeout: number (default 5000)
   - aiDailyLimit: number (default 100)

4. logger.interface.ts — ILogger:
   - info, warn, error, debug methods

===== STEP 3: COPY PURE MODULES =====

Copy these files EXACTLY (they have zero external dependencies):
- apps/api/src/modules/executor/variable-resolver.ts → packages/core/src/executor/variable-resolver.ts
- apps/api/src/modules/collection-runner/chain-resolver.ts → packages/core/src/runner/chain-resolver.ts
- apps/api/src/modules/test-runner/assertion-library.ts → packages/core/src/testing/assertion-library.ts
- apps/api/src/modules/test-runner/atx-api.ts → packages/core/src/testing/atx-api.ts
- apps/api/src/modules/test-runner/sandbox.ts → packages/core/src/testing/sandbox.ts
- apps/api/src/modules/test-runner/test-runner.service.ts → packages/core/src/testing/test-runner.service.ts
- apps/api/src/utils/ssrf-guard.ts → packages/core/src/executor/ssrf-guard.ts
- apps/api/src/modules/ai/prompts/*.prompt.ts → packages/core/src/ai/prompts/
- apps/api/src/modules/ai/utils/usage-tracker.ts → packages/core/src/ai/usage-tracker.ts
- apps/api/src/modules/import/parsers/postman.parser.ts → packages/core/src/import/postman.parser.ts

Fix all import paths after moving.

===== STEP 4: EXTRACT EXECUTOR SERVICE =====

Refactor apps/api/src/modules/executor/executor.service.ts → packages/core/src/executor/executor.service.ts:
- Add constructor: constructor(config: ICoreConfig)
- Make SSRF check conditional: if (this.config.ssrfProtection) await validateUrl(url)
- Use this.config.requestTimeout instead of hardcoded 30000
- Keep the same ExecuteParams and ExecutionResult types (move to types/)
- No Mongoose calls needed (executor is already pure)

===== STEP 5: EXTRACT AI SERVICES =====

For each AI service (test-generator, debug-assistant, suite-generator, coverage-analyzer, api-doc-generator):
- Add constructor(store: IDataStore, llm: ILLMProvider) where the service needs data
- Replace `llmGateway.completeStructured(...)` with `this.llm.completeStructured(...)`
- Replace `Collection.findOne({...})` with `this.store.collections.findById(id, userId)`
- Replace `SavedRequest.find({...})` with `this.store.requests.findByCollection(collectionId, userId)`
- Replace `History.findOne({...})` with `this.store.history.find(...)` or add a method
- Keep all Zod schemas and prompt templates unchanged
- test-generator.service.ts needs NO store (it receives request+response as params — already clean)

===== STEP 6: EXTRACT COLLECTION RUNNER =====

Refactor collection-runner.service.ts → packages/core/src/runner/collection-runner.service.ts:
- Add constructor(store: IDataStore, executor: ExecutorService, testRunner: TestRunnerService, config: ICoreConfig)
- Replace ALL Mongoose calls with this.store.* calls
- Change the run() method to an async generator: async *run(options: RunOptions): AsyncGenerator<RunEvent>
- This way, both SSE (web) and IPC (desktop) can consume events
- Keep chain resolution logic unchanged

===== STEP 7: EXTRACT ANALYTICS =====

Refactor test-trend.service.ts and dashboard.service.ts:
- Add constructor(store: IDataStore)
- Replace TestRun.find() with this.store.testRuns.findByCollection()
- Keep all analysis algorithms (flaky detection, regression, performance degradation) unchanged

===== STEP 8: CREATE ATXCore FACADE =====

Create packages/core/src/index.ts with ATXCore class:
- Constructor accepts { dataStore, llmProvider?, config?, logger? }
- Wires up all services with dependency injection
- Exposes: executor, testRunner, collectionRunner, ai.*, importer, analytics.*
- Export all types and interfaces

===== STEP 9: CREATE REFERENCE ADAPTERS =====

Create packages/core/adapters/:
1. mongoose-store.ts — Implements IDataStore using existing Mongoose models
   - Import models from apps/api/src/models/
   - Map Mongoose document methods to interface methods
   - This is what the WEB APP will use

2. gemini-provider.ts — Implements ILLMProvider using @google/genai
   - Extract the Gemini-specific code from llm-gateway.ts
   - zodToGeminiSchema helper stays here (Gemini-specific)

===== STEP 10: REFACTOR WEB APP =====

Modify apps/api/ to use @atx/core:
- Each controller creates/uses services from @atx/core instead of local modules
- Example: collection-runner.controller.ts calls core.collectionRunner.run() and streams events via SSE
- The Express layer (controllers, routes, middleware) stays in apps/api/
- The business logic comes from @atx/core

===== STEP 11: WRITE TESTS =====

Create packages/core/src/__tests__/:
- variable-resolver.test.ts — test {{variable}} substitution
- chain-resolver.test.ts — test {{chain.X.body.Y}} resolution
- assertion-library.test.ts — test all expect() chains
- sandbox.test.ts — test VM execution + timeout
- executor.test.ts — test HTTP execution (with real httpbin.org)
- test-runner.test.ts — test script execution
- Use mock IDataStore and mock ILLMProvider for service tests

===== CONSTRAINTS =====
- TypeScript strict mode
- NO imports from express, mongoose, @google/genai, or electron in core
- NO process.env access in core — all config via constructor
- NO global singletons — everything via dependency injection
- All AI outputs MUST use Zod schemas for validation
- Every public class and method MUST have TSDoc comments
- Barrel exports (index.ts) for each submodule
````

---

## Appendix A: Comparison with Alternative Approaches

| Approach | Pros | Cons | Verdict |
|:---------|:-----|:-----|:--------|
| **Shared NPM package (@atx/core)** | Single source of truth, testable, any consumer | Requires interface design, migration effort | ✅ **Best** |
| **Electron wraps web app** | Fastest to ship, zero refactoring | No offline, still needs MongoDB server, not a real desktop app | ❌ Half-measure |
| **Duplicate backend code** | Quick start | Double bugs, feature drift, unmaintainable | ❌ Worst |
| **Microservices (web API consumed by desktop)** | Clean separation | Requires internet, adds latency, complex deployment | ❌ Overkill |
| **WASM core in Rust** | Blazing fast, truly portable | Massive rewrite effort, team needs Rust skills | ❌ Wrong tool |

## Appendix B: Reference — Files that Move to @atx/core

| Current Path | New Path | Change Required |
|:-------------|:---------|:----------------|
| `modules/executor/variable-resolver.ts` | `core/src/executor/variable-resolver.ts` | None (pure) |
| `modules/executor/executor.service.ts` | `core/src/executor/executor.service.ts` | Add config injection |
| `utils/ssrf-guard.ts` | `core/src/executor/ssrf-guard.ts` | None (pure) |
| `modules/test-runner/assertion-library.ts` | `core/src/testing/assertion-library.ts` | None (pure) |
| `modules/test-runner/atx-api.ts` | `core/src/testing/atx-api.ts` | None (pure) |
| `modules/test-runner/sandbox.ts` | `core/src/testing/sandbox.ts` | None (pure) |
| `modules/test-runner/test-runner.service.ts` | `core/src/testing/test-runner.service.ts` | None (pure) |
| `modules/collection-runner/chain-resolver.ts` | `core/src/runner/chain-resolver.ts` | None (pure) |
| `modules/collection-runner/collection-runner.service.ts` | `core/src/runner/collection-runner.service.ts` | DI refactoring |
| `modules/ai/features/test-generator.service.ts` | `core/src/ai/features/test-generator.service.ts` | Replace llmGateway |
| `modules/ai/features/debug-assistant.service.ts` | `core/src/ai/features/debug-assistant.service.ts` | Replace llmGateway |
| `modules/ai/features/suite-generator.service.ts` | `core/src/ai/features/suite-generator.service.ts` | DI refactoring |
| `modules/ai/features/coverage-analyzer.service.ts` | `core/src/ai/features/coverage-analyzer.service.ts` | DI refactoring |
| `modules/ai/features/api-doc-generator.service.ts` | `core/src/ai/features/api-doc-generator.service.ts` | DI refactoring |
| `modules/schema-validator/schema-validator.service.ts` | `core/src/ai/features/schema-validator.service.ts` | DI refactoring |
| `modules/ai/prompts/*.prompt.ts` (5 files) | `core/src/ai/prompts/` | None (pure) |
| `modules/ai/utils/usage-tracker.ts` | `core/src/ai/usage-tracker.ts` | None (pure) |
| `modules/import/parsers/postman.parser.ts` | `core/src/import/postman.parser.ts` | None (pure) |
| `modules/test-runs/test-trend.service.ts` | `core/src/analytics/trend-analyzer.service.ts` | DI refactoring |
| `modules/dashboard/dashboard.service.ts` | `core/src/analytics/dashboard-aggregator.service.ts` | DI refactoring |

**Total: 24 files → @atx/core**  
**~3,500+ lines of business logic extracted**  
**12 files zero changes, 12 files need DI refactoring**
