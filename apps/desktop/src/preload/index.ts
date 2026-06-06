/**
 * Preload script — runs in a sandboxed context before the renderer page loads.
 *
 * Uses contextBridge to expose a minimal, typed API as `window.atxDesktop`.
 * No raw Node.js or Electron APIs are leaked to the renderer.
 */

import { contextBridge, ipcRenderer } from 'electron';
import {
  CHANNEL_GET_RUNTIME_INFO,
  CHANNEL_GET_API_BASE_URL,
  CHANNEL_SERVER_STATUS,
  CHANNEL_SERVER_READY,
  CHANNEL_FILE_OPEN,
  CHANNEL_FILE_SAVE,
  CHANNEL_MENU_COMMAND,
  CHANNEL_UPDATE_AVAILABLE,
} from '../shared/ipc-channels';
import type { AtxDesktopApi } from '../shared/desktop-api.types';
import type { ServerStatus, ServerReadyPayload } from '../shared/ipc-schemas';

const atxDesktopApi: AtxDesktopApi = {
  /** Invoke: returns app version, platform, runtime details */
  getRuntimeInfo: () => ipcRenderer.invoke(CHANNEL_GET_RUNTIME_INFO),

  /** Invoke: returns { url, ready } for the local API base URL */
  getApiBaseUrl: () => ipcRenderer.invoke(CHANNEL_GET_API_BASE_URL),

  /**
   * Subscribe to live server status pushes from the main process.
   * Returns a cleanup function to remove the listener.
   */
  onServerStatus: (callback: (status: ServerStatus) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: ServerStatus): void => {
      callback(status);
    };
    ipcRenderer.on(CHANNEL_SERVER_STATUS, handler);
    return () => {
      ipcRenderer.removeListener(CHANNEL_SERVER_STATUS, handler);
    };
  },

  /**
   * Subscribe to the one-shot "server ready" event.
   * Returns a cleanup function to remove the listener.
   */
  onServerReady: (callback: (payload: ServerReadyPayload) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: ServerReadyPayload): void => {
      callback(payload);
    };
    ipcRenderer.once(CHANNEL_SERVER_READY, handler);
    return () => {
      ipcRenderer.removeListener(CHANNEL_SERVER_READY, handler);
    };
  },

  /** Invoke: Native open file dialog */
  showOpenDialog: (options?: any) => ipcRenderer.invoke(CHANNEL_FILE_OPEN, options),

  /** Invoke: Native save file dialog */
  showSaveDialog: (options?: any) => ipcRenderer.invoke(CHANNEL_FILE_SAVE, options),

  /** Subscribe to menu commands */
  onMenuCommand: (callback: (command: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, command: string): void => {
      callback(command);
    };
    ipcRenderer.on(CHANNEL_MENU_COMMAND, handler);
    return () => {
      ipcRenderer.removeListener(CHANNEL_MENU_COMMAND, handler);
    };
  },

  /** Subscribe to update available notifications */
  onUpdateAvailable: (callback: (version: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, version: string): void => {
      callback(version);
    };
    ipcRenderer.on(CHANNEL_UPDATE_AVAILABLE, handler);
    return () => {
      ipcRenderer.removeListener(CHANNEL_UPDATE_AVAILABLE, handler);
    };
  },
};

contextBridge.exposeInMainWorld('atxDesktop', atxDesktopApi);
