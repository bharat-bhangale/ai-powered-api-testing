/**
 * Bootstrap migrations — creates all tables idempotently using CREATE TABLE IF NOT EXISTS.
 *
 * Run once on startup after openDatabase() and before any repository call.
 *
 * Migration order follows schema doc §19:
 *   1. users → 2. settings → 3. collections → 4. collection_folders
 *   → 5. secret_references → 6. environments → 7. requests
 *   → 8. history_entries → 9. test_runs → 10. schedules
 *   → 11. schema_contracts → 12. certificates → 13. backups
 *
 * Local user bootstrap:
 *   After table creation, the local-user row is inserted (or ignored if it already exists).
 */

import { getSqlite } from './client';

const LOCAL_USER_ID = 'local-user';
const NOW = () => new Date().toISOString();

/**
 * Runs all CREATE TABLE IF NOT EXISTS statements in the correct dependency order.
 * Safe to run on every startup — existing tables are untouched.
 */
export function runMigrations(): void {
  const sqlite = getSqlite();

  sqlite.exec(/* sql */ `
    -- ===================== 1. users =====================
    CREATE TABLE IF NOT EXISTS users (
      id               TEXT PRIMARY KEY,
      email            TEXT NOT NULL,
      name             TEXT NOT NULL,
      password_hash    TEXT,
      avatar           TEXT,
      theme            TEXT NOT NULL DEFAULT 'dark',
      editor_font_size INTEGER NOT NULL DEFAULT 14,
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_uidx ON users(email);

    -- ===================== 2. settings =====================
    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- ===================== 3. collections =====================
    CREATE TABLE IF NOT EXISTS collections (
      id               TEXT PRIMARY KEY,
      user_id          TEXT NOT NULL REFERENCES users(id),
      name             TEXT NOT NULL,
      description      TEXT NOT NULL DEFAULT '',
      auth_type        TEXT NOT NULL DEFAULT 'none',
      auth_config_json TEXT NOT NULL DEFAULT '{}',
      sort_order       INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS collections_user_sort_idx ON collections(user_id, sort_order);

    -- ===================== 4. collection_folders =====================
    CREATE TABLE IF NOT EXISTS collection_folders (
      id               TEXT PRIMARY KEY,
      collection_id    TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      parent_folder_id TEXT,
      name             TEXT NOT NULL,
      sort_order       INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS folders_collection_sort_idx ON collection_folders(collection_id, sort_order);
    CREATE INDEX IF NOT EXISTS folders_parent_idx ON collection_folders(parent_folder_id);

    -- ===================== 5. secret_references =====================
    CREATE TABLE IF NOT EXISTS secret_references (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL REFERENCES users(id),
      scope             TEXT NOT NULL,
      label             TEXT NOT NULL,
      keychain_service  TEXT NOT NULL,
      keychain_account  TEXT NOT NULL,
      redacted_preview  TEXT NOT NULL DEFAULT '********',
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL
    );

    -- ===================== 6. environments =====================
    CREATE TABLE IF NOT EXISTS environments (
      id             TEXT PRIMARY KEY,
      user_id        TEXT NOT NULL REFERENCES users(id),
      name           TEXT NOT NULL,
      variables_json TEXT NOT NULL DEFAULT '[]',
      is_default     INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS environments_user_idx ON environments(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS environments_user_name_uidx ON environments(user_id, name);

    -- ===================== 7. requests =====================
    CREATE TABLE IF NOT EXISTS requests (
      id                  TEXT PRIMARY KEY,
      user_id             TEXT NOT NULL REFERENCES users(id),
      collection_id       TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      folder_id           TEXT REFERENCES collection_folders(id) ON DELETE SET NULL,
      name                TEXT NOT NULL,
      method              TEXT NOT NULL DEFAULT 'GET',
      url                 TEXT NOT NULL DEFAULT '',
      headers_json        TEXT NOT NULL DEFAULT '[]',
      params_json         TEXT NOT NULL DEFAULT '[]',
      body_mode           TEXT NOT NULL DEFAULT 'none',
      body_content        TEXT NOT NULL DEFAULT '',
      body_content_type   TEXT NOT NULL DEFAULT 'application/json',
      auth_type           TEXT NOT NULL DEFAULT 'none',
      auth_config_json    TEXT NOT NULL DEFAULT '{}',
      sort_order          INTEGER NOT NULL DEFAULT 0,
      test_script         TEXT NOT NULL DEFAULT '',
      pre_request_script  TEXT NOT NULL DEFAULT '',
      created_at          TEXT NOT NULL,
      updated_at          TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS requests_collection_sort_idx ON requests(collection_id, sort_order);
    CREATE INDEX IF NOT EXISTS requests_folder_idx ON requests(folder_id);
    CREATE INDEX IF NOT EXISTS requests_user_idx ON requests(user_id);
    CREATE INDEX IF NOT EXISTS requests_method_idx ON requests(method);

    -- ===================== 8. history_entries =====================
    CREATE TABLE IF NOT EXISTS history_entries (
      id               TEXT PRIMARY KEY,
      user_id          TEXT NOT NULL REFERENCES users(id),
      collection_id    TEXT REFERENCES collections(id) ON DELETE SET NULL,
      request_id       TEXT REFERENCES requests(id) ON DELETE SET NULL,
      environment_name TEXT,
      request_json     TEXT NOT NULL,
      response_json    TEXT NOT NULL,
      executed_at      TEXT NOT NULL,
      created_at       TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS history_user_executed_idx ON history_entries(user_id, executed_at);
    CREATE INDEX IF NOT EXISTS history_request_idx ON history_entries(request_id);
    CREATE INDEX IF NOT EXISTS history_collection_idx ON history_entries(collection_id);

    -- ===================== 9. test_runs =====================
    CREATE TABLE IF NOT EXISTS test_runs (
      id                  TEXT PRIMARY KEY,
      user_id             TEXT NOT NULL REFERENCES users(id),
      collection_id       TEXT NOT NULL REFERENCES collections(id),
      collection_name     TEXT NOT NULL,
      environment_id      TEXT REFERENCES environments(id) ON DELETE SET NULL,
      trigger             TEXT NOT NULL DEFAULT 'manual',
      status              TEXT NOT NULL DEFAULT 'running',
      results_json        TEXT NOT NULL DEFAULT '[]',
      total_requests      INTEGER NOT NULL DEFAULT 0,
      completed_requests  INTEGER NOT NULL DEFAULT 0,
      total_tests_passed  INTEGER NOT NULL DEFAULT 0,
      total_tests_failed  INTEGER NOT NULL DEFAULT 0,
      total_duration      INTEGER NOT NULL DEFAULT 0,
      started_at          TEXT NOT NULL,
      completed_at        TEXT,
      created_at          TEXT NOT NULL,
      updated_at          TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS test_runs_user_created_idx ON test_runs(user_id, created_at);
    CREATE INDEX IF NOT EXISTS test_runs_collection_idx ON test_runs(collection_id);
    CREATE INDEX IF NOT EXISTS test_runs_status_idx ON test_runs(status);

    -- ===================== 10. schedules =====================
    CREATE TABLE IF NOT EXISTS schedules (
      id               TEXT PRIMARY KEY,
      user_id          TEXT NOT NULL REFERENCES users(id),
      collection_id    TEXT NOT NULL REFERENCES collections(id),
      collection_name  TEXT NOT NULL,
      environment_id   TEXT REFERENCES environments(id) ON DELETE SET NULL,
      cron_expression  TEXT NOT NULL,
      label            TEXT NOT NULL,
      enabled          INTEGER NOT NULL DEFAULT 1,
      webhook_url      TEXT,
      notify_email     TEXT,
      notify_desktop   INTEGER NOT NULL DEFAULT 1,
      last_run_at      TEXT,
      last_run_status  TEXT,
      last_run_id      TEXT REFERENCES test_runs(id) ON DELETE SET NULL,
      next_run_at      TEXT,
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS schedules_user_idx ON schedules(user_id);
    CREATE INDEX IF NOT EXISTS schedules_enabled_next_idx ON schedules(enabled, next_run_at);

    -- ===================== 11. schema_contracts =====================
    CREATE TABLE IF NOT EXISTS schema_contracts (
      id                    TEXT PRIMARY KEY,
      user_id               TEXT NOT NULL REFERENCES users(id),
      endpoint_key          TEXT NOT NULL,
      method                TEXT NOT NULL,
      path_pattern          TEXT NOT NULL,
      contract_schema_json  TEXT NOT NULL,
      sample_count          INTEGER NOT NULL DEFAULT 0,
      violations_json       TEXT NOT NULL DEFAULT '[]',
      last_inferred_at      TEXT NOT NULL,
      created_at            TEXT NOT NULL,
      updated_at            TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS schema_contracts_user_endpoint_uidx ON schema_contracts(user_id, endpoint_key);
    CREATE INDEX IF NOT EXISTS schema_contracts_method_idx ON schema_contracts(method);

    -- ===================== 12. certificates =====================
    CREATE TABLE IF NOT EXISTS certificates (
      id                       TEXT PRIMARY KEY,
      user_id                  TEXT NOT NULL REFERENCES users(id),
      label                    TEXT NOT NULL,
      certificate_type         TEXT NOT NULL,
      file_path                TEXT NOT NULL,
      passphrase_secret_ref_id TEXT REFERENCES secret_references(id),
      fingerprint              TEXT,
      expires_at               TEXT,
      created_at               TEXT NOT NULL,
      updated_at               TEXT NOT NULL
    );

    -- ===================== 13. backups =====================
    CREATE TABLE IF NOT EXISTS backups (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id),
      file_path    TEXT NOT NULL,
      kind         TEXT NOT NULL,
      status       TEXT NOT NULL,
      size_bytes   INTEGER NOT NULL DEFAULT 0,
      checksum     TEXT,
      created_at   TEXT NOT NULL,
      completed_at TEXT
    );
  `);

  // Bootstrap the local user (INSERT OR IGNORE — idempotent)
  const now = NOW();
  sqlite
    .prepare(
      /* sql */ `
      INSERT OR IGNORE INTO users (id, email, name, theme, editor_font_size, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run(LOCAL_USER_ID, 'local@atx.desktop', 'Local User', 'dark', 14, now, now);

  // Seed required settings keys with defaults (INSERT OR IGNORE — idempotent)
  const defaults: Array<[string, unknown]> = [
    ['general', { theme: 'dark', startupRoute: '/', minimizeToTray: false, historyRetentionDays: 90 }],
    ['ai', { model: 'gemini-3.5-flash', showUsage: true, apiKeyRefId: null }],
    ['proxy', { mode: 'none', host: '', port: 8080, authRefId: null }],
    ['certificates', { defaultCertificateId: null }],
    ['updates', { channel: 'stable', autoCheck: true, autoDownload: false }],
    ['data', { backupLocation: '', backupRetentionDays: 30 }],
    ['passphrase', { enabled: false }],
  ];

  const insertSetting = sqlite.prepare(
    /* sql */ `INSERT OR IGNORE INTO settings (key, value_json, updated_at) VALUES (?, ?, ?)`,
  );

  for (const [key, value] of defaults) {
    insertSetting.run(key, JSON.stringify(value), now);
  }
}
