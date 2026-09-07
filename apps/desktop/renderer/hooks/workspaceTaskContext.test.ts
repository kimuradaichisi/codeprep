// apps/desktop/renderer/hooks/workspaceTaskContext.test.ts
import { describe, expect, it, vi } from 'vitest';
import { analyzeTaskWorkspace, parseEntryPoints } from './workspaceTaskContext';
import type { DesktopApi } from '../../DesktopApi';

describe('workspaceTaskContext', () => {
  describe('parseEntryPoints', () => {
    it('splits commas and newlines and trims items', () => {
      const input = 'src/a.ts, src/b.ts\nsrc/c.ts';
      expect(parseEntryPoints(input)).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
    });

    it('deduplicates entry points', () => {
      const input = 'src/a.ts, src/a.ts';
      expect(parseEntryPoints(input)).toEqual(['src/a.ts']);
    });
  });

  describe('analyzeTaskWorkspace', () => {
    const mockProject = { id: 'p1', name: 'proj', rootPath: '/repo' };
    const mockResult = {
      manifest: { projectId: 'p1', task: 'T', entryPoints: ['src/a.ts'], entries: [], budget: { bytes: 0, estimatedTokens: 0, limit: 0, withinLimit: true } },
      markdown: '# Context Manifest',
      content: '# Packaged Content',
      resolvedStrategy: 'standard' as const,
      candidates: [{ projectId: 'p1', relativePath: 'src/a.ts', reasons: ['pathAffinity'] as const, score: 10, excluded: false }],
      warnings: ['warn1'],
    };

    it('returns searchNotice if no projects exist', async () => {
      const api = { buildTaskContext: vi.fn() } as unknown as DesktopApi;
      const res = await analyzeTaskWorkspace(api, 'task', 'src/a.ts', [], 1000);
      expect(res.searchNotice).toBe('No project selected.');
      expect(api.buildTaskContext).not.toHaveBeenCalled();
    });

    it('returns searchNotice if entry points are empty', async () => {
      const api = { buildTaskContext: vi.fn() } as unknown as DesktopApi;
      const res = await analyzeTaskWorkspace(api, 'task', '   ', [mockProject], 1000);
      expect(res.searchNotice).toBe('At least one entry point is required.');
    });

    it('returns searchNotice if task is empty', async () => {
      const api = { buildTaskContext: vi.fn() } as unknown as DesktopApi;
      const res = await analyzeTaskWorkspace(api, '  ', 'src/a.ts', [mockProject], 1000);
      expect(res.searchNotice).toBe('Task description is required.');
    });

    it('successfully calls buildTaskContext and returns candidates and preview', async () => {
      const api = { buildTaskContext: vi.fn(async () => mockResult) } as unknown as DesktopApi;
      const res = await analyzeTaskWorkspace(api, 'task 1', 'src/a.ts', [mockProject], 1000);
      expect(api.buildTaskContext).toHaveBeenCalledWith({
        projectId: 'p1',
        task: 'task 1',
        entryPoints: ['src/a.ts'],
        tokenLimit: 1000,
      });
      expect(res.candidates).toEqual(mockResult.candidates);
      expect(res.preview).toBe('# Packaged Content');
      expect(res.manifestMarkdown).toBe('# Context Manifest');
      expect(res.resolvedStrategy).toBe('standard');
      expect(res.searchNotice).toBe('warn1');
    });

    it('handles api error gracefully', async () => {
      const api = { buildTaskContext: vi.fn(async () => Promise.reject(new Error('Network error'))) } as unknown as DesktopApi;
      const res = await analyzeTaskWorkspace(api, 'task', 'src/a.ts', [mockProject], 1000);
      expect(res.searchNotice).toBe('Network error');
    });

    it('handles api exception gracefully', async () => {
      const api = { buildTaskContext: vi.fn(async () => { throw new Error('API failed'); }) } as unknown as DesktopApi;
      const res = await analyzeTaskWorkspace(api, 'task 1', 'src/a.ts', [mockProject], 1000);
      expect(res.searchNotice).toBe('API failed');
    });
  });

  describe('discoverEntryPointsWorkspace', () => {
    const mockProject = { id: 'p1', name: 'proj', rootPath: '/repo' };

    it('returns candidates and warnings on success', async () => {
      const api = {
        discoverEntryPointCandidates: vi.fn(async () => ({
          candidates: [{ projectId: 'p1', relativePath: 'src/Service.ts', score: 95, reasons: ['filenameMatch'], matchedTerms: [] }],
          terms: ['Service'],
          warnings: ['warn-discovery'],
        })),
      } as unknown as DesktopApi;

      const res = await (await import('./workspaceTaskContext')).discoverEntryPointsWorkspace(api, 'Find Service', [mockProject]);
      expect(res.candidates?.length).toBe(1);
      expect(res.searchNotice).toBe('warn-discovery');
    });
  });
});
