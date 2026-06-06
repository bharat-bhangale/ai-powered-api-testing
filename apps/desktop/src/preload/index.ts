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
};

contextBridge.exposeInMainWorld('atxDesktop', atxDesktopApi);
