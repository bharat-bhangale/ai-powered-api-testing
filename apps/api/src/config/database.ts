import mongoose from 'mongoose';
import path from 'path';
import { env } from './env';
import { isDesktopMode } from './runtime';
import { openDatabase, runMigrations } from '@atx/db';

/**
 * Initializes the data store.
 * In Web mode: connects to MongoDB Atlas.
 * In Desktop mode: initializes the local SQLite database and runs migrations.
 */
export async function connectDatabase(): Promise<void> {
  if (isDesktopMode) {
    try {
      const dbPath = process.env.ATX_DB_PATH || path.join(process.cwd(), 'atx-desktop.db');
      openDatabase(dbPath);
      runMigrations();
      console.log(`✅ Initialized SQLite database at ${dbPath}`);
    } catch (error) {
      console.error('❌ Failed to initialize SQLite database:', error);
      process.exit(1);
    }
    return;
  }

  try {
    if (!env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not configured');
    }
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}
