/**
 * Local API Server Manager.
 *
 * Manages the lifecycle of the ATX Express API server within the desktop app.
 *
 * Strategy:
 *   Development (app.isPackaged === false)
 *     - Forks apps/api/src/server.ts via ts-node so no separate build step
 *       is needed during development iteration.
 *     - Binds to 127.0.0.1:0 and sets ATX_RUNTIME_MODE=desktop.
 *
 *   Production (app.isPackaged === true)
 *     - Forks the compiled apps/api/dist/server.js bundled inside resources/.
 *     - Same env vars: ATX_RUNTIME_MODE=desktop, PORT=0.
 *
 * Port discovery:
 *   - The child process calls process.send({ type: 'ready', port }) once listening.
 *   - We then poll /health on 127.0.0.1:{port} until it responds 200.
 *   - Only after a successful health check do we set status 'ready' and emit CHANNEL_SERVER_READY.
 *
 * Shutdown:
 *   - SIGTERM sent first; SIGKILL after 5 s if not exited.
 */

import path from 'path';
import http from 'http';
import { fork, type ChildProcess } from 'child_process';
import { app } from 'electron';
import log from 'electron-log';
import type { ServerStatus, ServerReadyPayload } from '../shared/ipc-schemas';

// ===== State =====

let serverProcess: ChildProcess | null = null;
let currentStatus: ServerStatus = { status: 'stopped' };
let resolvedUrl = '';

type StatusListener = (status: ServerStatus) => void;
type ReadyListener = (payload: ServerReadyPayload) => void;

let statusListener: StatusListener | null = null;
let readyListener: ReadyListener | null = null;

// ===== Public API =====

/**
 * Returns the current server status snapshot.
 */
export function getServerStatus(): ServerStatus {
  return currentStatus;
}

/**
 * Returns the API base URL.
 * `url` is empty and `ready` is false if the server hasn't passed its health check yet.
 */
export function getApiBaseUrl(): { url: string; ready: boolean } {
  if (currentStatus.status === 'ready' && resolvedUrl) {
    return { url: resolvedUrl, ready: true };
  }
  return { url: '', ready: false };
}

/**
 * Registers a callback that fires on every server status change.
 */
export function onServerStatusChange(listener: StatusListener): void {
  statusListener = listener;
}

/**
 * Registers a callback that fires exactly once when the health check passes.
 */
export function onServerReady(listener: ReadyListener): void {
  readyListener = listener;
}

/**
 * Starts the local API server as a forked child process.
 * Works in both development and packaged production builds.
 */
export async function startLocalServer(): Promise<void> {
  if (serverProcess) {
    log.warn('[LocalServer] Already running — ignoring duplicate start request');
    return;
  }

  log.info('[LocalServer] Starting...');
  setStatus({ status: 'starting' });

  const scriptPath = resolveServerScript();
  log.info(`[LocalServer] Forking: ${scriptPath}`);

  const desktopEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ATX_RUNTIME_MODE: 'desktop',
    PORT: '0',         // OS picks a free port
    NODE_ENV: app.isPackaged ? 'production' : 'development',
    // Ensure no leftover MONGODB_URI forces a connection attempt in desktop mode
    MONGODB_URI: '',
  };

  const forkOptions = app.isPackaged
    ? { env: desktopEnv, silent: true }
    : {
        // In dev we use ts-node to run TypeScript directly
        execPath: resolveNodeBin('ts-node'),
        execArgv: ['--project', resolveApiTsConfig()],
        env: desktopEnv,
        silent: true,
      };

  try {
    serverProcess = fork(scriptPath, [], forkOptions);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('[LocalServer] Fork failed:', msg);
    setStatus({ status: 'error', error: msg });
    return;
  }

  // ===== Log forwarding =====

  serverProcess.stdout?.on('data', (data: Buffer) => {
    log.info(`[API] ${data.toString().trim()}`);
  });

  serverProcess.stderr?.on('data', (data: Buffer) => {
    log.warn(`[API] ${data.toString().trim()}`);
  });

  serverProcess.on('error', (err: Error) => {
    log.error('[LocalServer] Process error:', err.message);
    setStatus({ status: 'error', error: err.message });
  });

  serverProcess.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
    log.info(`[LocalServer] Exited — code=${code} signal=${signal}`);
    serverProcess = null;
    if (currentStatus.status !== 'stopped') {
      setStatus({ status: 'stopped' });
    }
  });

  // ===== Port discovery via IPC message =====

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('[LocalServer] Timeout: no ready message received within 30 s'));
    }, 30_000);

    serverProcess!.on('message', async (message: unknown) => {
      const msg = message as { type?: string; port?: number };

      if (msg.type === 'ready' && typeof msg.port === 'number') {
        clearTimeout(timeout);
        const port = msg.port;
        const baseUrl = `http://127.0.0.1:${port}`;
        log.info(`[LocalServer] Process listening on ${baseUrl} — polling /health...`);

        try {
          await pollHealthCheck(baseUrl);
          resolvedUrl = baseUrl;
          setStatus({ status: 'ready', port });
          readyListener?.({ url: baseUrl, port });
          log.info(`[LocalServer] Health check passed — ready at ${baseUrl}`);
        } catch (healthErr: unknown) {
          const errMsg = healthErr instanceof Error ? healthErr.message : String(healthErr);
          log.error('[LocalServer] Health check failed:', errMsg);
          setStatus({ status: 'error', error: errMsg });
        }

        resolve();
      }
    });

    serverProcess!.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  }).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('[LocalServer] Startup failed:', msg);
    setStatus({ status: 'error', error: msg });
  });
}

