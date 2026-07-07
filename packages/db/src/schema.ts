/**
 * Drizzle SQLite schema definitions for ATX Desktop.
 *
 * All tables follow the conventions in docs/Desktop_App_05_Backend_Schema_Document.md:
 *   - IDs: text UUIDs (or fixed 'local-user' for the local user)
 *   - Timestamps: ISO string columns named created_at / updated_at
 *   - JSON columns: stored as text, validated by repositories before use
 *   - Secret values: NEVER stored — only references (keychain_service + keychain_account)
 *
 * Migration order (from schema doc §19):
 *   1. users
 *   2. settings
 *   3. collections
 *   4. collection_folders
 *   5. secret_references
 *   6. environments
 *   7. requests
 *   8. history_entries
 *   9. test_runs
 *  10. schedules
 *  11. schema_contracts
 *  12. certificates
 *  13. backups
 */

import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

// ===== 1. Users =====

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash'),
    avatar: text('avatar'),
    theme: text('theme').notNull().default('dark'),
    editorFontSize: integer('editor_font_size').notNull().default(14),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [uniqueIndex('users_email_uidx').on(t.email)],
);

// ===== 2. Settings =====

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  valueJson: text('value_json').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ===== 3. Collections =====

export const collections = sqliteTable(
  'collections',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    authType: text('auth_type').notNull().default('none'),
    authConfigJson: text('auth_config_json').notNull().default('{}'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('collections_user_sort_idx').on(t.userId, t.sortOrder)],
);

// ===== 4. Collection Folders =====

export const collectionFolders = sqliteTable(
  'collection_folders',
  {
    id: text('id').primaryKey(),
    collectionId: text('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    parentFolderId: text('parent_folder_id'),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('folders_collection_sort_idx').on(t.collectionId, t.sortOrder),
    index('folders_parent_idx').on(t.parentFolderId),
  ],
);

// ===== 5. Secret References =====
// Stores metadata ONLY — actual secret values live in OS keychain.

export const secretReferences = sqliteTable('secret_references', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  scope: text('scope').notNull(),
  label: text('label').notNull(),
  keychainService: text('keychain_service').notNull(),
  keychainAccount: text('keychain_account').notNull(),
  redactedPreview: text('redacted_preview').notNull().default('********'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ===== 6. Environments =====

export const environments = sqliteTable(
  'environments',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    variablesJson: text('variables_json').notNull().default('[]'),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('environments_user_idx').on(t.userId),
    uniqueIndex('environments_user_name_uidx').on(t.userId, t.name),
  ],
);

// ===== 7. Requests =====

export const requests = sqliteTable(
  'requests',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
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
  },
  (t) => [
    index('requests_collection_sort_idx').on(t.collectionId, t.sortOrder),
    index('requests_folder_idx').on(t.folderId),
    index('requests_user_idx').on(t.userId),
    index('requests_method_idx').on(t.method),
  ],
);

// ===== 8. History Entries =====

export const historyEntries = sqliteTable(
  'history_entries',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    collectionId: text('collection_id').references(() => collections.id, { onDelete: 'set null' }),
    requestId: text('request_id').references(() => requests.id, { onDelete: 'set null' }),
    environmentName: text('environment_name'),
    requestJson: text('request_json').notNull(),
    responseJson: text('response_json').notNull(),
    executedAt: text('executed_at').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    index('history_user_executed_idx').on(t.userId, t.executedAt),
    index('history_request_idx').on(t.requestId),
    index('history_collection_idx').on(t.collectionId),
  ],
);

// ===== 9. Test Runs =====

export const testRuns = sqliteTable(
  'test_runs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    collectionId: text('collection_id')
      .notNull()
      .references(() => collections.id),
    collectionName: text('collection_name').notNull(),
    environmentId: text('environment_id').references(() => environments.id, {
      onDelete: 'set null',
    }),
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
  },
  (t) => [
    index('test_runs_user_created_idx').on(t.userId, t.createdAt),
    index('test_runs_collection_idx').on(t.collectionId),
    index('test_runs_status_idx').on(t.status),
  ],
);

// ===== 10. Schedules =====

export const schedules = sqliteTable(
  'schedules',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    collectionId: text('collection_id')
      .notNull()
      .references(() => collections.id),
    collectionName: text('collection_name').notNull(),
    environmentId: text('environment_id').references(() => environments.id, {
      onDelete: 'set null',
    }),
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
  },
  (t) => [
    index('schedules_user_idx').on(t.userId),
    index('schedules_enabled_next_idx').on(t.enabled, t.nextRunAt),
  ],
);

// ===== 11. Schema Contracts =====

export const schemaContracts = sqliteTable(
  'schema_contracts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    endpointKey: text('endpoint_key').notNull(),
    method: text('method').notNull(),
    pathPattern: text('path_pattern').notNull(),
    contractSchemaJson: text('contract_schema_json').notNull(),
    sampleCount: integer('sample_count').notNull().default(0),
    violationsJson: text('violations_json').notNull().default('[]'),
    lastInferredAt: text('last_inferred_at').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('schema_contracts_user_endpoint_uidx').on(t.userId, t.endpointKey),
    index('schema_contracts_method_idx').on(t.method),
  ],
);

// ===== 12. Certificates =====

export const certificates = sqliteTable('certificates', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  label: text('label').notNull(),
  certificateType: text('certificate_type').notNull(),
  filePath: text('file_path').notNull(),
  passphraseSecretRefId: text('passphrase_secret_ref_id').references(() => secretReferences.id),
  fingerprint: text('fingerprint'),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ===== 13. Backups =====

export const backups = sqliteTable('backups', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  filePath: text('file_path').notNull(),
  kind: text('kind').notNull(),
  status: text('status').notNull(),
  sizeBytes: integer('size_bytes').notNull().default(0),
  checksum: text('checksum'),
  createdAt: text('created_at').notNull(),
  completedAt: text('completed_at'),
});

// ===== Inferred row types =====

export type UserRow = typeof users.$inferSelect;
export type InsertUserRow = typeof users.$inferInsert;

export type SettingsRow = typeof settings.$inferSelect;
export type InsertSettingsRow = typeof settings.$inferInsert;

export type CollectionRow = typeof collections.$inferSelect;
export type InsertCollectionRow = typeof collections.$inferInsert;

export type CollectionFolderRow = typeof collectionFolders.$inferSelect;
export type InsertCollectionFolderRow = typeof collectionFolders.$inferInsert;

export type SecretReferenceRow = typeof secretReferences.$inferSelect;
export type InsertSecretReferenceRow = typeof secretReferences.$inferInsert;

export type EnvironmentRow = typeof environments.$inferSelect;
export type InsertEnvironmentRow = typeof environments.$inferInsert;

export type RequestRow = typeof requests.$inferSelect;
export type InsertRequestRow = typeof requests.$inferInsert;

export type HistoryEntryRow = typeof historyEntries.$inferSelect;
export type InsertHistoryEntryRow = typeof historyEntries.$inferInsert;

export type TestRunRow = typeof testRuns.$inferSelect;
export type InsertTestRunRow = typeof testRuns.$inferInsert;

export type ScheduleRow = typeof schedules.$inferSelect;
export type InsertScheduleRow = typeof schedules.$inferInsert;

export type SchemaContractRow = typeof schemaContracts.$inferSelect;
export type InsertSchemaContractRow = typeof schemaContracts.$inferInsert;

export type CertificateRow = typeof certificates.$inferSelect;
export type InsertCertificateRow = typeof certificates.$inferInsert;

export type BackupRow = typeof backups.$inferSelect;
export type InsertBackupRow = typeof backups.$inferInsert;
