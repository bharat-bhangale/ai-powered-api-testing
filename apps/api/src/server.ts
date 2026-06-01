import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { scheduleWorker } from './modules/schedules/schedule.worker';

/**
 * Server entry point.
 * 1. Optionally connects to MongoDB (skips if MONGODB_URI not set)
 * 2. Starts Express on the configured port
 */
async function start(): Promise<void> {
  try {
    // Connect to database if URI is provided
    if (env.MONGODB_URI) {
      await connectDatabase();
    } else {
      console.log('⚠️ MONGODB_URI not set — running without database');
    }

    // Start HTTP server
    app.listen(env.PORT, () => {
      console.log(`🚀 Server running on http://localhost:${env.PORT}`);
      console.log(`📋 Health check: http://localhost:${env.PORT}/health`);
      console.log(`🔧 Environment: ${env.NODE_ENV}`);

      // Start schedule worker if database is connected
      if (env.MONGODB_URI) {
        scheduleWorker.start();
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
