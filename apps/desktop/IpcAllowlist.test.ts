import { describe, expect, it, vi } from 'vitest';
import { createDesktopApi, createSafeIpcInvoker } from './IpcAllowlist';

describe('IPC allowlist', () => {
  it('exposes the supported desktop methods', () => {
    const api = createDesktopApi(createSafeIpcInvoker(async () => []));

    expect(Object.keys(api).sort()).toEqual([
      'addProject', 'analyzeProjects', 'buildTaskContext', 'chooseProjectFolder', 'copyOutput', 'discoverEntryPointCandidates', 'discoverFiles',
      'generateOutput', 'getRepositoryIndexStatus', 'listProjectFiles', 'listProjects', 'readFileContent', 'refreshRepositoryIndex', 'removeProject', 'saveOutput',
    ]);
  });

  it('invokes buildTaskContext through the safe channel with request', async () => {
    const expected = { manifest: {}, markdown: '', content: '', resolvedStrategy: 'standard', candidates: [], warnings: [] };
    const invoke = vi.fn(async () => expected);
    const api = createDesktopApi(createSafeIpcInvoker(invoke));
    const req = { projectId: 'p1', task: 'Task 1', entryPoints: ['src/a.ts'] };
    await expect(api.buildTaskContext(req)).resolves.toEqual(expected);
    expect(invoke).toHaveBeenCalledWith('buildTaskContext', req);
  });

  it('invokes chooseProjectFolder through the safe channel', async () => {
    const invoke = vi.fn(async () => 'C:/project');
    const api = createDesktopApi(createSafeIpcInvoker(invoke));

    await expect(api.chooseProjectFolder()).resolves.toBe('C:/project');
    expect(invoke).toHaveBeenCalledWith('chooseProjectFolder');
  });

  it('invokes saveOutput through the safe channel with request', async () => {
    const invoke = vi.fn(async () => ({ status: 'saved', filePath: 'C:/file.md' }));
    const api = createDesktopApi(createSafeIpcInvoker(invoke));

    const req = { content: '# Hi', format: 'markdown' as const };
    await expect(api.saveOutput(req)).resolves.toEqual({ status: 'saved', filePath: 'C:/file.md' });
    expect(invoke).toHaveBeenCalledWith('saveOutput', req);
  });

  it('rejects an unknown channel before invoking Electron', async () => {
    const invoke = vi.fn(async () => undefined);
    const safeInvoke = createSafeIpcInvoker(invoke);

    await expect(safeInvoke('deleteEverything')).rejects.toThrow('Unsupported IPC channel.');
    expect(invoke).not.toHaveBeenCalled();
  });
});

