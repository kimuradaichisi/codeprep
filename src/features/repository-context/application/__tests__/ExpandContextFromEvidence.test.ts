// src/features/repository-context/application/__tests__/ExpandContextFromEvidence.test.ts
import { describe, expect, it } from 'vitest';
import type { CandidateEvidence } from '../../domain/CandidateEvidence';
import { expandContextFromEvidence } from '../ExpandContextFromEvidence';

describe('expandContextFromEvidence', () => {
  it('expands candidates from evidence related paths with appropriate reasons', () => {
    const evidences: CandidateEvidence[] = [
      {
        kind: 'dependency',
        projectId: 'p1',
        candidatePath: 'src/order/OrderService.ts',
        relatedPath: 'src/order/ReturnPolicy.ts',
        detail: '',
      },
      {
        kind: 'relatedTest',
        projectId: 'p1',
        candidatePath: 'src/order/OrderService.ts',
        relatedPath: 'src/order/OrderService.test.ts',
        detail: '',
      },
      {
        kind: 'markdownLink',
        projectId: 'p1',
        candidatePath: 'src/order/OrderService.ts',
        relatedPath: 'docs/order/refund.md',
        detail: '',
      },
      {
        kind: 'gitCoChange',
        projectId: 'p1',
        candidatePath: 'src/order/OrderService.ts',
        relatedPath: 'src/payment/RefundCalculator.ts',
        detail: '',
      },
    ];

    const expanded = expandContextFromEvidence(evidences, 5);
    expect(expanded).toHaveLength(4);
    expect(expanded[0].relativePath).toBe('src/order/ReturnPolicy.ts');
    expect(expanded[0].reasons).toContain('dependency');
    expect(expanded[1].relativePath).toBe('src/order/OrderService.test.ts');
    expect(expanded[1].reasons).toContain('pathAffinity');
    expect(expanded[2].relativePath).toBe('docs/order/refund.md');
    expect(expanded[2].reasons).toContain('pathAffinity');
    expect(expanded[3].relativePath).toBe('src/payment/RefundCalculator.ts');
    expect(expanded[3].reasons).toContain('pathAffinity');
  });

  it('respects maxExpansion limit', () => {
    const evidences: CandidateEvidence[] = [
      { kind: 'dependency', projectId: 'p1', candidatePath: 'A.ts', relatedPath: 'B.ts', detail: '' },
      { kind: 'dependency', projectId: 'p1', candidatePath: 'A.ts', relatedPath: 'C.ts', detail: '' },
      { kind: 'dependency', projectId: 'p1', candidatePath: 'A.ts', relatedPath: 'D.ts', detail: '' },
    ];
    const expanded = expandContextFromEvidence(evidences, 2);
    expect(expanded).toHaveLength(2);
  });
});
