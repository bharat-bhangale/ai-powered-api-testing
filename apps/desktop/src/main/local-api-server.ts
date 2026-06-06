/**
 * Local API Server Manager.
 *
 * Starts the Express API server (apps/api) as a child process on a
 * dynamically allocated port. The port is communicated back to the
 * renderer so it can configure its HTTP client.
 *
 * In development: assumes the API dev server is already running
 * separately on the port from .env (default 8000).
 *
 * In production: forks the compiled API server.js.
 */

import path from 'path';
import { fork, type ChildProcess } from 'child_process';
import { app } from 'electron';
import log from 'electron-log';
import type { ServerStatus } from '../shared/ipc-schemas';

// ===== State =====

let serverProcess: ChildProcess | null = null;
let currentStatus: ServerStatus = { status: 'stopped' };
let statusListener: ((status: ServerStatus) => void) | null = null;

// ===== Public API =====

/**
 * Returns the current server status.
 */
export function getServerStatus(): ServerStatus {
  return currentStatus;
}

/**
 * Returns the API base URL if the server is ready.
 * In dev mode: always returns localhost:8000 (assumes `npm run dev:api`).
 * In production: returns the dynamically allocated port.
 */
export function getApiBaseUrl(): { url: string; ready: boolean } {
  if (!app.isPackaged) {
    // In dev mode the API server is started externally via `npm run dev:api`
    return { url: 'http://localhost:8000', ready: true };
  }

  if (currentStatus.status === 'ready' && currentStatus.port) {
    return { url: `http://localhost:${currentStatus.port}`, ready: true };
  }

  return { url: '', ready: false };
}

/**
 * Registers a callback that fires whenever server status changes.
 */
export function onServerStatusChange(listener: (status: ServerStatus) => void): void {
  statusListener = listener;
}

/**
 * Starts the local API server in a forked child process.
 * Only used in production (packaged) mode.
 */
export function startLocalServer(): void {
  if (!app.isPackaged) {
    log.info('[LocalServer] Dev mode — skipping local server start (use npm run dev:api)');
    setStatus({ status: 'ready', port: 8000 });
    return;
  }

  if (serverProcess) {
    log.warn('[LocalServer] Server already started');
    return;
  }

  log.info('[LocalServer] Starting local API server...');
  setStatus({ status: 'starting' });

  // In a packaged app, the API server would be at a known path.
  // This path will need to be adjusted when the API is actually bundled.
  const serverScript = path.join(process.resourcesPath, 'api', 'server.js');

  try {
    serverProcess = fork(serverScript, [], {
      env: {
        ...process.env,
        PORT: '0', // Let the OS pick an available port
        NODE_ENV: 'production',
        DESKTOP_MODE: 'true',
      },
      silent: true,
    });

    serverProcess.on('message', (message: unknown) => {
      const msg = message as { type?: string; port?: number };
      if (msg.type === 'ready' && typeof msg.port === 'number') {
        log.info(`[LocalServer] Ready on port ${msg.port}`);
        setStatus({ status: 'ready', port: msg.port });
      }
    });

    serverProcess.stdout?.on('data', (data: Buffer) => {
      log.info(`[LocalServer] ${data.toString().trim()}`);
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      log.error(`[LocalServer] ${data.toString().trim()}`);
    });

    serverProcess.on('error', (err: Error) => {
      log.error('[LocalServer] Failed to start:', err.message);
      setStatus({ status: 'error', error: err.message });
    });

    serverProcess.on('exit', (code: number | null) => {
      log.info(`[LocalServer] Exited with code ${code}`);
      serverProcess = null;
      if (currentStatus.status === 'ready') {
        setStatus({ status: 'stopped' });
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('[LocalServer] Failed to fork:', message);
    setStatus({ status: 'error', error: message });
  }
}

/**
 * Gracefully stops the local API server.
 */
export function stopLocalServer(): void {
  if (!serverProcess) return;

  log.info('[LocalServer] Stopping...');
  serverProcess.kill('SIGTERM');

  // Force kill after 5 seconds
  const forceKillTimeout = setTimeout(() => {
    if (serverProcess) {
      log.warn('[LocalServer] Force-killing after timeout');
      serverProcess.kill('SIGKILL');
    }
  }, 5_000);

  serverProcess.once('exit', () => {
    clearTimeout(forceKillTimeout);
    serverProcess = null;
    setStatus({ status: 'stopped' });
    log.info('[LocalServer] Stopped');
  });
}

// ===== Internal =====

function setStatus(status: ServerStatus): void {
  currentStatus = status;
  statusListener?.(status);
}
