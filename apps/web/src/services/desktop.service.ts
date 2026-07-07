/**
 * Desktop service — the single point of contact between the web renderer
 * and the Electron preload bridge (window.atxDesktop).
 *
 * Every other file in apps/web/ must use this module instead of reading
 * window.atxDesktop directly. This keeps the Electron coupling in one place
 * and makes the web app testable without an Electron context.
 */

import type {
  DesktopRuntimeInfo,
  DesktopApiBaseUrl,
  DesktopServerStatus,
  DesktopServerReadyPayload,
} from '../types/desktop';

// ===== Runtime detection =====

/**
 * True when the renderer is running inside Electron with the preload bridge active.
 * Use this as the guard before calling any other function in this module.
 */
export function isDesktopRuntime(): boolean {
  return typeof window !== 'undefined' && typeof window.atxDesktop !== 'undefined';
}

// ===== Bridge wrappers =====

/**
 * Returns Electron/Node/Chrome/app version info.
 * Only call when isDesktopRuntime() === true.
 */
export async function getDesktopRuntimeInfo(): Promise<DesktopRuntimeInfo> {
  if (!isDesktopRuntime()) {
    throw new Error('getDesktopRuntimeInfo called outside Electron');
  }
  return window.atxDesktop!.getRuntimeInfo() as Promise<DesktopRuntimeInfo>;
}

/**
 * Requests the current API base URL from the main process.
 * May return { url: '', ready: false } while the server is starting.
 * Only call when isDesktopRuntime() === true.
 */
export async function getDesktopApiBaseUrl(): Promise<DesktopApiBaseUrl> {
  if (!isDesktopRuntime()) {
    throw new Error('getDesktopApiBaseUrl called outside Electron');
  }
  return window.atxDesktop!.getApiBaseUrl() as Promise<DesktopApiBaseUrl>;
}

/**
 * Triggers native open file dialog
 */
export async function showDesktopOpenDialog(options?: any) {
  if (!isDesktopRuntime()) return null;
  return await window.atxDesktop!.showOpenDialog(options);
}

/**
 * Triggers native save file dialog
 */
export async function showDesktopSaveDialog(options?: any) {
  if (!isDesktopRuntime()) return null;
  return await window.atxDesktop!.showSaveDialog(options);
}

/**
 * Subscribes to server status changes pushed from the main process.
 * Returns an unsubscribe function.
 * Only call when isDesktopRuntime() === true.
 */
export function subscribeToServerStatus(
  callback: (status: DesktopServerStatus) => void,
): () => void {
  if (!isDesktopRuntime()) return () => undefined;
  return window.atxDesktop!.onServerStatus(
    callback as (status: DesktopServerStatus) => void,
  );
}

/**
 * Subscribes to the one-shot "server ready" event.
 * Returns an unsubscribe function.
 * Only call when isDesktopRuntime() === true.
 */
export function subscribeToServerReady(
  callback: (payload: DesktopServerReadyPayload) => void,
): () => void {
  if (!isDesktopRuntime()) return () => undefined;
  return window.atxDesktop!.onServerReady(
    callback as (payload: DesktopServerReadyPayload) => void,
  );
}

/**
 * Waits until the local API server is ready and returns its base URL.
 *
 * Strategy:
 *   1. Poll getDesktopApiBaseUrl() immediately — if ready, return now.
 *   2. Otherwise subscribe to onServerReady and await the one-shot event.
 *   3. Timeout after maxWaitMs with a rejected promise.
 */
export function waitForDesktopApiReady(maxWaitMs = 60_000): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    // 1. Check if already ready (race-free polling)
    void getDesktopApiBaseUrl().then((result) => {
      if (result.ready && result.url) {
        resolve(result.url);
      }
    });

    // 2. Subscribe for the one-shot ready event
    const unsub = subscribeToServerReady((payload) => {
      clearTimeout(timer);
      unsub();
      resolve(payload.url);
    });

    // 3. Timeout guard
    const timer = setTimeout(() => {
      unsub();
      reject(new Error('Desktop API server did not become ready within the timeout'));
    }, maxWaitMs);
  });
}
