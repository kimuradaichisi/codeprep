// src/features/repository-context/application/__tests__/CollectCandidateEvidenceUseCase.test.ts
import { describe, expect, it, vi } from 'vitest';
import type { DependencyScanner } from '../../../engine/application/DependencyScanner';
import type { EntryPointCandidate } from '../../domain/EntryPointCandidate';
import type { Project } from '../../domain/Project';
import type { StructuredKnowledgeIndex } from '../../domain/StructuredKnowledgeIndex';
import type { CandidateEvidencePorts } from '../candidateEvidencePorts';
import { CollectCandidateEvidenceUseCase } from '../CollectCandidateEvidenceUseCase';

describe('CollectCandidateEvidenceUseCase', () => {
  const project: Project = { id: 'p1', rootPath: '/workspace', name: 'test' };

  const candidate: EntryPointCandidate = {
    projectId: 'p1',
    relativePath: 'src/order/OrderService.ts',
    score: 80,
    reasons: ['symbolLikeMatch'],
    matchedTerms: ['refundOrder'],
  };

  const knowledgeIndex: StructuredKnowledgeIndex = {
    metadata: {
      projectId: 'p1',
      indexedAt: '2026-09-06T00:00:00Z',
      schemaVersion: 1,
      totalEntries: 1,
      markdownSectionCount: 0,
      codeSymbolCount: 1,
    },
    entries: [
      {
        entryId: 'e1',
        projectId: 'p1',
        relativePath: 'src/order/OrderService.ts',
        kind: 'code-symbol',
        symbolName: 'refundOrder',
        symbolKind: 'method',
        startLine: 10,
        endLine: 25,
        signature: 'refundOrder(): void',
      },
    ],
  };

  const mockScanner: DependencyScanner = {
    findDependencies: vi.fn().mockResolvedValue(['src/order/ReturnPolicy.ts']),
  };

  const createPorts = (recommendations?: CandidateEvidencePorts['recommendations']): CandidateEvidencePorts => ({
    projects: { getByIds: vi.fn().mockResolvedValue([project]) },
    files: {
      list: vi.fn().mockResolvedValue([
        { relativePath: 'src/order/OrderService.ts', size: 500 },
        { relativePath: 'src/order/OrderService.test.ts', size: 400 },
        { relativePath: 'src/order/ReturnPolicy.ts', size: 300 },
      ]),
    },
    fileContent: {
      canRead: vi.fn().mockResolvedValue(true),
      read: vi.fn().mockResolvedValue("import './ReturnPolicy';"),
    },
    dependencyScanner: mockScanner,
    recommendations: recommendations ?? {
      gitCoChange: {
        recommend: vi.fn().mockResolvedValue([
          {
            projectId: 'p1',
            relativePath: 'src/payment/RefundCalculator.ts',
            reason: { source: 'gitCoChange', score: 0.9, detail: 'co-change' },
          },
        ]),
      },
    },
  });

  it('collects all available evidence kinds into a bundle', async () => {
    const ports = createPorts();
    const useCase = new CollectCandidateEvidenceUseCase(ports);

    const bundle = await useCase.execute({
      task: 'refundOrder の処理を確認する',
      project,
      candidate,
      knowledgeIndex,
    });

    expect(bundle.projectId).toBe('p1');
    expect(bundle.candidatePath).toBe('src/order/OrderService.ts');
    expect(bundle.diagnostics).toHaveLength(0);

    const kinds = bundle.evidence.map((e) => e.kind);
    expect(kinds).toContain('dependency');
    expect(kinds).toContain('relatedTest');
    expect(kinds).toContain('gitCoChange');
    expect(kinds).toContain('symbolSupport');

    const symbolEv = bundle.evidence.find((e) => e.kind === 'symbolSupport');
    expect(symbolEv?.relatedSymbol).toBe('refundOrder');
    expect(symbolEv?.startLine).toBe(10);
  });

  it('records diagnostic and continues on recommendation failure', async () => {
    const ports = createPorts({
      gitCoChange: {
        recommend: vi.fn().mockRejectedValue(new Error('Git unavailable')),
      },
    });
    const useCase = new CollectCandidateEvidenceUseCase(ports);

    const bundle = await useCase.execute({
      task: 'order test',
      project,
      candidate,
    });

    expect(bundle.diagnostics).toHaveLength(1);
    expect(bundle.diagnostics[0].kind).toBe('gitCoChange');
    expect(bundle.diagnostics[0].message).toContain('Git unavailable');
    // Other evidences still collected
    expect(bundle.evidence.some((e) => e.kind === 'dependency')).toBe(true);
    expect(bundle.evidence.some((e) => e.kind === 'relatedTest')).toBe(true);
  });
});
