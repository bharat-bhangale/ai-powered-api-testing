/**
 * Electron main process entry point.
 *
 * Responsibilities:
 * 1. Acquire single-instance lock
 * 2. Start the local API server (forked child process)
 * 3. Wait for /health to pass before creating the BrowserWindow
 * 4. Register IPC handlers
 * 5. Manage app lifecycle (quit, activate)
 */

import { app, ipcMain } from 'electron';
import log from 'electron-log';
import { createMainWindow, focusMainWindow, getMainWindow } from './window';
import { initializeKeychain } from './keychain';
import {
  startLocalServer,
  stopLocalServer,
  getApiBaseUrl,
  onServerStatusChange,
  onServerReady,
} from './local-api-server';
import {
  CHANNEL_GET_RUNTIME_INFO,
  CHANNEL_GET_API_BASE_URL,
  CHANNEL_SERVER_STATUS,
  CHANNEL_SERVER_READY,
} from '../shared/ipc-channels';
import type { RuntimeInfo, ApiBaseUrl, ServerReadyPayload } from '../shared/ipc-schemas';

// ===== Single Instance Lock =====

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  // Another instance is already running — focus it and quit this one
  log.info('Another instance is already running. Exiting.');
  app.quit();
} else {
  // When a second instance is launched, focus the existing window
  app.on('second-instance', () => {
    log.info('Second instance detected — focusing existing window.');
    focusMainWindow();
  });

  // ===== App Ready =====

  app.whenReady().then(async () => {
    log.info(`ATX Desktop v${app.getVersion()} starting...`);
    log.info(`Platform: ${process.platform} (${process.arch})`);
    log.info(`Packaged: ${app.isPackaged}`);

    // Register IPC handlers before any window is created
    registerIpcHandlers();

    // Forward every server status update to the renderer (if window is open)
    onServerStatusChange((status) => {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send(CHANNEL_SERVER_STATUS, status);
      }
    });

    // When the health check passes, send CHANNEL_SERVER_READY to the renderer
    onServerReady((payload: ServerReadyPayload) => {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send(CHANNEL_SERVER_READY, payload);
      }
    });

    // Initialize keychain before starting local server
    await initializeKeychain();

    // Start the local API server. Waits until it sends { type: 'ready', port }
    // and the /health poll succeeds before returning.
    await startLocalServer();

    // Create the window after the API is ready so the renderer can immediately
    // call getApiBaseUrl() and get a valid response.
    createMainWindow();
  }).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('Fatal startup error:', msg);
    app.quit();
  });

  // ===== macOS: Re-create window on dock click =====

  app.on('activate', () => {
    if (getMainWindow() === null) {
      createMainWindow();
    } else {
      focusMainWindow();
    }
  });

  // ===== Quit Lifecycle =====

  app.on('window-all-closed', () => {
    // On macOS, apps stay open until Cmd+Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    log.info('App quitting — stopping local server...');
    stopLocalServer();
  });
}

// ===== IPC Handlers =====

function registerIpcHandlers(): void {
  /**
   * app:get-runtime-info
   * Returns app version, platform, and runtime details.
   */
  ipcMain.handle(CHANNEL_GET_RUNTIME_INFO, (): RuntimeInfo => {
    return {
      appVersion: app.getVersion(),
      electronVersion: process.versions['electron'] ?? 'unknown',
      chromeVersion: process.versions['chrome'] ?? 'unknown',
      nodeVersion: process.versions['node'] ?? 'unknown',
      platform: process.platform as RuntimeInfo['platform'],
      arch: process.arch,
      isPackaged: app.isPackaged,
    };
  });

  /**
   * app:get-api-base-url
   * Returns the base URL for the local API server.
   * `ready` is false and `url` is empty if the health check has not yet passed.
   */
  ipcMain.handle(CHANNEL_GET_API_BASE_URL, (): ApiBaseUrl => {
    return getApiBaseUrl();
  });

  log.info('IPC handlers registered.');
}
