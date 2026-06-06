/**
 * Type definitions for the `window.atxDesktop` API exposed by the preload script.
 *
 * This file is imported by the renderer (web app) to get type safety
 * when calling preload-bridged methods. It never imports Electron directly.
 */

import type { RuntimeInfo, ApiBaseUrl, ServerStatus, ServerReadyPayload } from './ipc-schemas';

/**
 * The API surface exposed to the renderer via contextBridge.
 * Accessible as `window.atxDesktop`.
 */
export interface AtxDesktopApi {
  /** Returns app version, platform, Electron/Chrome/Node versions */
  getRuntimeInfo: () => Promise<RuntimeInfo>;

  /**
   * Returns the local API server base URL.
   * If the server is still starting, `ready` is false and `url` is an empty string.
   */
  getApiBaseUrl: () => Promise<ApiBaseUrl>;

  /**
   * Subscribe to server status changes pushed from the main process.
   * Returns an unsubscribe function.
   */
  onServerStatus: (callback: (status: ServerStatus) => void) => () => void;

  /**
   * Subscribe to the one-shot "server ready" event.
   * Fires once when the health check passes and the API is confirmed ready.
   * Returns an unsubscribe function.
   */
  onServerReady: (callback: (payload: ServerReadyPayload) => void) => () => void;

  showOpenDialog: (options?: any) => Promise<{ filePath: string; content: string; fileName: string } | null>;
  showSaveDialog: (options?: any) => Promise<string | null>;

  onMenuCommand: (callback: (command: string) => void) => () => void;
  onUpdateAvailable: (callback: (version: string) => void) => () => void;
}

/**
 * Augment the global Window interface so `window.atxDesktop`
 * is type-safe when accessed from the React renderer.
 */
declare global {
  interface Window {
    atxDesktop?: AtxDesktopApi;
  }
}
