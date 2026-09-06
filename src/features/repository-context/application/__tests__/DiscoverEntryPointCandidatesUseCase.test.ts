// src/features/repository-context/application/__tests__/DiscoverEntryPointCandidatesUseCase.test.ts
import { describe, expect, it, vi } from 'vitest';
import { DiscoverEntryPointCandidatesUseCase } from '../DiscoverEntryPointCandidatesUseCase';
import type { DiscoverEntryPointCandidatesPorts } from '../entryPointCandidatePorts';
import type { Project } from '../../domain/Project';

describe('DiscoverEntryPointCandidatesUseCase', () => {
  const project: Project = { id: 'p1', name: 'Proj1', rootPath: '/app' };

  const createPorts = (overrides?: Partial<DiscoverEntryPointCandidatesPorts>): DiscoverEntryPointCandidatesPorts => ({
    projects: { getByIds: vi.fn(async () => [project]) },
    files: {
      list: vi.fn(async () => [
        { relativePath: 'src/order/OrderService.ts', size: 100 },
        { relativePath: 'src/payment/RefundService.ts', size: 120 },
        { relativePath: 'docs/refund_spec.md', size: 80 },
        { relativePath: 'node_modules/pkg/index.js', size: 200 },
      ]),
    },
    ripgrep: {
      search: vi.fn(async (_proj, query) => {
        if (query.includes('RefundService')) {
          return { matches: [{ relativePath: 'src/payment/RefundService.ts' }] };
        }
        return { matches: [] };
      }),
    },
    fileContent: {
      read: vi.fn(async (_proj, rel) => {
        if (rel === 'docs/refund_spec.md') return '# Refund Specification\nDetails here.';
        return '';
      }),
      canRead: vi.fn(async () => true),
    },
    ...overrides,
  });

  it('returns empty result when task is blank', async () => {
    const useCase = new DiscoverEntryPointCandidatesUseCase(createPorts());
    const result = await useCase.execute({ task: '   ' });
    expect(result.candidates).toEqual([]);
    expect(result.terms).toEqual([]);
  });

  it('discovers candidates with filename, text and heading matches', async () => {
    const useCase = new DiscoverEntryPointCandidatesUseCase(createPorts());
    const result = await useCase.execute({
      task: 'Investigate RefundService and refund specification',
      projectIds: [project.id],
    });

    expect(result.candidates.length).toBeGreaterThan(0);
    const refundService = result.candidates.find((c) => c.relativePath === 'src/payment/RefundService.ts');
    expect(refundService).toBeDefined();
    // exactFilenameMatch (100) + textMatch (35) + symbolLikeMatch (70)
    expect(refundService?.reasons).toContain('exactFilenameMatch');
    expect(refundService?.reasons).toContain('textMatch');

    const refundSpec = result.candidates.find((c) => c.relativePath === 'docs/refund_spec.md');
    expect(refundSpec).toBeDefined();
    expect(refundSpec?.reasons).toContain('headingMatch');
  });

  it('tolerates ripgrep failure and still returns filename matches', async () => {
    const failingPorts = createPorts({
      ripgrep: {
        search: vi.fn(async () => {
          throw new Error('ripgrep crashed');
        }),
      },
    });

    const useCase = new DiscoverEntryPointCandidatesUseCase(failingPorts);
    const result = await useCase.execute({
      task: 'Check OrderService',
      projectIds: [project.id],
    });

    expect(result.candidates.length).toBeGreaterThan(0);
    const order = result.candidates.find((c) => c.relativePath === 'src/order/OrderService.ts');
    expect(order?.reasons).toContain('exactFilenameMatch');
  });

  it('integrates manual pins with maximum score', async () => {
    const useCase = new DiscoverEntryPointCandidatesUseCase(createPorts());
    const result = await useCase.execute({
      task: 'Some random task',
      projectIds: [project.id],
      manualPinnedPaths: ['src/custom/PinnedFile.ts'],
    });

    const pinned = result.candidates.find((c) => c.relativePath === 'src/custom/PinnedFile.ts');
    expect(pinned).toBeDefined();
    expect(pinned?.reasons).toContain('manualPin');
    expect(pinned?.score).toBeGreaterThanOrEqual(100);
  });

  it('respects maxCandidates limit and sorts deterministically', async () => {
    const useCase = new DiscoverEntryPointCandidatesUseCase(createPorts());
    const result = await useCase.execute({
      task: 'RefundService OrderService refund',
      projectIds: [project.id],
      maxCandidates: 1,
    });

    expect(result.candidates.length).toBe(1);
    // Highest score candidate should be first
    expect(result.candidates[0].score).toBeGreaterThanOrEqual(60);
  });
});
