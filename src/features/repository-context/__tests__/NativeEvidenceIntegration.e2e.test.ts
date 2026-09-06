// src/features/repository-context/__tests__/NativeEvidenceIntegration.e2e.test.ts
import { describe, expect, it, vi } from 'vitest';
import type { DependencyScanner } from '../../engine/application/DependencyScanner';
import { expandContextFromEvidence } from '../application/ExpandContextFromEvidence';
import type { EntryPointCandidate } from '../domain/EntryPointCandidate';
import type { Project } from '../domain/Project';
import type { CandidateEvidencePorts } from '../application/candidateEvidencePorts';
import { EnrichEntryPointCandidatesUseCase } from '../application/EnrichEntryPointCandidatesUseCase';
import { formatContextManifest } from '../infrastructure/formatting/ContextManifestFormatter';
import { createContextManifest } from '../domain/ContextManifest';
import { evaluateBudget } from '../domain/ContextBudget';

describe('NativeEvidenceIntegration (Phase 4 E2E)', () => {
  const project: Project = { id: 'test-project', rootPath: '/app', name: 'order-system' };

  const mockScanner: DependencyScanner = {
    findDependencies: vi.fn().mockImplementation(async (file: string) =>
      file === 'src/order/OrderService.ts' ? ['src/order/ReturnPolicy.ts'] : []
    ),
  };

  const createPorts = (): CandidateEvidencePorts => ({
    projects: { getByIds: vi.fn().mockResolvedValue([project]) },
    files: {
      list: vi.fn().mockResolvedValue([
        { relativePath: 'src/order/OrderService.ts', size: 1000 },
        { relativePath: 'src/order/ReturnPolicy.ts', size: 600 },
        { relativePath: 'src/payment/RefundCalculator.ts', size: 800 },
        { relativePath: 'tests/OrderService.test.ts', size: 400 },
        { relativePath: 'docs/order/refund.md', size: 500 },
        { relativePath: 'CHANGELOG.md', size: 3000 },
      ]),
    },
    fileContent: {
      canRead: vi.fn().mockResolvedValue(true),
      read: vi.fn().mockImplementation(async (_p, rel: string) => {
        if (rel === 'src/order/OrderService.ts') return "import './ReturnPolicy'; export class OrderService {}";
        if (rel === 'CHANGELOG.md') return '# Changelog\n- Fix refund duplicates';
        return '';
      }),
    },
    dependencyScanner: mockScanner,
    recommendations: {
      gitCoChange: {
        recommend: vi.fn().mockImplementation(async (_p, rel: string) =>
          rel === 'src/order/OrderService.ts'
            ? [{ projectId: 'test-project', relativePath: 'src/payment/RefundCalculator.ts', reason: { source: 'gitCoChange', score: 0.8, detail: 'co-changed' } }]
            : []
        ),
      },
      markdownLink: {
        recommend: vi.fn().mockImplementation(async (_p, rel: string) =>
          rel === 'src/order/OrderService.ts'
            ? [{ projectId: 'test-project', relativePath: 'docs/order/refund.md', reason: { source: 'markdownLink', score: 0.9, detail: 'mentioned' } }]
            : []
        ),
      },
    },
  });

  it('demonstrates structural support differentiation between implementation and changelog', async () => {
    const candidates: EntryPointCandidate[] = [
      {
        projectId: 'test-project',
        relativePath: 'src/order/OrderService.ts',
        score: 85,
        reasons: ['symbolLikeMatch', 'semanticMatch'],
        matchedTerms: ['refund'],
      },
      {
        projectId: 'test-project',
        relativePath: 'CHANGELOG.md',
        score: 80,
        reasons: ['semanticMatch'],
        matchedTerms: ['refund'],
      },
    ];

    const useCase = new EnrichEntryPointCandidatesUseCase(createPorts());
    const enriched = await useCase.execute({
      task: '返品時の二重返金を調査する',
      projectIds: ['test-project'],
      candidates,
    });

    const orderService = enriched.find((e) => e.candidate.relativePath === 'src/order/OrderService.ts')!;
    const changelog = enriched.find((e) => e.candidate.relativePath === 'CHANGELOG.md')!;

    // 1. OrderService should receive structural evidence and high support score
    expect(orderService.supportScore).toBeGreaterThanOrEqual(60);
    const kinds = orderService.evidence.map((ev) => ev.kind);
    expect(kinds).toContain('dependency');
    expect(kinds).toContain('relatedTest');
    expect(kinds).toContain('gitCoChange');
    expect(kinds).toContain('markdownLink');

    // 2. CHANGELOG should have low or 0 support score (unsupported false positive)
    expect(changelog.supportScore).toBeLessThanOrEqual(10);
    expect(changelog.evidence).toHaveLength(0);

    // 3. Related context expansion extracts direct dependencies and tests
    const expanded = expandContextFromEvidence(orderService.evidence);
    const expandedPaths = expanded.map((c) => c.relativePath);
    expect(expandedPaths).toContain('src/order/ReturnPolicy.ts');
    expect(expandedPaths).toContain('tests/OrderService.test.ts');

    // 4. Manifest formatting includes Candidate Evidence section
    const budget = evaluateBudget(2000, 10000);
    const manifest = createContextManifest('test-project', '返品時の二重返金を調査する', ['src/order/OrderService.ts'], [], budget, orderService.evidence);
    const markdown = formatContextManifest(manifest);
    expect(markdown).toContain('## Candidate Evidence');
    expect(markdown).toContain('### src/order/OrderService.ts');
    expect(markdown).toContain('- dependency: src/order/ReturnPolicy.ts');
    expect(markdown).toContain('- relatedTest: tests/OrderService.test.ts');
  });
});
