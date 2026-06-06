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
} from '../shared/ipc-channels';
import type { AtxDesktopApi } from '../shared/desktop-api.types';

const atxDesktopApi: AtxDesktopApi = {
  getRuntimeInfo: () => ipcRenderer.invoke(CHANNEL_GET_RUNTIME_INFO),
  getApiBaseUrl: () => ipcRenderer.invoke(CHANNEL_GET_API_BASE_URL),
};

contextBridge.exposeInMainWorld('atxDesktop', atxDesktopApi);
