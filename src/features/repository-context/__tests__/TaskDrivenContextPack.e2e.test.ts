// src/features/repository-context/__tests__/TaskDrivenContextPack.e2e.test.ts
import { describe, expect, it, vi } from 'vitest';
import { BuildTaskContextUseCase } from '../application/BuildTaskContextUseCase';
import { formatContextManifest } from '../infrastructure/formatting/ContextManifestFormatter';
import type { BuildTaskContextPorts } from '../application/taskContextPorts';
import type { Project } from '../domain/Project';
import { createRecommendation } from '../domain/Recommendation';

describe('Task-driven Context Pack E2E Scenario', () => {
  const project: Project = { id: 'order-system', name: 'OrderSystem', rootPath: '/app' };

  const allFiles = [
    { relativePath: 'src/order/OrderService.ts', size: 500 },
    { relativePath: 'src/order/ReturnPolicy.ts', size: 300 },
    { relativePath: 'src/order/OrderService.test.ts', size: 400 },
    { relativePath: 'docs/order/return.md', size: 200 },
    { relativePath: 'AGENTS.md', size: 150 },
    { relativePath: 'src/order/RefundCalculator.ts', size: 250 },
  ];

  const createMockPorts = (): BuildTaskContextPorts => ({
    projects: { getByIds: vi.fn(async () => [project]) },
    files: { list: vi.fn(async () => allFiles) },
    fileContent: {
      read: vi.fn(async (_p, rel) => {
        if (rel === 'src/order/OrderService.ts') return 'import { ReturnPolicy } from "./ReturnPolicy";';
        return '';
      }),
      canRead: vi.fn(async () => true),
    },
    dependencyScanner: {
      findDependencies: vi.fn(async (file: string) => {
        if (file === 'src/order/OrderService.ts') return ['src/order/ReturnPolicy.ts'];
        return [];
      }),
    },
    recommendations: {
      markdownLink: {
        recommend: vi.fn(async () => [
          createRecommendation({
            projectId: project.id,
            relativePath: 'docs/order/return.md',
            source: 'markdownLink',
            score: 80,
            detail: 'Linked doc',
          })!,
        ]),
      },
      nameHeading: { recommend: vi.fn(async () => []) },
      gitCoChange: {
        recommend: vi.fn(async () => [
          createRecommendation({
            projectId: project.id,
            relativePath: 'src/order/RefundCalculator.ts',
            source: 'gitCoChange',
            score: 60,
            detail: 'Co-changed with OrderService',
          })!,
        ]),
      },
      directoryProximity: { recommend: vi.fn(async () => []) },
    },
  });

  it('correctly discovers, classifies, and orders all context roles according to specification', async () => {
    const ports = createMockPorts();
    const useCase = new BuildTaskContextUseCase(ports);

    const result = await useCase.execute({
      taskContext: {
        projectId: project.id,
        task: '返品処理を OrderService へ追加する',
        entryPoints: ['src/order/OrderService.ts'],
      },
      tokenLimit: 50000,
    });

    const entries = result.manifest.entries;
    const entryMap = new Map(entries.map(e => [e.relativePath, e]));

    expect(entryMap.get('src/order/OrderService.ts')?.role).toBe('target');
    expect(entryMap.get('ReturnPolicy.ts')?.role ?? entryMap.get('src/order/ReturnPolicy.ts')?.role).toBe('dependency');
    expect(entryMap.get('src/order/OrderService.test.ts')?.role).toBe('test');
    expect(entryMap.get('docs/order/return.md')?.role).toBe('specification');
    expect(entryMap.get('AGENTS.md')?.role).toBe('repositoryRule');
    expect(entryMap.get('src/order/RefundCalculator.ts')?.role).toBe('supporting');

    const rolesInOrder = entries.map(e => e.role);
    expect(rolesInOrder).toEqual(['target', 'repositoryRule', 'test', 'specification', 'dependency', 'supporting']);

    const markdown = formatContextManifest(result.manifest);
    expect(markdown).toContain('## Task\n\n返品処理を OrderService へ追加する');
    expect(markdown).toContain('## Entry Points\n\n- src/order/OrderService.ts');
    expect(markdown).toContain('| target | src/order/OrderService.ts |');
    expect(markdown).toContain('| repositoryRule | AGENTS.md |');
    expect(markdown).toContain('| test | src/order/OrderService.test.ts |');
    expect(markdown).toContain('| specification | docs/order/return.md |');
    expect(markdown).toContain('| dependency | src/order/ReturnPolicy.ts |');
    expect(markdown).toContain('| supporting | src/order/RefundCalculator.ts |');
    expect(markdown).toContain('## Budget');
    expect(markdown).toContain('Within limit: yes');
  });
});
