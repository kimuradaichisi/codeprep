import { beforeEach, describe, expect, it, vi } from 'vitest';

const electron = vi.hoisted(() => ({
  handlers: new Map<string, (event: unknown, value?: unknown) => unknown>(),
  showOpenDialog: vi.fn(),
}));

vi.mock('electron', () => ({
  clipboard: { writeText: vi.fn() },
  dialog: { showOpenDialog: electron.showOpenDialog },
  ipcMain: { handle: (channel: string, handler: (event: unknown, value?: unknown) => unknown) => electron.handlers.set(channel, handler) },
}));

import { registerDesktopHandlers } from './DesktopHandlers';

describe('Desktop handlers', () => {
  beforeEach(() => {
    electron.handlers.clear();
    electron.showOpenDialog.mockReset();
  });

  it('returns undefined when the folder dialog is cancelled', async () => {
    electron.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
    const handler = registeredFolderHandler();

    await expect(handler({})).resolves.toBeUndefined();
  });

  it('returns the first selected project folder', async () => {
    electron.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['C:/project', 'C:/other'] });
    const handler = registeredFolderHandler();

    await expect(handler({})).resolves.toBe('C:/project');
    expect(electron.showOpenDialog).toHaveBeenCalledWith({ properties: ['openDirectory'] });
  });

  it('returns a safe error when the folder dialog fails', async () => {
    electron.showOpenDialog.mockRejectedValue(new Error('Native dialog failure'));
    const handler = registeredFolderHandler();

    await expect(handler({})).rejects.toThrow('Unable to choose a project folder.');
  });
});

const registeredFolderHandler = (): (event: unknown) => Promise<string | undefined> => {
  registerDesktopHandlers('C:/registry.json');
  const handler = electron.handlers.get('chooseProjectFolder');
  if (!handler) throw new Error('Folder handler was not registered.');
  return handler as (event: unknown) => Promise<string | undefined>;
};
