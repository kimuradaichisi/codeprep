import { describe, expect, it, vi } from 'vitest';
import { candidateKeys, selectedCandidates, analyzeWorkspace } from './workspaceAnalysis';
import type { DesktopApi } from '../../DesktopApi';
import type { RecommendationSettings } from '../../../../src/features/desktop-core/domain/Recommendation';

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

  it('matches selected candidates using normalized Windows candidate keys', () => {
    const windowsCandidates = [{ ...candidates[0], relativePath: 'src\\app.ts' }];

    expect(selectedCandidates(windowsCandidates, ['p1:src/app.ts'])).toEqual(windowsCandidates);
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

  it('passes recommendation settings to file discovery', async () => {
    const api = {
      discoverFiles: vi.fn(async () => ({ candidates, warnings: [] })),
    } as unknown as DesktopApi;
    const settings: RecommendationSettings = {
      markdownLink: true, nameHeading: false, gitCoChange: false, directoryProximity: true,
    };

    await analyzeWorkspace(api, '.ts', 'extension', 3, projects, settings);

    expect(api.discoverFiles).toHaveBeenCalledWith({
      recipe: { kind: 'extension', extensions: ['.ts'] }, projectIds: ['p1'], recommendationSettings: settings,
    });
  });
});
