import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { registerDesktopHandlers } from './DesktopHandlers';

let handlersRegistered = false;

const createWindow = (): BrowserWindow => {
  const window = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: { contextIsolation: true, nodeIntegration: false, preload: join(__dirname, 'preload.js') },
  });
  void window.loadFile(join(__dirname, 'renderer', 'index.html'));
  return window;
};

const start = (): void => {
  registerHandlersOnce();
  app.on('activate', openWindowIfNeeded);
  createWindow();
};

const registerHandlersOnce = (): void => {
  if (handlersRegistered) return;
  registerDesktopHandlers(join(app.getPath('userData'), 'projects.json'));
  handlersRegistered = true;
};

const openWindowIfNeeded = (): void => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
};

app.whenReady().then(start);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
