// src/features/repository-context/domain/__tests__/CandidateSupportScorer.test.ts
import { describe, expect, it } from 'vitest';
import type { CandidateEvidence } from '../CandidateEvidence';
import { deduplicateCandidateEvidences, sortCandidateEvidences } from '../CandidateEvidence';
import { calculateCandidateSupportScore } from '../CandidateSupportScorer';

describe('CandidateSupportScorer', () => {
  it('returns 0 for empty evidences', () => {
    expect(calculateCandidateSupportScore([])).toBe(0);
  });

  it('calculates score for a single evidence', () => {
    const evidence: CandidateEvidence = {
      kind: 'dependency',
      projectId: 'p1',
      candidatePath: 'src/order/OrderService.ts',
      relatedPath: 'src/order/ReturnPolicy.ts',
      detail: 'direct import',
    };
    expect(calculateCandidateSupportScore([evidence])).toBe(20);
  });

  it('applies cap per kind', () => {
    const evidences: CandidateEvidence[] = [
      { kind: 'dependency', projectId: 'p1', candidatePath: 'A.ts', relatedPath: 'B.ts', detail: '' },
      { kind: 'dependency', projectId: 'p1', candidatePath: 'A.ts', relatedPath: 'C.ts', detail: '' },
      { kind: 'dependency', projectId: 'p1', candidatePath: 'A.ts', relatedPath: 'D.ts', detail: '' },
    ];
    // cap is 2 for dependency (20 * 2 = 40)
    expect(calculateCandidateSupportScore(evidences)).toBe(40);
  });

  it('caps directoryProximity at 1', () => {
    const evidences: CandidateEvidence[] = [
      { kind: 'directoryProximity', projectId: 'p1', candidatePath: 'A.ts', relatedPath: 'B.ts', detail: '' },
      { kind: 'directoryProximity', projectId: 'p1', candidatePath: 'A.ts', relatedPath: 'C.ts', detail: '' },
    ];
    expect(calculateCandidateSupportScore(evidences)).toBe(10);
  });

  it('caps total support score at 100', () => {
    const evidences: CandidateEvidence[] = [
      { kind: 'dependency', projectId: 'p1', candidatePath: 'A.ts', relatedPath: 'B.ts', detail: '' },
      { kind: 'dependency', projectId: 'p1', candidatePath: 'A.ts', relatedPath: 'C.ts', detail: '' }, // +40
      { kind: 'relatedTest', projectId: 'p1', candidatePath: 'A.ts', relatedPath: 'A.test.ts', detail: '' },
      { kind: 'relatedTest', projectId: 'p1', candidatePath: 'A.ts', relatedPath: 'A.spec.ts', detail: '' }, // +40
      { kind: 'gitCoChange', projectId: 'p1', candidatePath: 'A.ts', relatedPath: 'D.ts', detail: '' },
      { kind: 'gitCoChange', projectId: 'p1', candidatePath: 'A.ts', relatedPath: 'E.ts', detail: '' }, // +30
    ];
    // 40 + 40 + 30 = 110 -> capped at 100
    expect(calculateCandidateSupportScore(evidences)).toBe(100);
  });

  it('deduplicates and sorts evidences deterministically', () => {
    const evidences: CandidateEvidence[] = [
      { kind: 'symbolSupport', projectId: 'p1', candidatePath: 'A.ts', relatedSymbol: 'processOrder', startLine: 50, detail: '' },
      { kind: 'dependency', projectId: 'p1', candidatePath: 'A.ts', relatedPath: 'B.ts', detail: '' },
      { kind: 'dependency', projectId: 'p1', candidatePath: 'A.ts', relatedPath: 'B.ts', detail: '' }, // duplicate
    ];
    const deduped = deduplicateCandidateEvidences(evidences);
    expect(deduped).toHaveLength(2);
    expect(deduped[0].kind).toBe('dependency');
    expect(deduped[1].kind).toBe('symbolSupport');
  });
});
