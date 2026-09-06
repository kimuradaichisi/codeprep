// src/features/repository-context/application/__tests__/EnrichEntryPointCandidatesUseCase.test.ts
import { describe, expect, it, vi } from 'vitest';
import type { DependencyScanner } from '../../../engine/application/DependencyScanner';
import type { EntryPointCandidate } from '../../domain/EntryPointCandidate';
import type { Project } from '../../domain/Project';
import type { CandidateEvidencePorts } from '../candidateEvidencePorts';
import { EnrichEntryPointCandidatesUseCase } from '../EnrichEntryPointCandidatesUseCase';

describe('EnrichEntryPointCandidatesUseCase', () => {
  const project: Project = {
    id: 'p1',
    rootPath: '/workspace',
    name: 'test',
  };

  const mockScanner: DependencyScanner = {
    findDependencies: vi.fn().mockResolvedValue(['src/order/ReturnPolicy.ts']),
  };

  const createMockPorts = (readMock?: () => Promise<string | undefined>): CandidateEvidencePorts => ({
    projects: {
      getByIds: vi.fn().mockResolvedValue([project]),
    },
    files: {
      list: vi.fn().mockResolvedValue([
        { relativePath: 'src/order/OrderService.ts', size: 500 },
        { relativePath: 'src/order/OrderService.test.ts', size: 400 },
        { relativePath: 'src/order/ReturnPolicy.ts', size: 300 },
      ]),
    },
    fileContent: {
      canRead: vi.fn().mockResolvedValue(true),
      read: readMock ?? vi.fn().mockResolvedValue("import './ReturnPolicy';"),
    },
    dependencyScanner: mockScanner,
    recommendations: {
      gitCoChange: {
        recommend: vi.fn().mockResolvedValue([
          {
            projectId: 'p1',
            relativePath: 'src/payment/RefundCalculator.ts',
            reason: { source: 'gitCoChange', score: 0.8, detail: 'co-changed 5 times' },
          },
        ]),
      },
    },
  });

  const candidates: EntryPointCandidate[] = [
    {
      projectId: 'p1',
      relativePath: 'src/order/OrderService.ts',
      score: 85,
      reasons: ['symbolLikeMatch', 'semanticMatch'],
      matchedTerms: ['refund'],
    },
    {
      projectId: 'p1',
      relativePath: 'CHANGELOG.md',
      score: 80,
      reasons: ['semanticMatch'],
      matchedTerms: ['refund'],
    },
  ];

  it('enriches top N candidates with structural evidence and support scores', async () => {
    const ports = createMockPorts();
    const useCase = new EnrichEntryPointCandidatesUseCase(ports);

    const enriched = await useCase.execute({
      task: '返品時の二重返金を調査する',
      projectIds: ['p1'],
      candidates,
      options: { enrichTopN: 1 },
    });

    expect(enriched).toHaveLength(2);
    // Top 1 candidate should have evidence and support score
    expect(enriched[0].candidate.relativePath).toBe('src/order/OrderService.ts');
    expect(enriched[0].candidate.score).toBe(85); // discovery score unchanged!
    expect(enriched[0].evidence.length).toBeGreaterThan(0);
    expect(enriched[0].supportScore).toBeGreaterThan(0);

    const kinds = enriched[0].evidence.map((e) => e.kind);
    expect(kinds).toContain('dependency');
    expect(kinds).toContain('relatedTest');
    expect(kinds).toContain('gitCoChange');

    // Candidate outside top N has empty evidence and supportScore 0
    expect(enriched[1].candidate.relativePath).toBe('CHANGELOG.md');
    expect(enriched[1].evidence).toHaveLength(0);
    expect(enriched[1].supportScore).toBe(0);
  });

  it('gracefully degrades on component failures', async () => {
    const ports = createMockPorts(vi.fn().mockRejectedValue(new Error('file read error')));
    const useCase = new EnrichEntryPointCandidatesUseCase(ports);

    const enriched = await useCase.execute({
      task: 'test task',
      projectIds: ['p1'],
      candidates: [candidates[0]],
    });

    expect(enriched).toHaveLength(1);
    expect(enriched[0].candidate.relativePath).toBe('src/order/OrderService.ts');
    // Still receives relatedTest and gitCoChange even if dependency scan failed
    const kinds = enriched[0].evidence.map((e) => e.kind);
    expect(kinds).toContain('relatedTest');
    expect(kinds).toContain('gitCoChange');
  });
});
