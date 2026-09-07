// src/features/repository-context/application/__tests__/AdaptivePackContext.test.ts
import { describe, expect, it, vi } from 'vitest';
import { BuildTaskContextUseCase } from '../BuildTaskContextUseCase';
import { createTaskContext } from '../../domain/TaskContext';
import type { BuildTaskContextPorts } from '../taskContextPorts';
import type { Project } from '../../domain/Project';
import { createRecommendation } from '../../domain/Recommendation';

describe('AdaptivePackContext execution', () => {
  const project: Project = { id: 'p1', name: 'proj', rootPath: '/repo' };

  const createMockPorts = (): BuildTaskContextPorts => ({
    projects: { getByIds: vi.fn().mockResolvedValue([project]) },
    files: {
      list: vi.fn().mockResolvedValue([
        { relativePath: 'src/Service.ts', size: 1000 },
        { relativePath: 'src/Dep1.ts', size: 500 },
        { relativePath: 'src/Dep2.ts', size: 500 },
        { relativePath: 'src/Dep3.ts', size: 500 },
        { relativePath: 'src/Service.test.ts', size: 800 },
        { relativePath: 'src/Service.spec.ts', size: 800 },
        { relativePath: 'AGENTS.md', size: 400 },
        { relativePath: 'src/Related.ts', size: 600 },
      ]),
    },
    fileContent: { canRead: vi.fn().mockResolvedValue(true), read: vi.fn().mockResolvedValue('') },
    dependencyScanner: {
      findDependencies: vi.fn().mockResolvedValue(['src/Dep1.ts', 'src/Dep2.ts', 'src/Dep3.ts']),
    } as any,
    recommendations: {
      gitCoChange: {
        recommend: vi.fn().mockResolvedValue([
          createRecommendation({ projectId: 'p1', relativePath: 'src/Related.ts', source: 'gitCoChange', score: 0.7, detail: 'rel' })!,
        ]),
      },
    },
  });

  it('generates minimal bounded fast pack when strategy is fast', async () => {
    const useCase = new BuildTaskContextUseCase(createMockPorts());
    const tc = createTaskContext('p1', 'Fast task', ['src/Service.ts']);
    const res = await useCase.execute({ taskContext: tc, strategy: 'fast' });

    const paths = res.manifest.entries.map((e) => e.relativePath);
    expect(paths).toContain('src/Service.ts');
    expect(paths).toContain('AGENTS.md');
    // fast pack limits related tests to 1 and dependencies to 2, and excludes recommendations
    const testCount = res.manifest.entries.filter((e) => e.role === 'test').length;
    expect(testCount).toBeLessThanOrEqual(1);
    const depCount = res.manifest.entries.filter((e) => e.role === 'dependency').length;
    expect(depCount).toBeLessThanOrEqual(2);
    expect(paths).not.toContain('src/Related.ts'); // recommendations excluded
  });

  it('generates expanded pack with broader relations when strategy is expanded', async () => {
    const useCase = new BuildTaskContextUseCase(createMockPorts());
    const tc = createTaskContext('p1', 'Uncertain task', ['src/Service.ts']);
    const res = await useCase.execute({ taskContext: tc, strategy: 'expanded' });

    const paths = res.manifest.entries.map((e) => e.relativePath);
    expect(paths).toContain('src/Service.ts');
    expect(paths).toContain('AGENTS.md');
    expect(paths).toContain('src/Related.ts'); // recommendations included
    const depCount = res.manifest.entries.filter((e) => e.role === 'dependency').length;
    expect(depCount).toBe(3); // all 3 dependencies included under expanded limit (10)
  });
});
