import { isDesktopMode } from '../config/runtime';
import { mongoProvider } from './mongo-provider';
import { sqliteProvider } from './sqlite-provider';
import type {
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

/**
 * The unified data provider interface.
 * Both MongoDB (web) and SQLite (desktop) implementations must conform to this shape.
 * We use the types exported by @atx/db as the source of truth for the contract.
 */
export interface AtxDataProvider {
  users: typeof usersRepository;
  settings: typeof settingsRepository;
  collections: typeof collectionsRepository;
  folders: typeof foldersRepository;
  requests: typeof requestsRepository;
  environments: typeof environmentsRepository;
  history: typeof historyRepository;
  testRuns: typeof testRunsRepository;
  schedules: typeof schedulesRepository;
  schemaContracts: typeof schemaContractsRepository;
  secretReferences: typeof secretReferencesRepository;
  certificates: typeof certificatesRepository;
  backups: typeof backupsRepository;
}

/**
 * The globally available data provider instance.
 * Automatically resolves to the correct implementation based on ATX_RUNTIME_MODE.
 */
export const dbProvider: AtxDataProvider = isDesktopMode ? sqliteProvider : mongoProvider;
