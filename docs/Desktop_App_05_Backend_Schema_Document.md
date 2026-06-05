# ATX Desktop Application — Backend Schema Document

> **Version:** 1.0  
> **Date:** June 2026

---

## 1. Schema Overview

This document defines every data model used in ATX, covering both the current MongoDB/Mongoose schemas and the target SQLite/Drizzle schemas for the desktop migration.

### 1.1 Model Summary

| # | Model | Table | Records | Purpose |
|:--|:------|:------|:--------|:--------|
| 1 | `User` | `users` | Single (desktop) | User profile and preferences |
| 2 | `Collection` | `collections` | ~10-50 | Groups of API requests |
| 3 | `SavedRequest` | `requests` | ~50-500 | Individual API request configs |
| 4 | `Environment` | `environments` | ~3-10 | Variable sets (dev/staging/prod) |
| 5 | `History` | `history` | ~1000+ | Auto-saved request/response log |
| 6 | `TestRun` | `test_runs` | ~100+ | Collection runner execution records |
| 7 | `Schedule` | `schedules` | ~5-20 | Cron-based recurring test runs |
| 8 | `SchemaContract` | `schema_contracts` | ~50-200 | AI-inferred response schemas |
| 9 | `Settings` | `settings` | 1 | App-wide preferences (desktop) |

---

## 2. Detailed Schema Definitions

### 2.1 Users

**Purpose:** Stores user identity. In desktop mode, this is single-user (no auth flow required). In web mode, supports multi-user with JWT auth.

**Current (MongoDB/Mongoose):**

```typescript
interface IUser {
  _id: ObjectId;
  email: string;              // unique, lowercase, required
  name: string;               // required
  passwordHash: string;       // bcrypt hashed (removed from toJSON)
  avatar?: string;            // URL or base64
  preferences: {
    theme: 'dark' | 'light' | 'system';  // default: 'dark'
    editorFontSize: number;              // default: 14
  };
  createdAt: Date;
  updatedAt: Date;
}
```

**Target (SQLite/Drizzle):**

```typescript
// packages/db/schema.ts
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),           // UUID
  email: text('email').notNull(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),   // nullable in desktop mode
  avatar: text('avatar'),
  theme: text('theme').default('dark'),  // 'dark' | 'light' | 'system'
  editorFontSize: integer('editor_font_size').default(14),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
```

**Indexes:** `email` (unique)

---

### 2.2 Collections

**Purpose:** Top-level container for API requests. Contains nested folders with parent references.

**Current (MongoDB/Mongoose):**

```typescript
interface ICollection {
  _id: ObjectId;
  name: string;               // required, trimmed
  description: string;        // default: ''
  userId: ObjectId;           // ref: 'User', required
  folders: Array<{
    _id: ObjectId;
    name: string;             // required
    parentFolderId: ObjectId | null;
    sortOrder: number;        // default: 0
  }>;
  auth: {
    type: 'none' | 'apikey' | 'bearer' | 'basic'; // default: 'none'
    config: Record<string, unknown>;                // default: {}
  };
  sortOrder: number;          // default: 0
  createdAt: Date;
  updatedAt: Date;
}
```

**Target (SQLite/Drizzle):**

```typescript
export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').default(''),
  userId: text('user_id').references(() => users.id),
  foldersJson: text('folders_json').default('[]'),     // JSON array
  authType: text('auth_type').default('none'),
  authConfigJson: text('auth_config_json').default('{}'),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
```

**Indexes:** `(userId, sortOrder)`

**Folder JSON structure:**
```json
[
  { "id": "uuid", "name": "Auth", "parentFolderId": null, "sortOrder": 0 },
  { "id": "uuid", "name": "Admin", "parentFolderId": "uuid", "sortOrder": 1 }
]
```

---

### 2.3 Saved Requests

**Purpose:** Individual API request configuration — method, URL, headers, body, auth, test scripts.

**Current (MongoDB/Mongoose):**

```typescript
interface ISavedRequest {
  _id: ObjectId;
  name: string;               // required, trimmed
  collectionId: ObjectId;     // ref: 'Collection', required
  folderId: ObjectId | null;
  userId: ObjectId;           // ref: 'User', required
  method: string;             // GET, POST, PUT, PATCH, DELETE, etc.
  url: string;                // URL with {{variable}} placeholders
  headers: Array<{
    key: string;
    value: string;
    description: string;
    enabled: boolean;
  }>;
  params: Array<{
    key: string;
    value: string;
    description: string;
    enabled: boolean;
  }>;
  body: {
    mode: string;             // 'none' | 'raw' | 'json' | 'form-data' | 'binary'
    content: string;
    contentType: string;
  };
  auth: {
    type: string;             // 'none' | 'bearer' | 'basic' | 'apikey'
    config: Record<string, unknown>;
  };
  sortOrder: number;
  testScript: string;         // JavaScript test assertions
  preRequestScript: string;   // JavaScript pre-request logic
  createdAt: Date;
  updatedAt: Date;
}
```

