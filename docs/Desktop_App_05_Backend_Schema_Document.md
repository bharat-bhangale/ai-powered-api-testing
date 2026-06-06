# ATX Desktop Application - Backend Schema Document

Version: 2.0
Date: June 2026
Product: ATX Desktop
Audience: AI coding agents implementing data models, migrations, repositories, and API contracts

## 1. Schema Goal

This document defines the current ATX web data model and the target ATX Desktop local-first data model.

Current web mode:

- MongoDB Atlas.
- Mongoose models.
- JWT authenticated users.
- Multi-user data through `userId`.

Target desktop mode:

- SQLite database under Electron `app.getPath('userData')`.
- Drizzle ORM.
- Single local user by default.
- Optional passphrase lock.
- Secret values stored in OS keychain where supported.
- Same API response envelope and endpoint behavior as web mode.

## 2. Data Model Summary

| Domain | Current MongoDB model | Target SQLite table | Desktop purpose |
|:--|:--|:--|:--|
| User | `User` | `users` | Local profile and preferences |
| Collection | `Collection` | `collections` | Top-level request groups |
| Folder | Embedded in collection | `collection_folders` | Nested organization |
| Request | `SavedRequest` | `requests` | Saved request definitions |
| Environment | `Environment` | `environments` | Variable sets |
| History | `History` | `history_entries` | Request and response log |
| Test run | `TestRun` | `test_runs` | Collection run records |
| Schedule | `Schedule` | `schedules` | Recurring collection runs |
| Schema contract | `SchemaContract` | `schema_contracts` | Inferred response schemas |
| Setting | New for desktop | `settings` | App preferences |
| Secret metadata | New for desktop | `secret_references` | Keychain reference records |
| Certificate | New for desktop | `certificates` | Client certificate metadata |
| Backup | New for desktop | `backups` | Backup and restore metadata |

## 3. Shared Conventions

### 3.1 IDs

- SQLite IDs are text UUIDs unless a fixed local ID is specified.
- Client-created temporary IDs use `crypto.randomUUID()`.
- Desktop local user ID is `local-user`.
- MongoDB ObjectIds remain valid in web mode.

### 3.2 Timestamps

- SQLite timestamp columns are ISO strings.
- Names: `created_at`, `updated_at`, `deleted_at` if soft delete is introduced.
- API responses should map timestamp columns to camelCase fields.

### 3.3 JSON Columns

Nested structures may be stored as JSON text in SQLite when normalization would add more complexity than value.

Rules:

- Parse and validate JSON columns before use.
- Never pass raw parsed JSON into services without schema validation.
- Store empty arrays as `[]` and empty objects as `{}`.

### 3.4 Response Envelope

All endpoints return:

```ts
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
```

## 4. Runtime Data Provider

Introduce a provider boundary so web and desktop can use different storage.

```ts
export interface AtxDataProvider {
  users: UserRepository;
  collections: CollectionRepository;
  folders: CollectionFolderRepository;
  requests: RequestRepository;
  environments: EnvironmentRepository;
  history: HistoryRepository;
  testRuns: TestRunRepository;
  schedules: ScheduleRepository;
  schemaContracts: SchemaContractRepository;
  settings: SettingsRepository;
  secretReferences: SecretReferenceRepository;
  certificates: CertificateRepository;
  backups: BackupRepository;
}
```

Provider selection:

| Runtime mode | Provider |
|:--|:--|
| `web` | Mongo provider wrapping existing Mongoose models |
| `desktop` | SQLite provider using Drizzle |

Services should accept typed params and call repositories. Controllers should remain thin.

## 5. Users

### 5.1 Current MongoDB Shape

Source: `apps/api/src/models/User.model.ts`

```ts
export interface UserDocumentShape {
  id: string;
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
}
```

### 5.2 Desktop SQLite Table

```ts
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  avatar: text('avatar'),
  theme: text('theme').notNull().default('dark'),
  editorFontSize: integer('editor_font_size').notNull().default(14),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
```

Indexes:

- Unique index on `email`.

Desktop bootstrap:

- Create user with `id='local-user'`.
- Password hash is null unless passphrase lock is enabled.
- The local user is attached to API requests in desktop mode.

## 6. Collections

### 6.1 Current MongoDB Shape

Source: `apps/api/src/models/Collection.model.ts`

