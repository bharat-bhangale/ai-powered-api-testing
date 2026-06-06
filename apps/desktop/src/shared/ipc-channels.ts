/**
 * Type-safe IPC channel names.
 *
 * Every Electron IPC channel used between the main process and
 * the renderer preload bridge is defined here. This ensures both
 * sides reference the same string constants.
 *
 * Naming convention: "domain:action"
 */

// ===== App Lifecycle =====

/** Renderer → Main: request runtime info (app version, platform, etc.) */
export const CHANNEL_GET_RUNTIME_INFO = 'app:get-runtime-info' as const;

/** Renderer → Main: request the local API server base URL */
export const CHANNEL_GET_API_BASE_URL = 'app:get-api-base-url' as const;

// ===== Server Lifecycle =====

/** Main → Renderer: local API server status update */
export const CHANNEL_SERVER_STATUS = 'server:status' as const;

// ===== File Dialogs =====

/** Renderer → Main: open a native file-open dialog */
export const CHANNEL_FILE_OPEN = 'file:open' as const;

/** Renderer → Main: open a native file-save dialog */
export const CHANNEL_FILE_SAVE = 'file:save' as const;

// ===== Window =====

/** Renderer → Main: minimize, maximize, or close the window */
export const CHANNEL_WINDOW_ACTION = 'window:action' as const;

// ===== Updates =====

/** Renderer → Main: check for application updates */
export const CHANNEL_CHECK_UPDATE = 'app:check-update' as const;

/** Main → Renderer: an update is available */
export const CHANNEL_UPDATE_AVAILABLE = 'update:available' as const;

// ===== Aggregate for type narrowing =====

export type IpcInvokeChannel =
  | typeof CHANNEL_GET_RUNTIME_INFO
  | typeof CHANNEL_GET_API_BASE_URL
  | typeof CHANNEL_FILE_OPEN
  | typeof CHANNEL_FILE_SAVE
  | typeof CHANNEL_WINDOW_ACTION
  | typeof CHANNEL_CHECK_UPDATE;

export type IpcSendChannel =
  | typeof CHANNEL_SERVER_STATUS
  | typeof CHANNEL_UPDATE_AVAILABLE;