**Target (SQLite/Drizzle):**

```typescript
export const requests = sqliteTable('requests', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  collectionId: text('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  folderId: text('folder_id'),
  userId: text('user_id').references(() => users.id),
  method: text('method').notNull().default('GET'),
  url: text('url').notNull().default(''),
  headersJson: text('headers_json').default('[]'),
  paramsJson: text('params_json').default('[]'),
  bodyMode: text('body_mode').default('none'),
  bodyContent: text('body_content').default(''),
  bodyContentType: text('body_content_type').default('application/json'),
  authType: text('auth_type').default('none'),
  authConfigJson: text('auth_config_json').default('{}'),
  sortOrder: integer('sort_order').default(0),
  testScript: text('test_script').default(''),
  preRequestScript: text('pre_request_script').default(''),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
```

**Indexes:** `(collectionId, sortOrder)`, `(userId)`

---

### 2.4 Environments

**Purpose:** Named sets of key-value variables for substituting `{{variable}}` in requests.

**Current (MongoDB/Mongoose):**

```typescript
interface IEnvironment {
  _id: ObjectId;
  name: string;               // required, trimmed
  userId: ObjectId;           // ref: 'User', required
  variables: Array<{
    key: string;              // required
    value: string;            // default: ''
    type: 'text' | 'secret';  // default: 'text'
    description: string;      // default: ''
  }>;
  isDefault: boolean;         // default: false
  createdAt: Date;
  updatedAt: Date;
}
```

**Target (SQLite/Drizzle):**

```typescript
export const environments = sqliteTable('environments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  userId: text('user_id').references(() => users.id),
  variablesJson: text('variables_json').default('[]'),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
```

**Indexes:** `(userId)`

---

### 2.5 History

**Purpose:** Auto-saved record of every request/response pair. TTL of 90 days.

**Current (MongoDB/Mongoose):**

```typescript
interface IHistory {
  _id: ObjectId;
  userId: ObjectId;           // ref: 'User', required
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: unknown;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    size: number;
    timing: { total: number };
  };
  collectionId?: ObjectId;
  requestId?: ObjectId;
  environmentName?: string;
  executedAt: Date;           // default: Date.now, TTL: 90 days
}
```

**Target (SQLite/Drizzle):**

```typescript
export const history = sqliteTable('history', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  requestJson: text('request_json').notNull(),      // { method, url, headers, body }
  responseJson: text('response_json').notNull(),     // { status, statusText, headers, body, size, timing }
  collectionId: text('collection_id'),
  requestId: text('request_id'),
  environmentName: text('environment_name'),
  executedAt: text('executed_at').default(sql`CURRENT_TIMESTAMP`),
});
```

**Indexes:** `(userId, executedAt DESC)`, `(request.url)` — note: SQLite app manages TTL via periodic cleanup job

---

### 2.6 Test Runs

**Purpose:** Stores results from collection runner executions.

**Current (MongoDB/Mongoose):**

