import { beforeEach, describe, expect, it, vi } from 'vitest';

const electron = vi.hoisted(() => ({
  handlers: new Map<string, (event: unknown, value?: unknown, value2?: unknown) => unknown>(),
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
}));

vi.mock('electron', () => ({
  clipboard: { writeText: vi.fn() },
  dialog: { showOpenDialog: electron.showOpenDialog, showSaveDialog: electron.showSaveDialog },
  ipcMain: { handle: (channel: string, handler: (event: unknown, value?: unknown, value2?: unknown) => unknown) => electron.handlers.set(channel, handler) },
}));

import { registerDesktopHandlers, saveOutput } from './DesktopHandlers';
import type { OutputFileDependencies } from './OutputFileSaver';

describe('Desktop handlers', () => {
  beforeEach(() => {
    electron.handlers.clear();
    electron.showOpenDialog.mockReset();
    electron.showSaveDialog.mockReset();
  });

  it('registers saveOutput handler', () => {
    registerDesktopHandlers('C:/registry.json');
    expect(electron.handlers.has('saveOutput')).toBe(true);
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

  describe('saveOutput', () => {
    const fixedDate = new Date('2026-08-05T13:57:00');

    it('passes request to saver and returns saved status', async () => {
      const showSaveDialog = vi.fn().mockResolvedValue({ canceled: false, filePath: 'C:/out.md' });
      const writeFile = vi.fn().mockResolvedValue(undefined);
      const deps: OutputFileDependencies = { showSaveDialog, writeFile, now: () => fixedDate };

      const result = await saveOutput({ content: 'test content', format: 'markdown' }, deps);
      expect(result).toEqual({ status: 'saved', filePath: 'C:/out.md' });
      expect(writeFile).toHaveBeenCalledWith('C:/out.md', 'test content');
    });

    it('returns cancelled status when save dialog is cancelled', async () => {
      const showSaveDialog = vi.fn().mockResolvedValue({ canceled: true });
      const writeFile = vi.fn();
      const deps: OutputFileDependencies = { showSaveDialog, writeFile, now: () => fixedDate };

      const result = await saveOutput({ content: 'test content', format: 'markdown' }, deps);
      expect(result).toEqual({ status: 'cancelled' });
      expect(writeFile).not.toHaveBeenCalled();
    });

    it('rejects with original validation error on invalid input', async () => {
      await expect(saveOutput({ content: '', format: 'markdown' })).rejects.toThrow('Invalid save output request.');
    });

    it('converts write error into a safe error message without leaking sensitive content', async () => {
      const sensitiveContent = 'SUPER_SECRET_KEY_12345';
      const showSaveDialog = vi.fn().mockResolvedValue({ canceled: false, filePath: 'C:/out.md' });
      const writeFile = vi.fn().mockRejectedValue(new Error(`Failed writing secret ${sensitiveContent}`));
      const deps: OutputFileDependencies = { showSaveDialog, writeFile, now: () => fixedDate };

      try {
        await saveOutput({ content: sensitiveContent, format: 'markdown' }, deps);
        expect.unreachable();
      } catch (err) {
        expect((err as Error).message).toBe('Unable to save the generated output.');
        expect((err as Error).message).not.toContain(sensitiveContent);
      }
    });
  });

  describe('listProjectFiles', () => {
    it('registers listProjectFiles handler and safely lists files without undefined signal error', async () => {
      registerDesktopHandlers('C:/registry.json');
      const handler = electron.handlers.get('listProjectFiles');
      expect(handler).toBeDefined();
    });
  });
});

const registeredFolderHandler = (): (event: unknown) => Promise<string | undefined> => {
  registerDesktopHandlers('C:/registry.json');
  const handler = electron.handlers.get('chooseProjectFolder');
  if (!handler) throw new Error('Folder handler was not registered.');
  return handler as (event: unknown) => Promise<string | undefined>;
};

