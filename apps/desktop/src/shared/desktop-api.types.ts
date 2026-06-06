/**
 * Type definitions for the `window.atxDesktop` API exposed by the preload script.
 *
 * This file is imported by the renderer (web app) to get type safety
 * when calling preload-bridged methods. It never imports Electron directly.
 */

import type { RuntimeInfo, ApiBaseUrl } from './ipc-schemas';

/**
 * The API surface exposed to the renderer via contextBridge.
 * Accessible as `window.atxDesktop`.
 */
export interface AtxDesktopApi {
  /** Returns app version, platform, Electron/Chrome/Node versions */
  getRuntimeInfo: () => Promise<RuntimeInfo>;

  /** Returns the local API server base URL (e.g., http://localhost:PORT) */
  getApiBaseUrl: () => Promise<ApiBaseUrl>;
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
