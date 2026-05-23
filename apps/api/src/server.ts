import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';

/**
 * Server entry point.
 * 1. Connects to MongoDB
 * 2. Starts Express on the configured port
 */
async function start(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Start HTTP server
    app.listen(env.PORT, () => {
      console.log(`🚀 Server running on http://localhost:${env.PORT}`);
      console.log(`📋 Health check: http://localhost:${env.PORT}/health`);
      console.log(`🔧 Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
