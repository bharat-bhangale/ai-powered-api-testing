import { Notification, ipcMain } from 'electron';
import log from 'electron-log';

export function setupNotifications() {
  ipcMain.handle('notification:show', (_event, options: { title: string; body: string; silent?: boolean }) => {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: options.title,
        body: options.body,
        silent: options.silent,
      });
      notification.show();
    } else {
      log.warn('Notifications are not supported on this system');
    }
  });
}
