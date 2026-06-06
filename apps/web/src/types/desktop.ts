/**
 * Renderer-side type aliases for the desktop bridge.
 *
 * These mirror the shapes from apps/desktop/src/shared/ipc-schemas.ts
 * but are defined independently so the web app never imports Electron packages.
 */

/** Info returned by window.atxDesktop.getRuntimeInfo() */
export interface DesktopRuntimeInfo {
  appVersion: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  platform: 'win32' | 'darwin' | 'linux';
  arch: string;
  isPackaged: boolean;
}

/** Info returned by window.atxDesktop.getApiBaseUrl() */
export interface DesktopApiBaseUrl {
  /** Full URL, e.g. "http://127.0.0.1:54321". Empty string when not ready. */
  url: string;
  ready: boolean;
}

/** Server status pushed from main process via onServerStatus */
export interface DesktopServerStatus {
  status: 'starting' | 'ready' | 'error' | 'stopped';
  port?: number;
  error?: string;
}

/** One-shot payload pushed from main process via onServerReady */
export interface DesktopServerReadyPayload {
  url: string;
  port: number;
}

/**
 * App initialisation phases.
 *   idle      — not started yet
 *   resolving — waiting for desktop API base URL
 *   ready     — baseURL set, safe to call API
 *   error     — fatal initialisation failure
 */
export type AppInitStatus = 'idle' | 'resolving' | 'ready' | 'error';

export interface AppInitState {
  status: AppInitStatus;
  apiBaseUrl: string;
  errorMessage?: string;
}

// ===== Window global declaration =====

/**
 * Shape of the API exposed by the Electron preload via contextBridge.
 * Mirrors apps/desktop/src/shared/desktop-api.types.ts without any Electron imports.
 */
export interface AtxDesktopApi {
  getRuntimeInfo: () => Promise<DesktopRuntimeInfo>;
  getApiBaseUrl: () => Promise<DesktopApiBaseUrl>;
  onServerStatus: (callback: (status: DesktopServerStatus) => void) => () => void;
  onServerReady: (callback: (payload: DesktopServerReadyPayload) => void) => () => void;
}

declare global {
  interface Window {
    atxDesktop?: AtxDesktopApi;
  }
}
