# Phase 3 — Implementation Architecture & Technical Specifications

## Database Models, API Endpoints, Component Hierarchy, and State Management

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [New Backend Modules (6 Modules)](#2-new-backend-modules)
3. [New Database Models (4 Models)](#3-new-database-models)
4. [API Endpoint Registry](#4-api-endpoint-registry)
5. [Frontend Component Hierarchy](#5-frontend-component-hierarchy)
6. [New Zustand Stores (8 Stores)](#6-new-zustand-stores)
7. [AI Service Architecture](#7-ai-service-architecture)
8. [SSE Architecture for Long-Running Features](#8-sse-architecture)
9. [Integration Points with Existing Codebase](#9-integration-points)
10. [Testing Strategy](#10-testing-strategy)
11. [Deployment Considerations](#11-deployment-considerations)

---

## 1. Architecture Overview

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        ATX Phase 3 Architecture                             │
│                                                                              │
│  FRONTEND (React 19 + Vite 6)                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  New Components                                                         │  │
│  │  ├── ai/NLRequestBar          ← U1: Natural Language Input             │  │
│  │  ├── ai/TestBuilderChat       ← U2: Conversational Test Builder        │  │
│  │  ├── ai/APIDiscovery          ← U3: API Reverse Engineer               │  │
│  │  ├── mock-server/MockServer   ← U4: Smart Mock Server                  │  │
│  │  ├── anomaly/AnomalyBanner    ← U5: Anomaly Detection                  │  │
│  │  ├── ai/PerformanceProfiler   ← U6: Performance Profiler               │  │
│  │  ├── api-diff/APIDiffPanel    ← U7: API Diff                           │  │
│  │  ├── ai/RequestOptimizer      ← U8: Request Optimizer                  │  │
│  │  ├── security/SecurityScanner ← U9: Security Scanner                   │  │
│  │  ├── fuzz/FuzzTestRunner      ← U10: Chaos/Fuzz Testing                │  │
│  │  ├── ai/DataGenerator         ← U11: Smart Data Generator              │  │
│  │  └── dashboard/HealthScore    ← U12: API Health Score                  │  │
│  │                                                                         │  │
│  │  New Stores: 8 Zustand stores                                           │  │
│  │  New Services: 8 API service files                                      │  │
│  │  New Hooks: useLifecycleHooks, useNLRequest, useAutoTest, useOptimizer │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                              │                                                │
│                              │ HTTP / SSE                                     │
│                              ▼                                                │
│  BACKEND (Express 5 + TypeScript)                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  Existing Modules           New Modules                                 │  │
│  │  ├── auth/                  ├── anomaly-detection/    ← U5             │  │
│  │  ├── collections/           ├── api-discovery/        ← U3             │  │
│  │  ├── environments/          ├── api-diff/             ← U7             │  │
│  │  ├── executor/              ├── fuzz-testing/         ← U10            │  │
│  │  ├── history/               ├── hooks/                ← Lifecycle      │  │
│  │  ├── import/                ├── mock-server/          ← U4             │  │
│  │  ├── requests/              └── security-scanner/     ← U9             │  │
│  │  ├── test-runner/                                                       │  │
│  │  ├── collection-runner/     New AI Features                             │  │
│  │  ├── schedules/             ├── nl-to-request          ← U1            │  │
│  │  ├── test-runs/             ├── conversational-test     ← U2            │  │
│  │  ├── dashboard/             ├── api-reverse-engineer    ← U3            │  │
│  │  └── ai/                    ├── mock-generator          ← U4            │  │
│  │      ├── features/          ├── anomaly-explainer       ← U5            │  │
│  │      ├── prompts/           ├── performance-profiler    ← U6            │  │
│  │      └── llm-gateway.ts     ├── diff-analyzer           ← U7            │  │
│  │                             ├── request-optimizer        ← U8            │  │
│  │                             ├── security-analyzer        ← U9            │  │
│  │                             ├── fuzz-analyzer            ← U10           │  │
│  │                             ├── data-generator           ← U11           │  │
│  │                             └── health-score             ← U12           │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                              │                                                │
│                              ▼                                                │
│  DATA LAYER                                                                  │
│  ├── MongoDB Atlas (existing + 4 new models)                                 │
│  └── Gemini API (existing LLM Gateway + 12 new prompt files)                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. New Backend Modules

### Module 1: `anomaly-detection/` (U5)

```
apps/api/src/modules/anomaly-detection/
├── anomaly-detection.service.ts    — Baseline management + anomaly detection logic
├── anomaly-detection.controller.ts — GET /api/anomalies/:requestId, POST /api/anomalies/analyze
├── anomaly-detection.routes.ts     — Route registration
├── anomaly-detection.validation.ts — Zod schemas
└── Baseline.model.ts              — Mongoose model for learned baselines
```

### Module 2: `api-discovery/` (U3)

```
apps/api/src/modules/api-discovery/
├── api-discovery.service.ts    — Probe execution, rate limiting, result aggregation
├── api-discovery.controller.ts — POST /api/discovery/start (SSE), POST /api/discovery/stop
├── api-discovery.routes.ts     — Route registration
└── api-discovery.validation.ts — Zod schemas (baseUrl validation)
```

### Module 3: `api-diff/` (U7)

```
apps/api/src/modules/api-diff/
├── api-diff.service.ts    — Load historical responses, structural comparison
├── api-diff.controller.ts — POST /api/diff/analyze
├── api-diff.routes.ts     — Route registration
└── api-diff.validation.ts — Zod schemas
```

### Module 4: `mock-server/` (U4)

```
apps/api/src/modules/mock-server/
├── mock-server.service.ts    — Mock server lifecycle (generate, start, stop)
├── mock-server.controller.ts — POST /api/mock-server/generate, /start, /stop, GET /status
├── mock-server.routes.ts     — Route registration
├── mock-server.validation.ts — Zod schemas
└── mock-data-generator.ts    — Realistic data generation utilities
```

### Module 5: `security-scanner/` (U9)

```
apps/api/src/modules/security-scanner/
├── security-scanner.service.ts    — OWASP check orchestration
├── security-scanner.controller.ts — POST /api/security/scan (SSE), GET /api/security/reports
├── security-scanner.routes.ts     — Route registration
├── security-scanner.validation.ts — Zod schemas
├── attack-payloads.ts             — Pre-built payload library
└── SecurityReport.model.ts        — Mongoose model for scan results
```

### Module 6: `fuzz-testing/` (U10)

```
apps/api/src/modules/fuzz-testing/
├── fuzz-testing.service.ts    — Fuzz test orchestration
├── fuzz-testing.controller.ts — POST /api/fuzz/run (SSE), POST /api/fuzz/stop
├── fuzz-testing.routes.ts     — Route registration
├── fuzz-testing.validation.ts — Zod schemas
└── payload-generators.ts     — Category-specific payload generation functions
```

### Hook System (cross-cutting)

```
apps/api/src/modules/hooks/
└── hook-registry.ts — Lifecycle hook registration and trigger system
```

### New AI Services & Prompts

```
apps/api/src/modules/ai/
├── features/
│   ├── nl-to-request.service.ts              ← U1
│   ├── conversational-test-builder.service.ts ← U2
│   ├── api-reverse-engineer.service.ts       ← U3
│   ├── mock-generator.service.ts             ← U4
│   ├── anomaly-explainer.service.ts          ← U5
│   ├── performance-profiler.service.ts       ← U6
│   ├── diff-analyzer.service.ts              ← U7
│   ├── request-optimizer.service.ts          ← U8
│   ├── security-analyzer.service.ts          ← U9
│   ├── fuzz-analyzer.service.ts              ← U10
│   ├── data-generator.service.ts             ← U11
│   └── health-score.service.ts               ← U12
└── prompts/
    ├── nl-to-request.prompt.ts               ← U1
    ├── conversational-test-builder.prompt.ts ← U2
    ├── api-reverse-engineer.prompt.ts        ← U3
    ├── mock-generation.prompt.ts             ← U4
    ├── anomaly-explanation.prompt.ts         ← U5
    ├── performance-profiler.prompt.ts        ← U6
    ├── diff-analyzer.prompt.ts               ← U7
    ├── request-optimizer.prompt.ts           ← U8
    ├── security-analysis.prompt.ts           ← U9
    ├── fuzz-generation.prompt.ts             ← U10
    ├── data-generation.prompt.ts             ← U11
    └── health-score.prompt.ts                ← U12
```

---

## 3. New Database Models

### Model 1: Baseline (U5 — Anomaly Detection)

```typescript
// apps/api/src/modules/anomaly-detection/Baseline.model.ts
{
  _id: ObjectId,
  userId: ObjectId,                       // Owner
  endpointKey: string,                    // "GET:/api/users" (method + normalized path)
  sampleCount: number,                    // Number of responses that contributed to baseline
  responseTime: {
    avg: number,                          // Moving average (ms)
    stdDev: number,                       // Standard deviation
    min: number,                          // Fastest observed
    max: number,                          // Slowest observed
  },
  responseSize: {
    avg: number,                          // Average bytes
    stdDev: number,                       // Size deviation
  },
  statusCodes: Map<string, number>,       // Frequency: { "200": 45, "404": 2 }
  fields: [{
    path: string,                         // Dot path: "data.users[].name"
    type: string,                         // "string", "number", "array", "object", "null"
    presence: number,                     // 0.0 to 1.0 (1.0 = always present)
  }],
  isActive: boolean,                      // True when sampleCount >= 5
  createdAt: Date,
  updatedAt: Date,
}

// Indexes
{ userId: 1, endpointKey: 1 } — unique compound index
```

### Model 2: SecurityReport (U9 — Security Scanner)

```typescript
// apps/api/src/modules/security-scanner/SecurityReport.model.ts
{
  _id: ObjectId,
  userId: ObjectId,
  collectionId: ObjectId,
  scanDate: Date,
  scanDuration: number,                   // Total scan time in ms
  securityScore: number,                  // 0-100
  checksRun: number,                      // Total OWASP checks executed
  vulnerabilities: [{
    owaspCategory: string,                // "API1" through "API10"
    endpoint: string,                     // "GET /api/users/:id"
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info',
    title: string,                        // "Broken Object Level Authorization"
    description: string,                  // Detailed explanation
    evidence: string,                     // What the scanner found
    remediation: string,                  // How to fix
    codeExample?: string,                 // Server-side fix code
  }],
  summary: {
    critical: number,
    high: number,
    medium: number,
    low: number,
    info: number,
  },
  createdAt: Date,
}

// Indexes
{ userId: 1, collectionId: 1, scanDate: -1 }
```

### Model 3: HealthScore (U12 — API Health Score)

```typescript
// apps/api/src/modules/dashboard/HealthScore.model.ts (extends dashboard module)
{
  _id: ObjectId,
  userId: ObjectId,
  collectionId: ObjectId,
  date: Date,                             // One record per collection per day
  overallScore: number,                   // 0-100 weighted average
  categories: {
    performance: { score: number, issues: string[] },
    security: { score: number, issues: string[] },
    reliability: { score: number, issues: string[] },
    coverage: { score: number, issues: string[] },
    documentation: { score: number, issues: string[] },
  },
  recommendations: [{
    priority: 'critical' | 'high' | 'medium' | 'low',
    title: string,
    description: string,
    impact: string,
    effort: 'low' | 'medium' | 'high',
    category: string,
  }],
  trend: 'improving' | 'stable' | 'declining',
  createdAt: Date,
}

// Indexes
{ userId: 1, collectionId: 1, date: -1 }
// TTL index: auto-delete records older than 90 days
{ createdAt: 1 }, { expireAfterSeconds: 7776000 }
```

### Model 4: MockServerConfig (U4 — Mock Server)

```typescript
// Note: This is stored in-memory, not MongoDB (ephemeral by design)
// Only the configuration template is stored
{
  userId: string,
  collectionId: string,
  port: number,                           // Default: 3001
  isRunning: boolean,
  routes: [{
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,                         // "/api/users"
    statusCode: number,                   // 200
    responseTemplate: object,             // Response body template
    stateful: boolean,                    // CRUD state management
    pagination: boolean,                  // Supports ?page=X&limit=Y
    filtering: string[],                  // Fields that support ?field=value
  }],
  initialData: {
    [resource: string]: object[],         // Pre-generated mock records
  },
  config: {
    corsEnabled: boolean,
    defaultDelay: number,                 // Default response delay (ms)
    errorRate: number,                    // Percentage of requests that return errors (0-100)
  },
}
```

---

## 4. API Endpoint Registry

### New REST Endpoints (Phase 3)

| Method | Path | Feature | Response Type | Auth |
|:-------|:-----|:--------|:-------------|:-----|
| `POST` | `/api/ai/nl-to-request` | U1 | JSON | ✅ |
| `POST` | `/api/ai/test-builder/message` | U2 | JSON | ✅ |
| `POST` | `/api/discovery/start` | U3 | SSE | ✅ |
| `POST` | `/api/discovery/stop` | U3 | JSON | ✅ |
| `POST` | `/api/mock-server/generate` | U4 | JSON | ✅ |
| `POST` | `/api/mock-server/start` | U4 | JSON | ✅ |
| `POST` | `/api/mock-server/stop` | U4 | JSON | ✅ |
| `GET` | `/api/mock-server/status` | U4 | JSON | ✅ |
| `GET` | `/api/anomalies/:requestId` | U5 | JSON | ✅ |
| `POST` | `/api/anomalies/analyze` | U5 | JSON | ✅ |
| `POST` | `/api/ai/performance-profile` | U6 | JSON | ✅ |
| `POST` | `/api/diff/analyze` | U7 | JSON | ✅ |
| `POST` | `/api/ai/optimize-request` | U8 | JSON | ✅ |
| `POST` | `/api/security/scan` | U9 | SSE | ✅ |
| `GET` | `/api/security/reports` | U9 | JSON | ✅ |
| `GET` | `/api/security/reports/:id` | U9 | JSON | ✅ |
| `POST` | `/api/fuzz/run` | U10 | SSE | ✅ |
| `POST` | `/api/fuzz/stop` | U10 | JSON | ✅ |
| `POST` | `/api/ai/generate-data` | U11 | JSON | ✅ |
| `POST` | `/api/ai/health-score` | U12 | JSON | ✅ |
| `GET` | `/api/health-scores/:collectionId` | U12 | JSON | ✅ |

### Route Registration in app.ts

```typescript
// Phase 3 route registrations (add to apps/api/src/app.ts)
import { anomalyRoutes } from './modules/anomaly-detection/anomaly-detection.routes';
import { discoveryRoutes } from './modules/api-discovery/api-discovery.routes';
import { diffRoutes } from './modules/api-diff/api-diff.routes';
import { mockServerRoutes } from './modules/mock-server/mock-server.routes';
import { securityRoutes } from './modules/security-scanner/security-scanner.routes';
import { fuzzRoutes } from './modules/fuzz-testing/fuzz-testing.routes';

app.use('/api/anomalies', authenticate, anomalyRoutes);
app.use('/api/discovery', authenticate, discoveryRoutes);
app.use('/api/diff', authenticate, diffRoutes);
app.use('/api/mock-server', authenticate, mockServerRoutes);
app.use('/api/security', authenticate, securityRoutes);
app.use('/api/fuzz', authenticate, fuzzRoutes);
// AI routes (U1, U2, U6, U8, U11, U12) are added to existing ai.routes.ts
```

---

## 5. Frontend Component Hierarchy

### Complete Component Tree (Phase 3 additions)

```
apps/web/src/components/
├── ai/                                    # AI-powered features
│   ├── NLRequestBar.tsx + .module.css     # U1: Natural language input bar
│   ├── NLRequestPreview.tsx + .module.css # U1: Generated request preview
│   ├── TestBuilderChat.tsx + .module.css  # U2: Multi-turn test builder
│   ├── TestBuilderPreview.tsx + .module.css # U2: Live test preview
│   ├── APIDiscovery.tsx + .module.css     # U3: Discovery panel
│   ├── DiscoveryResultRow.tsx + .module.css # U3: Endpoint result row
│   ├── PerformanceProfiler.tsx + .module.css # U6: Profiler panel
│   ├── PerformanceGauge.tsx + .module.css # U6: Score gauge
│   ├── BottleneckCard.tsx + .module.css   # U6: Bottleneck card
│   ├── RequestOptimizer.tsx + .module.css # U8: Optimization panel
│   ├── OptimizationCard.tsx + .module.css # U8: Suggestion card
│   ├── DataGenerator.tsx + .module.css    # U11: Data gen panel
│   ├── DataPresets.tsx + .module.css      # U11: Preset selector
│   ├── AIChatPanel.tsx                    # existing
│   ├── AIDebugPanel.tsx                   # existing
│   ├── AITestSuggestions.tsx              # existing
│   ├── AICoverageReport.tsx              # Phase 2
│   └── AIDocGenerator.tsx                # Phase 2
│
├── anomaly/                               # U5: Anomaly detection
│   ├── AnomalyBanner.tsx + .module.css   # Alert bar in response viewer
│   ├── AnomalyDetailPanel.tsx + .module.css # Expandable anomaly details
│   └── AnomalyIndicator.tsx + .module.css # Small icon indicator
│
├── api-diff/                              # U7: Breaking change detection
│   ├── APIDiffPanel.tsx + .module.css     # Main diff panel
│   ├── DiffCategory.tsx + .module.css     # Collapsible category
│   └── DiffItem.tsx + .module.css        # Individual change item
│
├── mock-server/                           # U4: Smart mock server
│   ├── MockServerPanel.tsx + .module.css  # Server controls
│   ├── MockEndpointRow.tsx + .module.css  # Endpoint listing
│   └── MockServerSettings.tsx + .module.css # Port, delay, error settings
│
├── security/                              # U9: Security scanning
│   ├── SecurityScanner.tsx + .module.css  # Main scanner panel
│   ├── SecurityReportCard.tsx + .module.css # Vulnerability card
│   └── SecurityScore.tsx + .module.css    # Security gauge
│
├── fuzz/                                  # U10: Fuzz testing
│   ├── FuzzTestRunner.tsx + .module.css   # Main fuzz panel
│   ├── FuzzResultRow.tsx + .module.css    # Payload result row
│   └── FuzzCategorySelector.tsx + .module.css # Category checkboxes
│
└── dashboard/                             # existing + U12
    ├── HealthScore.tsx + .module.css      # U12: Health score widget
    ├── HealthCategory.tsx + .module.css   # U12: Category breakdown
    ├── HealthRecommendations.tsx + .module.css # U12: Recommendations
    ├── HealthTrend.tsx + .module.css      # U12: Trend chart
    ├── TestDashboard.tsx                  # Phase 2
    ├── PassRateGauge.tsx                  # Phase 2
    └── TrendChart.tsx                     # Phase 2
```

---

## 6. New Zustand Stores

### 8 New Stores for Phase 3

```typescript
// 1. apps/web/src/stores/nlRequestStore.ts (U1)
interface NLRequestState {
  isGenerating: boolean;
  nlInput: string;
  generatedRequest: GeneratedRequest | null;
  setNLInput: (text: string) => void;
  generateRequest: () => Promise<void>;
  acceptRequest: () => void;
  discardRequest: () => void;
}

// 2. apps/web/src/stores/testBuilderStore.ts (U2)
interface TestBuilderState {
  conversationHistory: Message[];
  generatedTests: GeneratedTest[];
  currentTestScript: string;
  isProcessing: boolean;
  addMessage: (message: string) => Promise<void>;
  clearConversation: () => void;
  saveTests: () => void;
}

// 3. apps/web/src/stores/discoveryStore.ts (U3)
interface DiscoveryState {
  isDiscovering: boolean;
  baseUrl: string;
  discoveredEndpoints: DiscoveredEndpoint[];
  phase: number;
  progress: { current: number; total: number };
  startDiscovery: (url: string) => void;
  stopDiscovery: () => void;
  saveAsCollection: () => Promise<void>;
}

// 4. apps/web/src/stores/mockServerStore.ts (U4)
interface MockServerState {
  isRunning: boolean;
  port: number;
  endpoints: MockEndpoint[];
  config: MockConfig;
  generate: (collectionId: string) => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

// 5. apps/web/src/stores/anomalyStore.ts (U5)
interface AnomalyState {
  anomalies: Anomaly[];
  baseline: Baseline | null;
  isAnalyzing: boolean;
  analyzeResponse: (requestId: string, response: ResponseData) => Promise<void>;
  dismissAnomaly: (index: number) => void;
  explainAnomaly: (index: number) => Promise<void>;
}

// 6. apps/web/src/stores/diffStore.ts (U7)
interface DiffState {
  diffResults: DiffReport | null;
  isAnalyzing: boolean;
  baselineDate: Date | null;
  analyze: (collectionId: string, baseDate: Date) => Promise<void>;
}

// 7. apps/web/src/stores/securityStore.ts (U9)
interface SecurityState {
  isScanning: boolean;
  progress: { current: number; total: number; phase: string };
  report: SecurityReport | null;
  scanHistory: SecurityReport[];
  startScan: (collectionId: string) => void;
  stopScan: () => void;
  loadReports: (collectionId: string) => Promise<void>;
}

// 8. apps/web/src/stores/fuzzStore.ts (U10)
interface FuzzState {
  isRunning: boolean;
  selectedCategories: FuzzCategory[];
  results: FuzzResult[];
  progress: { current: number; total: number };
  startFuzz: () => void;
  stopFuzz: () => void;
  toggleCategory: (category: FuzzCategory) => void;
}
```

---

## 7. AI Service Architecture

### Updated AI Module Map

```
apps/api/src/modules/ai/
├── llm-gateway.ts                    # EXISTING — 3 methods: complete, completeStructured, stream
├── ai.controller.ts                  # EXISTING — Add 8 new endpoints for Phase 3
├── ai.routes.ts                      # EXISTING — Register new routes
├── features/
│   ├── chat.service.ts               # EXISTING
│   ├── test-generator.service.ts     # EXISTING
│   ├── debug-assistant.service.ts    # EXISTING
│   ├── coverage-analyzer.service.ts  # Phase 2
│   ├── schema-validator.service.ts   # Phase 2
│   ├── doc-generator.service.ts      # Phase 2
│   ├── suite-generator.service.ts    # Phase 2
│   │
│   │ # Phase 3 — 12 new AI services
│   ├── nl-to-request.service.ts      # U1 — completeStructured()
│   ├── conversational-test-builder.service.ts  # U2 — complete() (multi-turn)
│   ├── api-reverse-engineer.service.ts  # U3 — completeStructured()
│   ├── mock-generator.service.ts     # U4 — completeStructured()
│   ├── anomaly-explainer.service.ts  # U5 — complete() (text explanation)
│   ├── performance-profiler.service.ts  # U6 — completeStructured()
│   ├── diff-analyzer.service.ts      # U7 — completeStructured()
│   ├── request-optimizer.service.ts  # U8 — completeStructured()
│   ├── security-analyzer.service.ts  # U9 — completeStructured()
│   ├── fuzz-analyzer.service.ts      # U10 — completeStructured()
│   ├── data-generator.service.ts     # U11 — completeStructured()
│   └── health-score.service.ts       # U12 — completeStructured()
│
└── prompts/
    ├── test-generation.prompt.ts     # EXISTING
    ├── debug-analysis.prompt.ts      # EXISTING
    │
    │ # Phase 3 — 12 new prompt files
    ├── nl-to-request.prompt.ts       # U1
    ├── conversational-test-builder.prompt.ts  # U2
    ├── api-reverse-engineer.prompt.ts  # U3
    ├── mock-generation.prompt.ts     # U4
    ├── anomaly-explanation.prompt.ts # U5
    ├── performance-profiler.prompt.ts  # U6
    ├── diff-analyzer.prompt.ts       # U7
    ├── request-optimizer.prompt.ts   # U8
    ├── security-analysis.prompt.ts   # U9
    ├── fuzz-generation.prompt.ts     # U10
    ├── data-generation.prompt.ts     # U11
    └── health-score.prompt.ts        # U12
```

### AI Gateway Usage Per Feature

| Feature | Gateway Method | Max Tokens | Temperature |
|:--------|:-------------|:-----------|:-----------|
| U1: NL→Request | completeStructured() | 2000 | 0.3 |
| U2: Conversational Tests | complete() | 3000 | 0.5 |
| U3: API Discovery | completeStructured() | 2000 | 0.3 |
| U4: Mock Generator | completeStructured() | 4000 | 0.5 |
| U5: Anomaly Explainer | complete() | 500 | 0.3 |
| U6: Performance Profiler | completeStructured() | 3000 | 0.3 |
| U7: Diff Analyzer | completeStructured() | 3000 | 0.3 |
| U8: Request Optimizer | completeStructured() | 2000 | 0.3 |
| U9: Security Analyzer | completeStructured() | 4000 | 0.3 |
| U10: Fuzz Generator | completeStructured() | 3000 | 0.5 |
| U11: Data Generator | completeStructured() | 2000 | 0.7 |
| U12: Health Score | completeStructured() | 2000 | 0.3 |

---

## 8. SSE Architecture for Long-Running Features

### Features Using SSE

Three features use Server-Sent Events for real-time progress:

| Feature | Endpoint | Event Types | Avg Duration |
|:--------|:---------|:-----------|:-------------|
| U3: API Discovery | POST /api/discovery/start | probing, discovered, phase, complete, error | 30-120s |
| U9: Security Scanner | POST /api/security/scan | check_start, check_result, phase, complete | 60-300s |
| U10: Fuzz Testing | POST /api/fuzz/run | payload, complete | 30-120s |

### SSE Controller Pattern

```typescript
// Standard SSE controller pattern for all 3 features
async startScan(req: Request, res: Response) {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Create abort controller for stop support
  const abortController = new AbortController();

  // Store abort controller for stop endpoint
  activeSessions.set(req.userId, abortController);

  // Run the scan/discovery/fuzz in background
  try {
    await service.run({
      // ... params
      onProgress: (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
      signal: abortController.signal,
    });

    // Send completion event
    res.write(`data: ${JSON.stringify({ type: 'complete', data: results })}\n\n`);
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', data: { message: error.message } })}\n\n`);
  } finally {
    activeSessions.delete(req.userId);
    res.end();
  }
}
```

---

## 9. Integration Points with Existing Codebase

### Files That Need Modification (NOT New Files)

| Existing File | Modification | Features |
|:-------------|:------------|:---------|
| `apps/api/src/app.ts` | Register 6 new route modules | U3, U4, U5, U7, U9, U10 |
| `apps/api/src/modules/ai/ai.controller.ts` | Add 8 new endpoints | U1, U2, U6, U8, U11, U12 |
| `apps/api/src/modules/ai/ai.routes.ts` | Register 8 new routes | U1, U2, U6, U8, U11, U12 |
| `apps/api/src/modules/executor/executor.service.ts` | Trigger post_response hook | U5 |
| `apps/api/src/modules/collection-runner/collection-runner.service.ts` | Trigger run_complete hook | U6, U12 |
| `apps/web/src/components/request-builder/RequestBuilder.tsx` | Add NLRequestBar, DataGenerator button | U1, U11 |
| `apps/web/src/components/response-viewer/ResponseViewer.tsx` | Add AnomalyBanner, Optimizer indicator | U5, U8 |
| `apps/web/src/components/sidebar/Sidebar.tsx` | Add Discovery, Security, Fuzz menu items | U3, U9, U10 |
| `apps/web/src/components/layout/TopBar.tsx` | Add Optimizer lightbulb icon | U8 |
| `apps/web/src/components/dashboard/TestDashboard.tsx` | Add HealthScore widget | U12 |
| `apps/web/src/app/router.tsx` | Add routes for new pages (if any) | Dashboard |

---

## 10. Testing Strategy

### Automated Tests for Phase 3

```
tests/
├── unit/
│   ├── anomaly-detection.test.ts  — Baseline calculation, anomaly detection rules
│   ├── payload-generators.test.ts — Fuzz payload generation correctness
│   ├── attack-payloads.test.ts    — Security payload library
│   ├── hook-registry.test.ts      — Hook registration and triggering
│   └── mock-data-generator.test.ts — Data generation quality
├── integration/
│   ├── nl-to-request.test.ts      — NL→Request with Gemini mock
│   ├── security-scanner.test.ts   — OWASP checks against test server
│   └── api-discovery.test.ts      — Discovery against known API
└── e2e/
    └── phase3-features.test.ts    — End-to-end feature verification
```

### Manual Testing Checklist

- [ ] U1: Type "Get all users" → verify request is generated correctly
- [ ] U2: Have a 3-turn conversation → verify test suite builds incrementally
- [ ] U3: Discover a public API (e.g., JSONPlaceholder) → verify endpoints found
- [ ] U4: Generate mock server → verify CRUD state works
- [ ] U5: Send same request 5+ times → verify baseline forms → modify response → verify anomaly detected
- [ ] U6: Run collection tests → verify profiler generates bottleneck report
- [ ] U7: Compare responses from different dates → verify diff report
- [ ] U8: Send a request → verify optimization suggestions appear
- [ ] U9: Run security scan on test API → verify OWASP checks pass/fail correctly
- [ ] U10: Fuzz test a POST endpoint → verify payloads generated and executed
- [ ] U11: Click "Generate Data" → verify realistic, contextual data
- [ ] U12: View health score dashboard → verify score and recommendations

---

## 11. Deployment Considerations

### Environment Variables (New for Phase 3)

```env
# No new env vars required — all Phase 3 features use existing:
# GEMINI_API_KEY — existing
# GEMINI_MODEL — existing
# MONGODB_URI — existing

# Optional (for mock server):
MOCK_SERVER_PORT_RANGE_START=3001
MOCK_SERVER_PORT_RANGE_END=3010
```

### Performance Impact

| Feature | Impact on Main Server | Mitigation |
|:--------|:---------------------|:-----------|
| U5: Anomaly Detection | ~5ms per request (baseline comparison) | Async baseline update (fire-and-forget) |
| U3: API Discovery | Network-intensive during scan | Rate limiting (5 req/s), separate abort |
| U9: Security Scanner | Sends many requests rapidly | Rate limiting (10 req/s), user-initiated only |
| U10: Fuzz Testing | Sends many adversarial requests | Rate limiting (5 req/s), user-initiated only |
| U4: Mock Server | Runs on separate port | Express Router on different port |

### Bundle Size Impact (Frontend)

| Addition | Est. Size | Dependency |
|:---------|:----------|:-----------|
| 12 new component folders | ~80KB | None |
| 8 new Zustand stores | ~15KB | None |
| 8 new service files | ~10KB | None |
| recharts (if not already) | ~150KB gzipped | recharts |
| **Total addition** | **~255KB** | Minimal |

---

*This completes the Phase 3 documentation suite. All 5 documents together provide:*

| # | File | Content |
|:--|:-----|:--------|
| 1 | `Phase3_01_Unique_AI_Features_Overview.md` | 12 features overview, competitive analysis, priority matrix |
| 2 | `Phase3_02_Master_AI_Prompts.md` | Copy-paste prompts for building all 12 features |
| 3 | `Phase3_03_Multi_Agent_Skills_and_Hooks.md` | Skill files, agent configs, lifecycle hooks |
| 4 | `Phase3_04_AI_System_Prompts_Library.md` | Internal AI prompts used by the features |
| 5 | `Phase3_05_Implementation_Architecture.md` | Database models, API specs, component hierarchy |