```ts
export interface CollectionDocumentShape {
  id: string;
  name: string;
  description: string;
  userId: string;
  folders: CollectionFolderShape[];
  auth: RequestAuthShape;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### 6.2 Desktop SQLite Tables

Normalize folders into a separate table for easier move, delete, and ordering operations.

```ts
export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  authType: text('auth_type').notNull().default('none'),
  authConfigJson: text('auth_config_json').notNull().default('{}'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const collectionFolders = sqliteTable('collection_folders', {
  id: text('id').primaryKey(),
  collectionId: text('collection_id')
    .notNull()
    .references(() => collections.id, { onDelete: 'cascade' }),
  parentFolderId: text('parent_folder_id'),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
```

Indexes:

- `collections_user_sort_idx` on `(user_id, sort_order)`.
- `folders_collection_sort_idx` on `(collection_id, sort_order)`.
- `folders_parent_idx` on `(parent_folder_id)`.

Auth config JSON shape:

```ts
export interface RequestAuthShape {
  type: 'none' | 'apikey' | 'bearer' | 'basic';
  config: Record<string, unknown>;
}
```

## 7. Requests

### 7.1 Current MongoDB Shape

Source: `apps/api/src/models/Request.model.ts`

```ts
export interface SavedRequestDocumentShape {
  id: string;
  name: string;
  collectionId: string;
  folderId: string | null;
  userId: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  url: string;
  headers: KeyValueRowShape[];
  params: KeyValueRowShape[];
  body: RequestBodyShape;
  auth: RequestAuthShape;
  sortOrder: number;
  testScript: string;
  preRequestScript: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 7.2 Desktop SQLite Table

```ts
export const requests = sqliteTable('requests', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  collectionId: text('collection_id')
    .notNull()
    .references(() => collections.id, { onDelete: 'cascade' }),
  folderId: text('folder_id').references(() => collectionFolders.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  method: text('method').notNull().default('GET'),
  url: text('url').notNull().default(''),
  headersJson: text('headers_json').notNull().default('[]'),
  paramsJson: text('params_json').notNull().default('[]'),
  bodyMode: text('body_mode').notNull().default('none'),
  bodyContent: text('body_content').notNull().default(''),
  bodyContentType: text('body_content_type').notNull().default('application/json'),
  authType: text('auth_type').notNull().default('none'),
  authConfigJson: text('auth_config_json').notNull().default('{}'),
  sortOrder: integer('sort_order').notNull().default(0),
  testScript: text('test_script').notNull().default(''),
  preRequestScript: text('pre_request_script').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
```

Indexes:

- `requests_collection_sort_idx` on `(collection_id, sort_order)`.
- `requests_folder_idx` on `(folder_id)`.
- `requests_user_idx` on `(user_id)`.
- `requests_method_idx` on `(method)`.

Shared row shapes:

```ts
export interface KeyValueRowShape {
  id?: string;
  key: string;
  value: string;
  description: string;
  enabled: boolean;
  secretRefId?: string;
}

export interface RequestBodyShape {
  mode: 'none' | 'raw' | 'json' | 'form-data' | 'binary';
  content: string;
  contentType: string;
}
```

## 8. Environments

### 8.1 Current MongoDB Shape

Source: `apps/api/src/models/Environment.model.ts`

```ts
export interface EnvironmentDocumentShape {
  id: string;
  name: string;
  userId: string;
  variables: EnvironmentVariableShape[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 8.2 Desktop SQLite Table

```ts
export const environments = sqliteTable('environments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  variablesJson: text('variables_json').notNull().default('[]'),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
```

Indexes:

- `environments_user_idx` on `(user_id)`.
- Unique index on `(user_id, name)`.

Variable shape:

```ts
export interface EnvironmentVariableShape {
  id: string;
  key: string;
  value: string;
  type: 'text' | 'secret';
  description: string;
  secretRefId?: string;
}
```

Secret variable rule:

- `value` is empty or redacted for secret variables after save.
- `secretRefId` points to `secret_references.id`.

## 9. History Entries

### 9.1 Current MongoDB Shape

Source: `apps/api/src/models/History.model.ts`

```ts
export interface HistoryDocumentShape {
  id: string;
  userId: string;
  request: HistoryRequestShape;
  response: HistoryResponseShape;
  collectionId?: string;
  requestId?: string;
  environmentName?: string;
  executedAt: Date;
}
```

### 9.2 Desktop SQLite Table

```ts
export const historyEntries = sqliteTable('history_entries', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  collectionId: text('collection_id').references(() => collections.id, { onDelete: 'set null' }),
  requestId: text('request_id').references(() => requests.id, { onDelete: 'set null' }),
  environmentName: text('environment_name'),
  requestJson: text('request_json').notNull(),
  responseJson: text('response_json').notNull(),
  executedAt: text('executed_at').notNull(),
  createdAt: text('created_at').notNull(),
});
```

Indexes:

- `history_user_executed_idx` on `(user_id, executed_at)`.
- `history_request_idx` on `(request_id)`.
- `history_collection_idx` on `(collection_id)`.

Retention:

- Default retention is 90 days.
- Retention cleanup runs on startup and at scheduled intervals.
- User can change retention in Settings.

## 10. Test Runs

### 10.1 Current MongoDB Shape

Source: `apps/api/src/modules/test-runs/TestRun.model.ts`

```ts
export interface TestRunDocumentShape {
  id: string;
  userId: string;
  collectionId: string;
  collectionName: string;
  environmentId?: string;
  trigger: 'manual' | 'scheduled' | 'ci';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  results: RequestRunResultShape[];
  summary: TestRunSummaryShape;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 10.2 Desktop SQLite Table

```ts
export const testRuns = sqliteTable('test_runs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  collectionId: text('collection_id').notNull().references(() => collections.id),
  collectionName: text('collection_name').notNull(),
  environmentId: text('environment_id').references(() => environments.id, { onDelete: 'set null' }),
  trigger: text('trigger').notNull().default('manual'),
  status: text('status').notNull().default('running'),
  resultsJson: text('results_json').notNull().default('[]'),
  totalRequests: integer('total_requests').notNull().default(0),
  completedRequests: integer('completed_requests').notNull().default(0),
  totalTestsPassed: integer('total_tests_passed').notNull().default(0),
  totalTestsFailed: integer('total_tests_failed').notNull().default(0),
  totalDuration: integer('total_duration').notNull().default(0),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
```

Indexes:

- `test_runs_user_created_idx` on `(user_id, created_at)`.
- `test_runs_collection_idx` on `(collection_id)`.
- `test_runs_status_idx` on `(status)`.

## 11. Schedules

### 11.1 Current MongoDB Shape

Source: `apps/api/src/modules/schedules/Schedule.model.ts`

```ts
export interface ScheduleDocumentShape {
  id: string;
  userId: string;
  collectionId: string;
  collectionName: string;
  environmentId?: string;
  cronExpression: string;
  label: string;
  enabled: boolean;
  webhookUrl?: string;
  notifyEmail?: string;
  lastRunAt?: Date;
  lastRunStatus?: 'completed' | 'failed';
  lastRunId?: string;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 11.2 Desktop SQLite Table

```ts
export const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  collectionId: text('collection_id').notNull().references(() => collections.id),
  collectionName: text('collection_name').notNull(),
  environmentId: text('environment_id').references(() => environments.id, { onDelete: 'set null' }),
  cronExpression: text('cron_expression').notNull(),
  label: text('label').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  webhookUrl: text('webhook_url'),
  notifyEmail: text('notify_email'),
  notifyDesktop: integer('notify_desktop', { mode: 'boolean' }).notNull().default(true),
  lastRunAt: text('last_run_at'),
  lastRunStatus: text('last_run_status'),
  lastRunId: text('last_run_id').references(() => testRuns.id, { onDelete: 'set null' }),
  nextRunAt: text('next_run_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
```

Indexes:

- `schedules_user_idx` on `(user_id)`.
- `schedules_enabled_next_idx` on `(enabled, next_run_at)`.

Desktop rule:

- Schedules run only while the app or tray process is active.

## 12. Schema Contracts

### 12.1 Current MongoDB Shape

Source: `apps/api/src/modules/schema-validator/SchemaContract.model.ts`

```ts
export interface SchemaContractDocumentShape {
  id: string;
  userId: string;
  endpointKey: string;
  method: string;
  pathPattern: string;
  contractSchema: Record<string, unknown>;
  sampleCount: number;
  lastInferredAt: Date;
  violations: SchemaViolationShape[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 12.2 Desktop SQLite Table

```ts
export const schemaContracts = sqliteTable('schema_contracts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  endpointKey: text('endpoint_key').notNull(),
  method: text('method').notNull(),
  pathPattern: text('path_pattern').notNull(),
  contractSchemaJson: text('contract_schema_json').notNull(),
  sampleCount: integer('sample_count').notNull().default(0),
  violationsJson: text('violations_json').notNull().default('[]'),
  lastInferredAt: text('last_inferred_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
```

Indexes:

- Unique index on `(user_id, endpoint_key)`.
- `schema_contracts_method_idx` on `(method)`.

Violation shape:

```ts
export interface SchemaViolationShape {
  field: string;
  type: 'missing_field' | 'type_change' | 'unexpected_field' | 'null_value';
  message: string;
  detectedAt: string;
}
```

## 13. Settings

Desktop-only table.

```ts
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  valueJson: text('value_json').notNull(),
  updatedAt: text('updated_at').notNull(),
});
```

Required setting keys:

| Key | Value shape |
|:--|:--|
| `general` | theme, startup route, minimize to tray, history retention |
| `ai` | model, usage visibility, key reference |
| `proxy` | mode, host, port, auth reference |
| `certificates` | default certificate ID |
| `updates` | channel, auto check, auto download |
| `data` | backup location, backup retention |
| `passphrase` | enabled, password hash metadata |

Settings repository must return defaults if a key is missing.

## 14. Secret References

Desktop-only table. This table stores metadata only. Secret values live in keychain.

```ts
export const secretReferences = sqliteTable('secret_references', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  scope: text('scope').notNull(),
  label: text('label').notNull(),
  keychainService: text('keychain_service').notNull(),
  keychainAccount: text('keychain_account').notNull(),
  redactedPreview: text('redacted_preview').notNull().default('********'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
```

Allowed scopes:

- `gemini-api-key`
- `environment-variable`
- `request-auth`
- `collection-auth`
- `proxy-auth`
- `certificate-passphrase`

Rules:

- Delete secret reference should also delete keychain value.
- Exports include scope, label, and redacted preview only.
- Logs must never include keychain account values if they contain user secrets.

## 15. Certificates

Desktop-only table.

```ts
export const certificates = sqliteTable('certificates', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  label: text('label').notNull(),
  certificateType: text('certificate_type').notNull(),
  filePath: text('file_path').notNull(),
  passphraseSecretRefId: text('passphrase_secret_ref_id').references(() => secretReferences.id),
  fingerprint: text('fingerprint'),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
```

Allowed certificate types:

- `pem`
- `pfx`

Rules:

- Certificate files are copied into app data.
- File permissions should restrict other users where the OS supports it.
- Executor applies certificates per request or collection config.

## 16. Backups

Desktop-only table.

```ts
export const backups = sqliteTable('backups', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  filePath: text('file_path').notNull(),
  kind: text('kind').notNull(),
  status: text('status').notNull(),
  sizeBytes: integer('size_bytes').notNull().default(0),
  checksum: text('checksum'),
  createdAt: text('created_at').notNull(),
  completedAt: text('completed_at'),
});
```

Allowed kinds:

- `manual`
- `automatic`
- `pre-restore`
- `pre-migration`

Allowed statuses:

- `running`
- `completed`
- `failed`

Backup manifest shape:

```ts
export interface BackupManifestShape {
  product: 'ATX Desktop';
  version: string;
  createdAt: string;
  databaseSchemaVersion: number;
  includesSecrets: false;
  tables: string[];
}
```

## 17. Endpoint Inventory

The desktop backend must preserve these existing endpoint groups.

| Group | Base path | Purpose |
|:--|:--|:--|
| Health | `/health` | Runtime health |
| Executor | `/api/execute` | Send HTTP requests |
| Auth | `/api/auth` | Web login, register, refresh; desktop bypass |
| Collections | `/api/collections` | Collection and folder CRUD |
| Requests | `/api/requests` | Saved request CRUD |
| Environments | `/api/environments` | Environment CRUD |
| History | `/api/history` | Request history |
| Import | `/api/import` | cURL and Postman import |
| AI | `/api/ai` | Chat, test generation, debug, suites, docs, coverage |
| Test runner | `/api/test-runner` | Run request test scripts |
| Collection runner | `/api/collection-runner` or current mounted route | Run collection |
| Schedules | `/api/schedules` | Schedule CRUD |
| Schema validator | `/api/schema-validator` | Infer and validate schema contracts |
| Environment matrix | `/api/environment-matrix` | Multi-environment checks |
| Dashboard | `/api/dashboard` | Dashboard summaries |
| Test trends | `/api/test-runs` | Test trend data |

Desktop-only endpoint additions:

| Method | Path | Purpose |
|:--|:--|:--|
| `GET` | `/api/settings` | Read all settings |
| `PATCH` | `/api/settings/:key` | Update one settings group |
| `POST` | `/api/backups` | Create backup |
| `POST` | `/api/backups/restore` | Restore backup |
| `GET` | `/api/runtime` | Return runtime mode and local status |
| `POST` | `/api/certificates` | Register imported certificate metadata |
| `GET` | `/api/certificates` | List certificates |
| `DELETE` | `/api/certificates/:id` | Remove certificate metadata and file |

All new request bodies require Zod schemas.

## 18. Repository Method Requirements

### 18.1 Collections

Required repository methods:

- `listByUser(userId)`
- `getById(params)`
- `create(input)`
- `update(input)`
- `delete(params)`
- `reorder(input)`

### 18.2 Requests

Required repository methods:

- `listByCollection(params)`
- `getById(params)`
- `create(input)`
- `update(input)`
- `delete(params)`
- `move(input)`
- `duplicate(input)`

### 18.3 Environments

Required repository methods:

- `listByUser(userId)`
- `getById(params)`
- `create(input)`
- `update(input)`
- `delete(params)`
- `setDefault(input)`

### 18.4 History

Required repository methods:

- `record(input)`
- `search(input)`
- `getById(params)`
- `delete(params)`
- `clearByUser(userId)`
- `deleteOlderThan(input)`

### 18.5 Settings

Required repository methods:

- `getAll()`
- `getByKey(key)`
- `set(input)`
- `reset(key)`

## 19. Migration Order

SQLite migration order:

1. `users`
2. `settings`
3. `collections`
4. `collection_folders`
5. `secret_references`
6. `environments`
7. `requests`
8. `history_entries`
9. `test_runs`
10. `schedules`
11. `schema_contracts`
12. `certificates`
13. `backups`

Service migration order:

1. Runtime and local user bootstrap.
2. Settings and secrets.
3. Collections and folders.
4. Requests.
5. Environments.
6. Executor history write.
7. Test runner and collection runner.
8. Schedules and test runs.
9. Schema validator and dashboard.
10. Import, export, backup, restore.

## 20. Validation Requirements

Every create and update endpoint must validate:

- Required fields.
- String length.
- Allowed enum values.
- JSON column shapes.
- Ownership through `userId`.
- Secret reference ownership.
- Collection and folder relationship validity.

Validation location:

- Request body schemas live near module route or validation files.
- Repository input schemas may live in `packages/shared` or module-local validation files.
- IPC schemas live in `apps/desktop/src/shared/ipc-schemas.ts`.

## 21. Data Export Shape

ATX collection export:

```ts
export interface AtxCollectionExportShape {
  format: 'atx.collection';
  version: 1;
  exportedAt: string;
  collection: CollectionExportShape;
  folders: CollectionFolderExportShape[];
  requests: RequestExportShape[];
}
```

ATX full backup export:

```ts
export interface AtxBackupExportShape {
  manifest: BackupManifestShape;
  users: UserExportShape[];
  settings: SettingsExportShape[];
  collections: CollectionExportShape[];
  folders: CollectionFolderExportShape[];
  requests: RequestExportShape[];
  environments: EnvironmentExportShape[];
  historyEntries: HistoryExportShape[];
  testRuns: TestRunExportShape[];
  schedules: ScheduleExportShape[];
  schemaContracts: SchemaContractExportShape[];
  certificates: CertificateExportShape[];
}
```

Secret export rule:

- Default exports do not include secret values.
- Secret fields include `redactedPreview` and `secretMissingOnImport: true`.

## 22. Acceptance Checklist

The schema work is complete when:

- Desktop mode can start without `MONGODB_URI`.
- SQLite database is created in the desktop data directory.
- Migrations create every table listed in this document.
- Local user is created exactly once.
- Collections, folders, requests, environments, history, test runs, schedules, and schema contracts persist after restart.
- Secret values are not stored in SQLite.
- Backup and restore validate payload shape before writes.
- Web mode remains compatible with MongoDB and existing auth behavior.
