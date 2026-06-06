import { app, Menu, MenuItemConstructorOptions } from 'electron';
import { getMainWindow } from './window';

/**
 * Dispatches a menu command to the renderer process.
 */
function dispatchCommand(command: string) {
  const win = getMainWindow();
  if (win) {
    win.webContents.send('app:menu-command', command);
  }
}

export function setupApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    // { role: 'appMenu' }
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              {
                label: 'Preferences...',
                accelerator: 'CmdOrCtrl+,',
                click: () => dispatchCommand('OPEN_SETTINGS'),
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Request',
          accelerator: 'CmdOrCtrl+N',
          click: () => dispatchCommand('NEW_REQUEST'),
        },
        {
          label: 'New Collection',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => dispatchCommand('NEW_COLLECTION'),
        },
        { type: 'separator' as const },
        {
          label: 'Import Postman Collection',
          accelerator: 'CmdOrCtrl+O',
          click: () => dispatchCommand('IMPORT_POSTMAN'),
        },
        { type: 'separator' as const },
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
              { type: 'separator' as const },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' as const }, { role: 'stopSpeaking' as const }],
              },
            ]
          : [{ role: 'delete' as const }, { type: 'separator' as const }, { role: 'selectAll' as const }]),
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    {
      label: 'AI',
      submenu: [
        {
          label: 'Toggle AI Assistant',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => dispatchCommand('TOGGLE_AI'),
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => require('electron').shell.openExternal('https://atx.example.com/docs'),
        },
      ],
    },
  ];

  if (!isMac) {
    // Windows/Linux specific
    const fileMenu = template.find((m) => m.label === 'File');
    if (fileMenu && Array.isArray(fileMenu.submenu)) {
      fileMenu.submenu.splice(2, 0, {
        label: 'Settings',
        accelerator: 'Ctrl+,',
        click: () => dispatchCommand('OPEN_SETTINGS'),
      });
    }
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
