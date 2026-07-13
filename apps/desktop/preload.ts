import { contextBridge, ipcRenderer } from 'electron';
import { createDesktopApi, createSafeIpcInvoker } from './IpcAllowlist';

const invoke = createSafeIpcInvoker((channel, ...args) =>
  ipcRenderer.invoke(channel, ...args));

contextBridge.exposeInMainWorld('codeprep', createDesktopApi(invoke));
