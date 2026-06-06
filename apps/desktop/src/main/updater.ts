import { app, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { getMainWindow } from './window';
import { CHANNEL_UPDATE_AVAILABLE } from '../shared/ipc-channels';

export function setupUpdater() {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false; // We can let user decide in settings, but default to prompt

  if (!app.isPackaged) {
    log.info('App is not packaged. Skipping auto-updater check.');
    return;
  }

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    const win = getMainWindow();
    if (win) {
      win.webContents.send(CHANNEL_UPDATE_AVAILABLE, info.version);
    }
  });

  autoUpdater.on('update-downloaded', () => {
    log.info('Update downloaded.');
    const win = getMainWindow();
    if (win) {
      dialog.showMessageBox(win, {
        type: 'info',
        title: 'Update Ready',
        message: 'A new version of ATX has been downloaded. Restart the application to apply the updates.',
        buttons: ['Restart', 'Later']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    }
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err);
  });

  // Check immediately on startup
  autoUpdater.checkForUpdates().catch(err => {
    log.error('Failed to check for updates:', err);
  });
}