```typescript
interface ITestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

interface IRequestRunResult {
  requestId: string;
  requestName: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  timing: number;
  size: number;
  testResults: ITestResult[];
  totalPassed: number;
  totalFailed: number;
  error?: string;
}

interface ITestRun {
  _id: ObjectId;
  userId: ObjectId;
  collectionId: ObjectId;
  collectionName: string;
  environmentId?: ObjectId;
  trigger: 'manual' | 'scheduled' | 'ci';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  results: IRequestRunResult[];
  summary: {
    totalRequests: number;
    completedRequests: number;
    totalTestsPassed: number;
    totalTestsFailed: number;
    totalDuration: number;
  };
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Target (SQLite/Drizzle):**

```typescript
export const testRuns = sqliteTable('test_runs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  collectionId: text('collection_id').references(() => collections.id),
  collectionName: text('collection_name').notNull(),
  environmentId: text('environment_id'),
  trigger: text('trigger').default('manual'),
  status: text('status').default('running'),
  resultsJson: text('results_json').default('[]'),
  totalRequests: integer('total_requests').default(0),
  completedRequests: integer('completed_requests').default(0),
  totalTestsPassed: integer('total_tests_passed').default(0),
  totalTestsFailed: integer('total_tests_failed').default(0),
  totalDuration: integer('total_duration').default(0),
  startedAt: text('started_at').default(sql`CURRENT_TIMESTAMP`),
  completedAt: text('completed_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
```

**Indexes:** `(userId, collectionId)`, `(createdAt DESC)`

---

### 2.7 Schedules

**Purpose:** Cron-based recurring test run configuration.

**Current (MongoDB/Mongoose):**

```typescript
interface ISchedule {
  _id: ObjectId;
  userId: ObjectId;
  collectionId: ObjectId;
  collectionName: string;
  environmentId?: ObjectId;
  cronExpression: string;       // e.g., '*/5 * * * *'
  label: string;                // e.g., 'Every 5 minutes'
  enabled: boolean;
  webhookUrl?: string;          // POST failure notifications
  notifyEmail?: string;         // Email failure alerts
  lastRunAt?: Date;
  lastRunStatus?: 'completed' | 'failed';
  lastRunId?: ObjectId;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Target (SQLite/Drizzle):**

```typescript
export const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  collectionId: text('collection_id').references(() => collections.id),
  collectionName: text('collection_name').notNull(),
  environmentId: text('environment_id'),
  cronExpression: text('cron_expression').notNull(),
  label: text('label').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  webhookUrl: text('webhook_url'),
  notifyEmail: text('notify_email'),
  lastRunAt: text('last_run_at'),
  lastRunStatus: text('last_run_status'),
  lastRunId: text('last_run_id'),
  nextRunAt: text('next_run_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
```

**Indexes:** `(userId)`, `(enabled, nextRunAt)`

---

### 2.8 Schema Contracts

**Purpose:** AI-inferred JSON schemas from historical API responses, used for automatic response validation.

```typescript
interface ISchemaContract {
  _id: ObjectId;
  userId: ObjectId;
  requestIdentifier: string;   // e.g., 'GET /api/users'
  collectionId?: ObjectId;
  contractSchema: Record<string, unknown>;  // JSON Schema object
  sampleCount: number;
  lastValidatedAt?: Date;
  lastValidationPassed?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Target (SQLite/Drizzle):**

```typescript
export const schemaContracts = sqliteTable('schema_contracts', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  requestIdentifier: text('request_identifier').notNull(),
  collectionId: text('collection_id'),
  contractSchemaJson: text('contract_schema_json').notNull(),
  sampleCount: integer('sample_count').default(0),
  lastValidatedAt: text('last_validated_at'),
  lastValidationPassed: integer('last_validation_passed', { mode: 'boolean' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
```

**Indexes:** `(userId, requestIdentifier)` (unique)

---

### 2.9 Settings (Desktop-Only)

**Purpose:** App-wide preferences for the desktop app.

```typescript
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),       // 'gemini_api_key', 'proxy_host', etc.
  value: text('value').notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
```

**Known keys:**

| Key | Type | Description |
|:----|:-----|:------------|
| `theme` | `'dark' \| 'light' \| 'system'` | UI theme |
| `font_size` | `number` | Editor font size |
| `auto_save` | `boolean` | Auto-save requests |
| `minimize_to_tray` | `boolean` | Close to tray instead of quit |
| `ai_model` | `string` | Gemini model name |
| `ai_auto_test` | `boolean` | Auto-generate tests on response |
| `ai_temperature` | `number` | LLM temperature (0-1) |
| `ai_daily_limit` | `number` | Daily AI call limit |
| `proxy_enabled` | `boolean` | Custom proxy on/off |
| `proxy_host` | `string` | Proxy host:port |
| `proxy_auth_user` | `string` | Proxy username |
| `ssl_verify` | `boolean` | Global SSL verification |
| `ca_bundle_path` | `string` | Custom CA bundle file path |

**Note:** `gemini_api_key` is stored in OS Keychain via `keytar`, NOT in SQLite.

---

## 3. API Endpoints Summary

### 3.1 Auth (Web Mode Only)

| Method | Path | Description |
|:-------|:-----|:------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login → JWT + refresh cookie |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Clear refresh cookie |

### 3.2 Collections

| Method | Path | Description |
|:-------|:-----|:------------|
| GET | `/api/collections` | List all collections |
| POST | `/api/collections` | Create collection |
| GET | `/api/collections/:id` | Get single collection |
| PUT | `/api/collections/:id` | Update collection |
| DELETE | `/api/collections/:id` | Delete collection + cascade requests |

### 3.3 Requests

| Method | Path | Description |
|:-------|:-----|:------------|
| GET | `/api/requests?collectionId=x` | List requests in collection |
| POST | `/api/requests` | Create request |
| GET | `/api/requests/:id` | Get single request |
| PUT | `/api/requests/:id` | Update request |
| DELETE | `/api/requests/:id` | Delete request |
| PATCH | `/api/requests/reorder` | Reorder requests |

### 3.4 Environments

| Method | Path | Description |
|:-------|:-----|:------------|
| GET | `/api/environments` | List all environments |
| POST | `/api/environments` | Create environment |
| PUT | `/api/environments/:id` | Update environment |
| DELETE | `/api/environments/:id` | Delete environment |

### 3.5 Request Executor

| Method | Path | Description |
|:-------|:-----|:------------|
| POST | `/api/execute` | Execute a request (proxy to target) |

### 3.6 History

| Method | Path | Description |
|:-------|:-----|:------------|
| GET | `/api/history` | List history (paginated) |
| GET | `/api/history/:id` | Get single history entry |
| DELETE | `/api/history` | Clear all history |
| DELETE | `/api/history/:id` | Delete single entry |

### 3.7 Import

| Method | Path | Description |
|:-------|:-----|:------------|
| POST | `/api/import/postman` | Import Postman collection |
| POST | `/api/import/insomnia` | Import Insomnia workspace |
| POST | `/api/import/openapi` | Import OpenAPI spec |
| POST | `/api/import/curl` | Import cURL command |

### 3.8 AI Features

| Method | Path | Description |
|:-------|:-----|:------------|
| POST | `/api/ai/generate-tests` | Generate tests for a request |
| POST | `/api/ai/debug` | Debug a request/response |
| POST | `/api/ai/chat` | AI chat (SSE streaming) |
| GET | `/api/ai/usage` | Get daily AI usage stats |
| POST | `/api/ai/generate-suite` | Generate test suite for collection |
| POST | `/api/ai/analyze-coverage` | Analyze test coverage |
| POST | `/api/ai/generate-docs` | Generate API documentation |
| POST | `/api/ai/generate-docs/download` | Download OpenAPI YAML/JSON |

### 3.9 Test Runner

| Method | Path | Description |
|:-------|:-----|:------------|
| POST | `/api/test-runner/run` | Run test script against response |

### 3.10 Collection Runner

| Method | Path | Description |
|:-------|:-----|:------------|
| POST | `/api/collections/:id/run` | Run collection (SSE streaming) |
| GET | `/api/collections/:id/runs` | Get run history for collection |

### 3.11 Schedules

| Method | Path | Description |
|:-------|:-----|:------------|
| GET | `/api/schedules` | List schedules |
| POST | `/api/schedules` | Create schedule |
| PUT | `/api/schedules/:id` | Update schedule |
| DELETE | `/api/schedules/:id` | Delete schedule |
| POST | `/api/schedules/:id/toggle` | Enable/disable schedule |

### 3.12 Schema Validator

| Method | Path | Description |
|:-------|:-----|:------------|
| POST | `/api/schema-validator/validate` | Validate response against contract |
| GET | `/api/schema-validator/contracts` | List schema contracts |
| DELETE | `/api/schema-validator/contracts/:id` | Delete contract |

### 3.13 Dashboard & Trends

| Method | Path | Description |
|:-------|:-----|:------------|
| GET | `/api/dashboard` | Aggregated dashboard data |
| GET | `/api/test-runs/trends` | Trend analysis (flaky, regression, perf) |
| GET | `/api/test-runs/history` | Paginated test run history |

### 3.14 Environment Matrix

| Method | Path | Description |
|:-------|:-----|:------------|
| POST | `/api/environment-matrix/run` | Run collection across environments |

---

## 4. Entity Relationship Diagram

```
┌──────────┐       ┌──────────────┐       ┌──────────────┐
│  users   │───1:N─┤ collections  │───1:N─┤   requests   │
│          │       │              │       │              │
│  id      │       │  id          │       │  id          │
│  email   │       │  name        │       │  name        │
│  name    │       │  userId ─────┘       │  collectionId│
│  prefs   │       │  folders[]   │       │  method      │
└──────────┘       │  auth{}      │       │  url         │
      │            └──────┬───────┘       │  headers[]   │
      │                   │               │  body{}      │
      │            ┌──────┴───────┐       │  testScript  │
      ├───1:N──────┤ environments │       └──────────────┘
      │            │  variables[] │
      │            └──────────────┘
      │
      ├───1:N──────┤ history      │  (request/response blobs)
      │            └──────────────┘
      │
      ├───1:N──────┤ test_runs    │  (collection runner results)
      │            └──────────────┘
      │
      ├───1:N──────┤ schedules    │  (cron-based recurring runs)
      │            └──────────────┘
      │
      └───1:N──────┤ schema_contracts │ (AI-inferred response schemas)
                   └──────────────────┘
```
