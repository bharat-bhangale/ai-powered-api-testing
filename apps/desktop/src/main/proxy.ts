import { session, ipcMain } from 'electron';
import log from 'electron-log';

export function registerProxyHandlers(): void {
  // We can expose an IPC handler to get the system proxy for a URL
  ipcMain.handle('app:resolve-proxy', async (_event, url: string) => {
    try {
      const proxyStr = await session.defaultSession.resolveProxy(url);
      return proxyStr; // Returns something like 'PROXY 127.0.0.1:8080; DIRECT'
    } catch (error) {
      log.error('Error resolving system proxy:', error);
      return 'DIRECT';
    }
  });

  log.info('Proxy handlers registered.');
}
