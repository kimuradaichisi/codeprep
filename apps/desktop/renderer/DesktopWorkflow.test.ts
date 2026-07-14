import { describe, expect, it, vi } from 'vitest';
import {
  addProject,
  analyzeProjects,
  copyOutput,
  generateOutput,
  loadProjects,
  removeProject,
  runDesktopAction,
} from './DesktopWorkflow';
import type { DesktopApi } from '../DesktopApi';

const projects = [{ id: 'p1', name: 'Demo', rootPath: 'C:/demo' }];
const candidates = [{ projectId: 'p1', relativePath: 'src/app.ts', reasons: ['rgMatch'] as const, excluded: false, score: 35 }];

describe('Desktop workflow', () => {
  it('loads projects and executes desktop actions through its injected bridge', async () => {
    const api = createApi();

    expect(await loadProjects(api)).toEqual(projects);
    expect(await addProject(api, 'C:/new')).toEqual(projects);
    expect(await removeProject(api, 'p1')).toEqual([]);
    expect(await analyzeProjects(api, 'auth', 3, projects)).toEqual(candidates);
    const output = { candidates, format: 'xml', maxFileSizeKB: 128 } as const;

    expect(await generateOutput(api, output)).toEqual({ preview: 'context', warning: 'Unavailable' });
    expect(api.generateOutput).toHaveBeenCalledWith(output);
    await copyOutput(api, 'context');
    expect(api.copyOutput).toHaveBeenCalledWith('context');
  });

  it('converts rejected bridge actions to a user-visible error', async () => {
    const setValue = vi.fn();
    const setError = vi.fn();

    await runDesktopAction(async () => Promise.reject(new Error('Bridge unavailable')), setValue, setError);

    expect(setValue).not.toHaveBeenCalled();
    expect(setError).toHaveBeenCalledWith('Bridge unavailable');
  });
});

const createApi = (): DesktopApi => ({
  addProject: vi.fn(async () => projects), analyzeProjects: vi.fn(async () => ({ candidates, warnings: [] })), discoverFiles: vi.fn(async () => ({ candidates, warnings: [] })),
  chooseProjectFolder: vi.fn(async () => undefined),
  copyOutput: vi.fn(async () => undefined), generateOutput: vi.fn(async () => ({ preview: 'context', warning: 'Unavailable' })),
  listProjectFiles: vi.fn(async () => []), listProjects: vi.fn(async () => projects), removeProject: vi.fn(async () => []),
  readFileContent: vi.fn(async () => ''),
});
