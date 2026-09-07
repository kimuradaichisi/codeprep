// src/features/repository-context/domain/__tests__/ContextConfidenceEvaluator.test.ts
import { describe, expect, it } from 'vitest';
import type { EnrichedEntryPointCandidate } from '../CandidateEvidence';
import { evaluateContextConfidence } from '../ContextConfidenceEvaluator';

function makeCandidate(
  path: string,
  score: number,
  supportScore: number,
  reasons: ('exactFilenameMatch' | 'filenameMatch' | 'symbolLikeMatch' | 'semanticMatch' | 'textMatch')[]
): EnrichedEntryPointCandidate {
  return {
    candidate: {
      projectId: 'p1',
      relativePath: path,
      score,
      reasons,
      matchedTerms: ['term'],
    },
    evidence: [],
    supportScore,
  };
}

describe('ContextConfidenceEvaluator', () => {
  it('evaluates empty candidates as LOW confidence with weak support reason', () => {
    const res = evaluateContextConfidence({ candidates: [] });
    expect(res.level).toBe('low');
    expect(res.reasons).toContain('weakStructuralSupport');
  });

  it('evaluates one strong exact candidate with high score and support as HIGH', () => {
    const c1 = makeCandidate('src/index.ts', 90, 40, ['exactFilenameMatch']);
    const res = evaluateContextConfidence({ candidates: [c1] });
    expect(res.level).toBe('high');
    expect(res.reasons).toContain('strongExactMatch');
    expect(res.reasons).toContain('strongStructuralSupport');
    expect(res.score).toBeGreaterThanOrEqual(75);
  });

  it('evaluates strong symbol candidate with large gap as HIGH', () => {
    const c1 = makeCandidate('src/domain/MyClass.ts', 85, 30, ['symbolLikeMatch']);
    const c2 = makeCandidate('src/domain/Other.ts', 50, 10, ['textMatch']);
    const res = evaluateContextConfidence({ candidates: [c1, c2] });
    expect(res.level).toBe('high');
    expect(res.reasons).toContain('strongSymbolMatch');
    expect(res.reasons).toContain('largeScoreGap');
  });

  it('evaluates close candidate scores as LOW confidence', () => {
    const c1 = makeCandidate('src/a.ts', 80, 30, ['filenameMatch']);
    const c2 = makeCandidate('src/b.ts', 76, 25, ['filenameMatch']);
    const res = evaluateContextConfidence({ candidates: [c1, c2] });
    expect(res.level).toBe('low');
    expect(res.reasons).toContain('closeCandidateScores');
  });

  it('evaluates semantic-only top candidate as LOW confidence', () => {
    const c1 = makeCandidate('src/a.ts', 85, 30, ['semanticMatch']);
    const c2 = makeCandidate('src/b.ts', 50, 20, ['semanticMatch']);
    const res = evaluateContextConfidence({ candidates: [c1, c2] });
    expect(res.level).toBe('low');
    expect(res.reasons).toContain('semanticOnly');
  });

  it('evaluates distributed directories across top candidates as LOW confidence', () => {
    const c1 = makeCandidate('apps/desktop/a.ts', 85, 30, ['symbolLikeMatch']);
    const c2 = makeCandidate('src/domain/b.ts', 60, 20, ['symbolLikeMatch']);
    const c3 = makeCandidate('docs/guide/c.ts', 40, 10, ['textMatch']);
    const res = evaluateContextConfidence({ candidates: [c1, c2, c3] });
    expect(res.level).toBe('low');
    expect(res.reasons).toContain('distributedCandidates');
  });

  it('evaluates weak structural support as LOW confidence', () => {
    const c1 = makeCandidate('src/a.ts', 85, 5, ['exactFilenameMatch']);
    const c2 = makeCandidate('src/b.ts', 50, 5, ['textMatch']);
    const res = evaluateContextConfidence({ candidates: [c1, c2] });
    expect(res.level).toBe('low');
    expect(res.reasons).toContain('weakStructuralSupport');
  });

  it('evaluates moderate candidates as MEDIUM confidence', () => {
    const c1 = makeCandidate('src/a.ts', 70, 20, ['textMatch']);
    const c2 = makeCandidate('src/b.ts', 55, 15, ['textMatch']);
    const res = evaluateContextConfidence({ candidates: [c1, c2] });
    expect(res.level).toBe('medium');
    expect(res.score).toBeGreaterThanOrEqual(45);
    expect(res.score).toBeLessThanOrEqual(74);
  });

  it('returns strictly deterministic output for the same input', () => {
    const c1 = makeCandidate('src/domain/Service.ts', 88, 35, ['exactFilenameMatch', 'symbolLikeMatch']);
    const c2 = makeCandidate('src/domain/Helper.ts', 60, 20, ['textMatch']);
    const r1 = evaluateContextConfidence({ candidates: [c1, c2] });
    const r2 = evaluateContextConfidence({ candidates: [c1, c2] });
    expect(r1).toEqual(r2);
  });
});
