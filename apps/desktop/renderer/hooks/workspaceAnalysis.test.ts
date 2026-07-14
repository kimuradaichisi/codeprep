import { describe, expect, it, vi } from 'vitest';
import { candidateKeys, selectedCandidates, analyzeWorkspace } from './workspaceAnalysis';
import type { DesktopApi } from '../../DesktopApi';

const projects = [{ id: 'p1', name: 'Demo', rootPath: 'C:/demo' }];
const candidates = [
  { projectId: 'p1', relativePath: 'src/app.ts', reasons: ['rgMatch'] as const, excluded: false, score: 35 }
];

describe('workspaceAnalysis', () => {
  it('identifies candidate keys from list', () => {
    const keys = candidateKeys(candidates, projects);
    expect(keys).toEqual(['p1:src/app.ts']);
  });

  it('filters selected candidates', () => {
    const selected = selectedCandidates(candidates, ['p1:src/app.ts']);
    expect(selected).toEqual(candidates);
  });

  it('analyzes workspace using text recipes', async () => {
    const api = {
      analyzeProjects: vi.fn(async () => ({ candidates, warnings: [] })),
      discoverFiles: vi.fn(),
    } as unknown as DesktopApi;

    const result = await analyzeWorkspace(api, 'auth', 'text', 3, projects);

    expect(api.analyzeProjects).toHaveBeenCalledWith({ query: 'auth', projectIds: ['p1'], contextLines: 3 });
    expect(result.candidates).toEqual(candidates);
    expect(result.selectedKeys).toEqual(['p1:src/app.ts']);
  });
});
