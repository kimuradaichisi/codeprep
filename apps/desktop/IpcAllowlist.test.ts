import { describe, expect, it, vi } from 'vitest';
import { createDesktopApi, createSafeIpcInvoker } from './IpcAllowlist';

describe('IPC allowlist', () => {
  it('exposes the supported desktop methods', () => {
    const api = createDesktopApi(createSafeIpcInvoker(async () => []));

    expect(Object.keys(api).sort()).toEqual([
      'addProject', 'analyzeProjects', 'chooseProjectFolder', 'copyOutput', 'discoverFiles',
      'generateOutput', 'listProjectFiles', 'listProjects', 'removeProject',
    ]);
  });

  it('invokes chooseProjectFolder through the safe channel', async () => {
    const invoke = vi.fn(async () => 'C:/project');
    const api = createDesktopApi(createSafeIpcInvoker(invoke));

    await expect(api.chooseProjectFolder()).resolves.toBe('C:/project');
    expect(invoke).toHaveBeenCalledWith('chooseProjectFolder');
  });

  it('rejects an unknown channel before invoking Electron', async () => {
    const invoke = vi.fn(async () => undefined);
    const safeInvoke = createSafeIpcInvoker(invoke);

    await expect(safeInvoke('deleteEverything')).rejects.toThrow('Unsupported IPC channel.');
    expect(invoke).not.toHaveBeenCalled();
  });
});
