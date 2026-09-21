import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { registerDesktopHandlers } from './DesktopHandlers';

let handlersRegistered = false;

const createWindow = (): BrowserWindow => {
  const window = new BrowserWindow({
    width: 1100,
    height: 800,
    backgroundColor: '#1e1e1e',
    show: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, preload: join(__dirname, 'preload.js') },
  });
  if (process.env.NODE_ENV === 'development' || process.argv.includes('--debug')) {
    window.webContents.openDevTools();
  }
  void window.loadFile(join(__dirname, 'renderer', 'index.html'));
  return window;
};

const registerHandlersOnce = (): void => {
  if (handlersRegistered) return;
  registerDesktopHandlers(join(app.getPath('userData'), 'projects.json'));
  handlersRegistered = true;
};

const openWindowIfNeeded = (): void => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
};

const focusExistingWindow = (): void => {
  const window = BrowserWindow.getAllWindows()[0];
  if (!window) return;
  if (window.isMinimized()) window.restore();
  window.focus();
};

const start = (): void => {
  registerHandlersOnce();
  app.on('activate', openWindowIfNeeded);
  createWindow();
};

const initializeApp = (): void => {
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
    return;
  }
  app.on('second-instance', focusExistingWindow);
  app.whenReady().then(start);
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
};

initializeApp();
