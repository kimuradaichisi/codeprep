// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { useDesktopWorkspace } from './useDesktopWorkspace';
import type { DesktopWorkspace } from '../types';
import type { DesktopApi } from '../../DesktopApi';

const projects = [{ id: 'p1', name: 'Demo', rootPath: 'C:/demo' }];
const candidates = [{ projectId: 'p1', relativePath: 'src/app.ts', reasons: ['rgMatch'] as const, excluded: false, score: 35 }];

describe('useDesktopWorkspace', () => {
  it('does not invoke addProject for a blank path', async () => {
    const { api, result } = await renderWorkspace();
    await act(async () => { await result.current?.addProject('   '); });
    expect(api.addProject).not.toHaveBeenCalled();
    expect(result.current?.projectNotice).toMatch(/path/i);
  });

  it('does not analyze a blank query', async () => {
    const { api, result } = await renderWorkspace();
    await act(async () => { await result.current?.analyze(''); });
    expect(api.analyzeProjects).not.toHaveBeenCalled();
    expect(result.current?.searchNotice).toMatch(/query/i);
  });

  it('adds a selected project folder and trims its path', async () => {
    const { api, result } = await renderWorkspace({ chooseProjectFolder: vi.fn(async () => ' C:/new ') });
    await act(async () => { await result.current?.chooseProjectFolder(); });
    expect(api.addProject).toHaveBeenCalledWith('C:/new');
    expect(result.current?.projects).toEqual(projects);
  });

  it('keeps candidates after a failed analysis', async () => {
    const analyzeProjects = vi.fn()
      .mockResolvedValueOnce({ candidates, warnings: [] })
      .mockRejectedValueOnce(new Error('Bridge unavailable'));
    const { result } = await renderWorkspace({ analyzeProjects });
    await act(async () => { await result.current?.analyze('auth'); });
    await act(async () => { await result.current?.analyze('auth'); });
    expect(result.current?.candidates).toEqual(candidates);
    expect(result.current?.searchNotice).toBe('Bridge unavailable');
  });

  it('does not generate output without selected candidates', async () => {
    const { api, result } = await renderWorkspace();
    await act(async () => { await result.current?.generateOutput(); });
    expect(api.generateOutput).not.toHaveBeenCalled();
    expect(result.current?.outputNotice).toMatch(/select/i);
  });

  it('does not copy blank output', async () => {
    const { api, result } = await renderWorkspace();
    await act(async () => { await result.current?.copyOutput(); });
    expect(api.copyOutput).not.toHaveBeenCalled();
    expect(result.current?.outputNotice).toMatch(/generate/i);
  });

  it('selects tree descendants with the candidate-tree helper', async () => {
    const { result } = await renderWorkspace();
    await act(async () => { await result.current?.analyze('auth'); });
    const root = result.current?.tree[0];
    if (!root) throw new Error('Expected a candidate tree root.');
    await act(async () => { result.current?.toggleTreeNode(root, root.id); });
    expect(result.current?.selectedKeys).toEqual([]);
  });

  it('updates includeDependencies and passes it to generateOutput', async () => {
    const { api, result } = await renderWorkspace();
    expect(result.current?.includeDependencies).toBe(false);
    await act(async () => { result.current?.setIncludeDependencies(true); });
    expect(result.current?.includeDependencies).toBe(true);
    await act(async () => { await result.current?.analyze('auth'); });
    await act(async () => { await result.current?.generateOutput(); });
    expect(api.generateOutput).toHaveBeenCalledWith(expect.objectContaining({
      includeDependencies: true
    }));
  });

  it('performs selectAll and clearAll selection management', async () => {
    const { result } = await renderWorkspace();
    await act(async () => { await result.current?.analyze('auth'); });
    await act(async () => { result.current?.treePanel.selectAll(); });
    expect(result.current?.selectedKeys).toEqual(['p1:src/app.ts']);
    await act(async () => { result.current?.treePanel.clearAll(); });
    expect(result.current?.selectedKeys).toEqual([]);
  });

  it('manages activePreviewFile state via viewFile and closeFile', async () => {
    const { result } = await renderWorkspace();
    expect(result.current?.activePreviewFile).toBeUndefined();
    await act(async () => { result.current?.viewFile('p1', 'src/app.ts'); });
    expect(result.current?.activePreviewFile).toEqual({ projectId: 'p1', relativePath: 'src/app.ts' });
    await act(async () => { result.current?.closeFile(); });
    expect(result.current?.activePreviewFile).toBeUndefined();
  });

  it('clears query and restores all candidates on clearSearch', async () => {
    const listProjectFiles = vi.fn().mockResolvedValue([
      { relativePath: 'src/app.ts', size: 100 }
    ]);
    const analyzeProjects = vi.fn().mockResolvedValue({
      candidates: [{ projectId: 'p1', relativePath: 'src/app.ts', reasons: ['rgMatch'] as const, excluded: false, score: 35 }],
      warnings: []
    });
    const { result } = await renderWorkspace({ listProjectFiles, analyzeProjects });
    await act(async () => { result.current?.setQuery('auth'); });
    await act(async () => { await result.current?.analyze('auth'); });
    expect(result.current?.query).toBe('auth');
    expect(result.current?.candidates.length).toBe(1);
    await act(async () => { await result.current?.searchPanel.clearSearch(); });
    expect(result.current?.query).toBe('');
    expect(result.current?.candidates[0].relativePath).toBe('src/app.ts');
  });

  it('applies scenario presets and updates parameters accordingly', async () => {
    const { result } = await renderWorkspace();
    expect(result.current?.presetKind).toBe('custom');
    expect(result.current?.packMode).toBe('full');
    expect(result.current?.autoOptimize).toBe(false);

    await act(async () => { result.current?.searchPanel.setPresetKind('initialShare'); });
    expect(result.current?.presetKind).toBe('initialShare');
    expect(result.current?.packMode).toBe('skeleton');
    expect(result.current?.autoOptimize).toBe(true);

    await act(async () => { result.current?.searchPanel.setPresetKind('debugFix'); });
    expect(result.current?.presetKind).toBe('debugFix');
    expect(result.current?.packMode).toBe('full');
    expect(result.current?.recipeKind).toBe('gitDiff');
  });
});

const renderWorkspace = async (overrides: Partial<DesktopApi> = {}) => {
  const result: { current?: DesktopWorkspace } = {};
  const api = createApi(overrides);
  const root = createRoot(document.createElement('div'));
  const Probe = () => { result.current = useDesktopWorkspace(api); return null; };
  await act(async () => { root.render(<Probe />); await flush(); });
  return { api, result };
};

const createApi = (overrides: Partial<DesktopApi>): DesktopApi => ({
  addProject: vi.fn(async () => projects), analyzeProjects: vi.fn(async () => ({ candidates, warnings: [] })),
  chooseProjectFolder: vi.fn(async () => undefined), copyOutput: vi.fn(async () => undefined), discoverFiles: vi.fn(async () => ({ candidates, warnings: [] })),
  generateOutput: vi.fn(async () => ({ preview: 'context' })), listProjectFiles: vi.fn(async () => []), listProjects: vi.fn(async () => projects), removeProject: vi.fn(async () => []), readFileContent: vi.fn(async () => 'file content'), ...overrides,
});

const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));
