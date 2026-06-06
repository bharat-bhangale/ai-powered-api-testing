import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import log from 'electron-log';

export function registerCertificateHandlers(): void {
  // Handlers for certificates if any desktop native APIs are needed.
  // Generally, the API server will handle the actual HTTP request using the cert file path.
  // The API server has access to the user data folder since it runs in the same environment.
  
  // We can expose the userData path so the API knows where to store uploaded certs
  ipcMain.handle('app:get-user-data-path', () => {
    return app.getPath('userData');
  });

  log.info('Certificate handlers registered.');
}
