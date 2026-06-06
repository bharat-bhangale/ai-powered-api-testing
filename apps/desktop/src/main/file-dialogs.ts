import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import { getMainWindow } from './window';
import { CHANNEL_FILE_OPEN, CHANNEL_FILE_SAVE } from '../shared/ipc-channels';
import log from 'electron-log';

interface FileFilter {
  name: string;
  extensions: string[];
}

interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles'>;
}

interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
  content?: string;
}

export function registerFileDialogHandlers(): void {
  ipcMain.handle(CHANNEL_FILE_OPEN, async (_event, options: OpenDialogOptions = {}) => {
    const win = getMainWindow();
    if (!win) return null;

    try {
      const result = await dialog.showOpenDialog(win, {
        title: options.title || 'Open File',
        defaultPath: options.defaultPath,
        filters: options.filters,
        properties: options.properties || ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      // Read the file content and return it
      const filePath = result.filePaths[0] as string;
      const content = await fs.promises.readFile(filePath, 'utf8');

      return {
        filePath,
        content,
        fileName: filePath.split(/[/\\]/).pop() || 'unknown',
      };
    } catch (error) {
      log.error('Error opening file dialog:', error);
      throw error;
    }
  });

  ipcMain.handle(CHANNEL_FILE_SAVE, async (_event, options: SaveDialogOptions = {}) => {
    const win = getMainWindow();
    if (!win) return null;

    try {
      const result = await dialog.showSaveDialog(win, {
        title: options.title || 'Save File',
        defaultPath: options.defaultPath,
        filters: options.filters,
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      if (options.content !== undefined) {
        await fs.promises.writeFile(result.filePath, options.content, 'utf8');
      }

      return result.filePath;
    } catch (error) {
      log.error('Error saving file dialog:', error);
      throw error;
    }
  });

  log.info('File dialog handlers registered.');
}
