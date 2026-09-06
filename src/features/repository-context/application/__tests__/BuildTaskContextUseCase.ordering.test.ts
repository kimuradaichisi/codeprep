import { describe, expect, it, vi } from 'vitest';
import { BuildTaskContextUseCase } from '../BuildTaskContextUseCase';
import { createTaskContext } from '../../domain/TaskContext';
import type { BuildTaskContextPorts } from '../taskContextPorts';
import type { Project } from '../../domain/Project';

describe('BuildTaskContextUseCase Ordering and Multi-entry', () => {
  const project: Project = { id: 'p1', name: 'proj', rootPath: '/repo' };

  it('handles multiple entry points properly', async () => {
    const ports: BuildTaskContextPorts = {
      projects: {
        getByIds: vi.fn().mockResolvedValue([project]),
      },
      files: {
        list: vi.fn().mockResolvedValue([
          { relativePath: 'src/a.ts', size: 100 },
          { relativePath: 'src/b.ts', size: 200 },
        ]),
      },
      fileContent: { canRead: vi.fn().mockResolvedValue(true), read: vi.fn().mockResolvedValue('') },
    };

    const useCase = new BuildTaskContextUseCase(ports);
    const taskContext = createTaskContext('p1', 'Dual entry', ['src/a.ts', 'src/b.ts']);
    const result = await useCase.execute({ taskContext });

    expect(result.manifest.entryPoints).toEqual(['src/a.ts', 'src/b.ts']);
    expect(result.manifest.entries).toHaveLength(2);
    expect(result.manifest.entries.every(e => e.role === 'target')).toBe(true);
  });

  it('guarantees deterministic ordering: role -> score descending -> path ascending', async () => {
    const ports: BuildTaskContextPorts = {
      projects: {
        getByIds: vi.fn().mockResolvedValue([project]),
      },
      files: {
        list: vi.fn().mockResolvedValue([
          { relativePath: 'src/z.ts', size: 100 },
          { relativePath: 'src/a.ts', size: 100 },
          { relativePath: 'AGENTS.md', size: 100 },
        ]),
      },
      fileContent: { canRead: vi.fn().mockResolvedValue(true), read: vi.fn().mockResolvedValue('') },
    };

    const useCase = new BuildTaskContextUseCase(ports);
    const taskContext = createTaskContext('p1', 'Order test', ['src/z.ts', 'src/a.ts']);
    const result = await useCase.execute({ taskContext });

    const paths = result.manifest.entries.map(e => e.relativePath);
    // target (src/a.ts, src/z.ts) sorted by path asc -> repositoryRule (AGENTS.md)
    expect(paths).toEqual(['src/a.ts', 'src/z.ts', 'AGENTS.md']);
  });
});
