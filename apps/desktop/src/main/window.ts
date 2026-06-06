/**
 * Window creation and lifecycle management.
 *
 * Creates the main BrowserWindow with secure defaults and
 * loads either the Vite dev server or the production bundle.
 */

import fs from 'fs';
import path from 'path';
import { BrowserWindow, app } from 'electron';

// ===== Window State Persistence =====

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const DEFAULT_STATE: WindowState = {
  width: 1440,
  height: 900,
  isMaximized: false,
};

/**
 * Simple JSON-based state persistence.
 * electron-store v10+ is ESM-only, so we use a plain file instead.
 */
function getStatePath(): string {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadState(): WindowState {
  try {
    const raw = fs.readFileSync(getStatePath(), 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return { ...DEFAULT_STATE, ...(parsed as Partial<WindowState>) };
    }
  } catch {
    // File doesn't exist or is corrupt — use defaults
  }
  return { ...DEFAULT_STATE };
}

function saveState(state: WindowState): void {
  try {
    fs.writeFileSync(getStatePath(), JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // Silently ignore write errors
  }
}

// ===== Constants =====

const MIN_WIDTH = 1024;
const MIN_HEIGHT = 720;
const DEV_SERVER_URL = 'http://localhost:5173';

// ===== State =====

let mainWindow: BrowserWindow | null = null;

// ===== Public API =====

/**
 * Returns the existing main window or null.
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * Creates the main application window.
 *
 * - Restores previous position/size from persistent storage
 * - Loads Vite dev server in development, production bundle otherwise
 * - Saves window state on move/resize/close
 */
export function createMainWindow(): BrowserWindow {
  const savedState = loadState();

  mainWindow = new BrowserWindow({
    // Dimensions
    width: savedState.width,
    height: savedState.height,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    ...(savedState.x !== undefined && savedState.y !== undefined
      ? { x: savedState.x, y: savedState.y }
      : {}),

    // Window chrome
    title: 'ATX Desktop',
    show: false, // Show after ready-to-show to avoid flash

    // Security
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Must be false for preload to use require()
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Restore maximized state
  if (savedState.isMaximized) {
    mainWindow.maximize();
  }

  // Show window smoothly after content is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load content
  loadContent(mainWindow);

  // Persist window state on changes
  attachStateListeners(mainWindow);

  // Cleanup reference on close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

/**
 * Focuses the main window. If minimized, restores it first.
 */
export function focusMainWindow(): void {
  if (!mainWindow) return;

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
}

// ===== Internal =====

function loadContent(window: BrowserWindow): void {
  const isPackaged = app.isPackaged;

  if (!isPackaged) {
    // Development: load Vite dev server
    void window.loadURL(DEV_SERVER_URL);
    // Open DevTools in dev mode
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Production: load the built web app from extraResources
    const webPath = path.join(process.resourcesPath, 'web', 'index.html');
    void window.loadFile(webPath);
  }
}

function attachStateListeners(window: BrowserWindow): void {
  const persistState = (): void => {
    if (!window || window.isDestroyed()) return;

    const isMaximized = window.isMaximized();

    // Only save bounds if not maximized (maximized state is saved separately)
    if (!isMaximized) {
      const bounds = window.getBounds();
      saveState({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized: false,
      });
    } else {
      const current = loadState();
      saveState({ ...current, isMaximized: true });
    }
  };

  window.on('resize', persistState);
  window.on('move', persistState);
  window.on('maximize', persistState);
  window.on('unmaximize', persistState);
  window.on('close', persistState);
}
