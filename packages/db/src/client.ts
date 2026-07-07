/**
 * SQLite database client — wraps better-sqlite3 and Drizzle.
 *
 * Usage:
 *   import { openDatabase, closeDatabase, getDb } from '@atx/db/client';
 *
 *   // On app startup:
 *   openDatabase('/path/to/atx.db');
 *
 *   // In repositories:
 *   const db = getDb();
 */

import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

export type AtxDatabase = BetterSQLite3Database<typeof schema>;

let _db: AtxDatabase | null = null;
let _sqlite: Database.Database | null = null;

/**
 * Opens (or creates) the SQLite database at the given path.
 * Must be called once on startup before any repository is used.
 *
 * @param dbPath  Absolute path to the .db file.
 *                In Electron: path.join(app.getPath('userData'), 'atx.db')
 */
export function openDatabase(dbPath: string): AtxDatabase {
  if (_db) return _db;

  _sqlite = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  _sqlite.pragma('journal_mode = WAL');
  // Enforce foreign-key constraints
  _sqlite.pragma('foreign_keys = ON');

  _db = drizzle(_sqlite, { schema });
  return _db;
}

/**
 * Returns the active database instance.
 * Throws if openDatabase() has not been called yet.
 */
export function getDb(): AtxDatabase {
  if (!_db) {
    throw new Error(
      '[ATX DB] Database not initialized. Call openDatabase(path) before using repositories.',
    );
  }
  return _db;
}

/**
 * Returns the raw better-sqlite3 connection (needed for migrations).
 */
export function getSqlite(): Database.Database {
  if (!_sqlite) {
    throw new Error('[ATX DB] Database not initialized.');
  }
  return _sqlite;
}

/**
 * Closes the database connection.
 * Call on Electron app quit.
 */
export function closeDatabase(): void {
  _sqlite?.close();
  _sqlite = null;
  _db = null;
}
