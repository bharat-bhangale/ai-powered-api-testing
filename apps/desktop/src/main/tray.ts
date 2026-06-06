import { app, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { getMainWindow, focusMainWindow } from './window';

let tray: Tray | null = null;

export function setupTray() {
  // Use a default icon or an empty image if the real one isn't built yet
  let iconPath = path.join(__dirname, '../../resources/icon.png');
  
  // Create a fallback empty icon if icon.png doesn't exist yet
  const icon = nativeImage.createEmpty();

  try {
    tray = new Tray(iconPath);
  } catch {
    tray = new Tray(icon);
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show ATX',
      click: () => {
        focusMainWindow();
      },
    },
    { type: 'separator' },
    {
      label: 'New Request',
      click: () => {
        const win = getMainWindow();
        if (win) {
          focusMainWindow();
          win.webContents.send('app:menu-command', 'NEW_REQUEST');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('ATX API Testing');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    focusMainWindow();
  });
}