/**
 * Gracefully stops the local API server child process.
 * Sends SIGTERM first, then SIGKILL after 5 s.
 */
export function stopLocalServer(): void {
  if (!serverProcess) {
    log.info('[LocalServer] No process to stop');
    return;
  }

  log.info('[LocalServer] Sending SIGTERM...');
  serverProcess.kill('SIGTERM');

  const forceKillTimeout = setTimeout(() => {
    if (serverProcess) {
      log.warn('[LocalServer] Still running after 5 s — sending SIGKILL');
      serverProcess.kill('SIGKILL');
    }
  }, 5_000);

  serverProcess.once('exit', () => {
    clearTimeout(forceKillTimeout);
    serverProcess = null;
    resolvedUrl = '';
    setStatus({ status: 'stopped' });
    log.info('[LocalServer] Stopped cleanly');
  });
}

// ===== Internal helpers =====

function setStatus(status: ServerStatus): void {
  currentStatus = status;
  statusListener?.(status);
}

/**
 * Returns the path to the server entry point.
 * - Production: compiled server.js bundled alongside the app.
 * - Development: TypeScript source, run via ts-node.
 */
function resolveServerScript(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'api', 'server.js');
  }
  // __dirname is apps/desktop/dist/main at runtime; walk back to monorepo root
  return path.resolve(__dirname, '..', '..', '..', '..', 'apps', 'api', 'src', 'server.ts');
}

/**
 * Resolves the absolute path to a local node_modules/.bin binary.
 */
function resolveNodeBin(name: string): string {
  // Walk up from the desktop app to the monorepo root's node_modules
  const binDir = path.resolve(
    __dirname,
    '..', '..', '..', '..', // monorepo root
    'node_modules', '.bin',
  );
  return path.join(binDir, process.platform === 'win32' ? `${name}.cmd` : name);
}

/**
 * Resolves the tsconfig.json for the API project.
 */
function resolveApiTsConfig(): string {
  return path.resolve(__dirname, '..', '..', '..', '..', 'apps', 'api', 'tsconfig.json');
}

/**
 * Polls GET {baseUrl}/health until it returns 200 or the attempt limit is exceeded.
 *
 * @param baseUrl  e.g. "http://127.0.0.1:54321"
 * @param maxTries Max number of attempts (default 30)
 * @param interval Milliseconds between attempts (default 500)
 */
function pollHealthCheck(
  baseUrl: string,
  maxTries = 30,
  interval = 500,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let attempts = 0;

    function attempt(): void {
      attempts++;
      const url = `${baseUrl}/health`;

      http
        .get(url, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else if (attempts >= maxTries) {
            reject(
              new Error(
                `Health check failed after ${maxTries} attempts — last status: ${res.statusCode}`,
              ),
            );
          } else {
            setTimeout(attempt, interval);
          }
          // Consume the response body to release the socket
          res.resume();
        })
        .on('error', () => {
          if (attempts >= maxTries) {
            reject(new Error(`Health check unreachable after ${maxTries} attempts`));
          } else {
            setTimeout(attempt, interval);
          }
        });
    }

    attempt();
  });
}
