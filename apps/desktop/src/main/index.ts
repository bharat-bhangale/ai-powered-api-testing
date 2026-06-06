/**
 * Electron main process entry point.
 *
 * Responsibilities:
 * 1. Acquire single-instance lock
 * 2. Start the local API server (production) or use dev server
 * 3. Create the main BrowserWindow
 * 4. Register IPC handlers
 * 5. Manage app lifecycle (quit, activate)
 */

import { app, ipcMain } from 'electron';
import log from 'electron-log';
import { createMainWindow, focusMainWindow, getMainWindow } from './window';
import {
  startLocalServer,
  stopLocalServer,
  getApiBaseUrl,
  onServerStatusChange,
} from './local-api-server';
import {
  CHANNEL_GET_RUNTIME_INFO,
  CHANNEL_GET_API_BASE_URL,
  CHANNEL_SERVER_STATUS,
} from '../shared/ipc-channels';
import type { RuntimeInfo, ApiBaseUrl } from '../shared/ipc-schemas';

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

  app.whenReady().then(() => {
    log.info(`ATX Desktop v${app.getVersion()} starting...`);
    log.info(`Platform: ${process.platform} (${process.arch})`);
    log.info(`Packaged: ${app.isPackaged}`);

    // Register IPC handlers before creating the window
    registerIpcHandlers();

    // Start local API server
    startLocalServer();

    // Forward server status changes to the renderer
    onServerStatusChange((status) => {
      const window = getMainWindow();
      if (window && !window.isDestroyed()) {
        window.webContents.send(CHANNEL_SERVER_STATUS, status);
      }
    });

    // Create the main window
    createMainWindow();
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
   */
  ipcMain.handle(CHANNEL_GET_API_BASE_URL, (): ApiBaseUrl => {
    return getApiBaseUrl();
  });

  log.info('IPC handlers registered.');
}
