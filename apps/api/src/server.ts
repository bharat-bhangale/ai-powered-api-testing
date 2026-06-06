import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { isDesktopMode } from './config/runtime';
import { scheduleWorker } from './modules/schedules/schedule.worker';

// ===== Exported Programmatic Startup =====

/**
 * Starts the Express server programmatically and returns a promise
 * that resolves with the chosen port.
 *
 * Used by the Electron desktop app to start the API in-process
 * without spawning a shell.
 *
 * In desktop mode:
 *   - Binds to 127.0.0.1 only (never 0.0.0.0)
 *   - Accepts port 0 so the OS picks a free port
 *   - Skips MongoDB connection (will be wired up in a later phase)
 *   - Notifies the parent process via IPC when ready
 */
export async function startServer(): Promise<number> {
  const server = http.createServer(app);

  if (isDesktopMode) {
    console.log('🖥️  Desktop mode — skipping MongoDB, binding to 127.0.0.1');
  } else {
    // Web mode: connect to MongoDB if URI is provided
    if (env.MONGODB_URI) {
      await connectDatabase();
    } else {
      console.log('⚠️ MONGODB_URI not set — running without database');
    }
  }

  return new Promise<number>((resolve, reject) => {
    const host = isDesktopMode ? '127.0.0.1' : '0.0.0.0';
    // In desktop mode accept port 0 (OS picks); otherwise use configured port
    const listenPort = isDesktopMode ? 0 : env.PORT;

    server.listen(listenPort, host, () => {
      const addr = server.address();
      const actualPort =
        addr && typeof addr === 'object' ? addr.port : listenPort;

      console.log(`🚀 Server running on http://${host}:${actualPort}`);
      console.log(`📋 Health check: http://${host}:${actualPort}/health`);
      console.log(`🔧 Environment: ${env.NODE_ENV}`);
      console.log(`🖥️  Runtime mode: ${isDesktopMode ? 'desktop' : 'web'}`);

      // Start schedule worker only in web mode with a database
      if (!isDesktopMode && env.MONGODB_URI) {
        scheduleWorker.start();
      }

      // Notify parent Electron process via IPC (only when forked with an IPC channel)
      if (process.send) {
        process.send({ type: 'ready', port: actualPort });
      }

      resolve(actualPort);
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}

// ===== Standalone Execution =====
// When run directly via `node dist/server.js` or `nodemon`, start immediately.

if (require.main === module) {
  startServer().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}
