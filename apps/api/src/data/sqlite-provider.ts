import {
  usersRepository,
  settingsRepository,
  collectionsRepository,
  foldersRepository,
  requestsRepository,
  environmentsRepository,
  historyRepository,
  testRunsRepository,
  schedulesRepository,
  schemaContractsRepository,
  secretReferencesRepository,
  certificatesRepository,
  backupsRepository,
} from '@atx/db';
import type { AtxDataProvider } from './database-provider';

/**
 * The SQLite data provider implementation.
 * Wraps the @atx/db repositories directly since they natively match the interface.
 */
export const sqliteProvider: AtxDataProvider = {
  users: usersRepository,
  settings: settingsRepository,
  collections: collectionsRepository,
  folders: foldersRepository,
  requests: requestsRepository,
  environments: environmentsRepository,
  history: historyRepository,
  testRuns: testRunsRepository,
  schedules: schedulesRepository,
  schemaContracts: schemaContractsRepository,
  secretReferences: secretReferencesRepository,
  certificates: certificatesRepository,
  backups: backupsRepository,
};
