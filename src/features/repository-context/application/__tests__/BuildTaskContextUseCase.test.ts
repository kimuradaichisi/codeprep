import { describe, expect, it, vi } from 'vitest';
import { BuildTaskContextUseCase } from '../BuildTaskContextUseCase';
import { createTaskContext } from '../../domain/TaskContext';
import type { BuildTaskContextPorts } from '../taskContextPorts';
import type { Project } from '../../domain/Project';
import { createRecommendation } from '../../domain/Recommendation';

describe('BuildTaskContextUseCase', () => {
  const project: Project = { id: 'p1', name: 'proj', rootPath: '/repo' };

  const createMockPorts = (overrides?: Partial<BuildTaskContextPorts>): BuildTaskContextPorts => ({
    projects: {
      getByIds: vi.fn().mockResolvedValue([project]),
    },
    files: {
      list: vi.fn().mockResolvedValue([
        { relativePath: 'src/order/OrderService.ts', size: 2000 },
        { relativePath: 'src/order/ReturnPolicy.ts', size: 1500 },
        { relativePath: 'src/order/OrderService.test.ts', size: 1200 },
        { relativePath: 'docs/order/return.md', size: 800 },
        { relativePath: 'AGENTS.md', size: 500 },
        { relativePath: 'src/refund/RefundCalculator.ts', size: 1000 },
      ]),
    },
    fileContent: {
      canRead: vi.fn().mockResolvedValue(true),
      read: vi.fn().mockResolvedValue('import { ReturnPolicy } from "./ReturnPolicy";'),
    },
    dependencyScanner: {
      findDependencies: vi.fn().mockResolvedValue(['src/order/ReturnPolicy.ts']),
    } as any,
    recommendations: {
      markdownLink: {
        recommend: vi.fn().mockResolvedValue([
          createRecommendation({ projectId: 'p1', relativePath: 'docs/order/return.md', source: 'markdownLink', score: 0.8, detail: 'spec link' })!,
        ]),
      },
      gitCoChange: {
        recommend: vi.fn().mockResolvedValue([
          createRecommendation({ projectId: 'p1', relativePath: 'src/refund/RefundCalculator.ts', source: 'gitCoChange', score: 0.6, detail: 'co-changed' })!,
        ]),
      },
    },
    ...overrides,
  });

  it('builds manifest with target, dependencies, tests, specs, rules, and git relations', async () => {
    const ports = createMockPorts();
    const useCase = new BuildTaskContextUseCase(ports);
    const taskContext = createTaskContext('p1', 'Add return feature', ['src/order/OrderService.ts']);

    const result = await useCase.execute({ taskContext });
    expect(result.manifest.task).toBe('Add return feature');
    expect(result.manifest.entryPoints).toEqual(['src/order/OrderService.ts']);

    const roles = result.manifest.entries.map(e => ({ role: e.role, path: e.relativePath }));
    expect(roles).toEqual([
      { role: 'target', path: 'src/order/OrderService.ts' },
      { role: 'repositoryRule', path: 'AGENTS.md' },
      { role: 'test', path: 'src/order/OrderService.test.ts' },
      { role: 'specification', path: 'docs/order/return.md' },
      { role: 'dependency', path: 'src/order/ReturnPolicy.ts' },
      { role: 'supporting', path: 'src/refund/RefundCalculator.ts' },
    ]);
  });

  it('throws when entry point does not exist in project files', async () => {
    const ports = createMockPorts();
    const useCase = new BuildTaskContextUseCase(ports);
    const taskContext = createTaskContext('p1', 'Invalid', ['src/unknown.ts']);

    await expect(useCase.execute({ taskContext })).rejects.toThrow('Entry point not found: src/unknown.ts');
  });

  it('throws when project is not found', async () => {
    const ports = createMockPorts({
      projects: {
        getByIds: vi.fn().mockResolvedValue([]),
      },
    });
    const useCase = new BuildTaskContextUseCase(ports);
    const taskContext = createTaskContext('unknown', 'Test', ['src/order/OrderService.ts']);

    await expect(useCase.execute({ taskContext })).rejects.toThrow('Project not found: unknown');
  });

  it('handles optional recommendation failures gracefully and records warnings', async () => {
    const ports = createMockPorts({
      recommendations: {
        markdownLink: {
          recommend: vi.fn().mockRejectedValue(new Error('Doc parse failed')),
        },
      },
    });
    const useCase = new BuildTaskContextUseCase(ports);
    const taskContext = createTaskContext('p1', 'Test', ['src/order/OrderService.ts']);

    const result = await useCase.execute({ taskContext });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].kind).toBe('recommendationFailure');
    expect(result.manifest.entries.some(e => e.role === 'target')).toBe(true);
  });

  it('merges duplicate candidates deterministically and preserves combined reasons', async () => {
    const ports = createMockPorts({
      recommendations: {
        gitCoChange: {
          recommend: vi.fn().mockResolvedValue([
            createRecommendation({ projectId: 'p1', relativePath: 'src/order/ReturnPolicy.ts', source: 'gitCoChange', score: 0.9, detail: 'co-changed' })!,
          ]),
        },
      },
    });
    const useCase = new BuildTaskContextUseCase(ports);
    const taskContext = createTaskContext('p1', 'Test', ['src/order/OrderService.ts']);

    const result = await useCase.execute({ taskContext });
    const depEntry = result.manifest.entries.find(e => e.relativePath === 'src/order/ReturnPolicy.ts');
    expect(depEntry).toBeDefined();
    expect(depEntry?.role).toBe('dependency'); // dependency wins over supporting
    expect(depEntry?.recommendationReasons.length).toBe(1);
    expect(depEntry?.candidateReasons).toContain('dependency');
  });

  it('reflects token limit and budget calculations', async () => {
    const ports = createMockPorts();
    const useCase = new BuildTaskContextUseCase(ports);
    const taskContext = createTaskContext('p1', 'Budget task', ['src/order/OrderService.ts']);

    const result = await useCase.execute({ taskContext, tokenLimit: 100 });
    expect(result.manifest.budget.limit).toBe(100);
    expect(result.manifest.budget.withinLimit).toBe(false);
  });
});
