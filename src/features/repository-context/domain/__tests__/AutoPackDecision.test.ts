// src/features/repository-context/domain/__tests__/AutoPackDecision.test.ts
import { describe, expect, it } from 'vitest';
import { resolveAutoPackDecision } from '../AutoPackDecision';
import { createContextConfidence } from '../ContextConfidence';
import type { EnrichedEntryPointCandidate } from '../CandidateEvidence';

describe('AutoPackDecision', () => {
  const dummyCandidate = (file: string, score: number): EnrichedEntryPointCandidate => ({
    candidate: {
      projectId: 'p1',
      relativePath: file,
      score,
      reasons: ['exactFilenameMatch'],
      matchedTerms: ['test'],
    },
    evidence: [],
    supportScore: 80,
  });

  it('resolves AUTO_FAST_PACK when confidence is high and candidates exist', () => {
    const confidence = createContextConfidence('high', 95, ['strongExactMatch', 'largeScoreGap']);
    const candidates = [dummyCandidate('src/index.ts', 100), dummyCandidate('src/util.ts', 40)];

    const decision = resolveAutoPackDecision(confidence, candidates);

    expect(decision.decision).toBe('AUTO_FAST_PACK');
    expect(decision.requiresSelection).toBe(false);
    expect(decision.strategy).toBe('fast');
    expect(decision.autoSelectedEntryPoints).toEqual(['src/index.ts']);
  });

  it('requires manual selection when confidence is medium', () => {
    const confidence = createContextConfidence('medium', 70, ['strongStructuralSupport']);
    const candidates = [dummyCandidate('src/index.ts', 80)];

    const decision = resolveAutoPackDecision(confidence, candidates);

    expect(decision.decision).toBe('MANUAL_SELECTION_REQUIRED');
    expect(decision.requiresSelection).toBe(true);
    expect(decision.strategy).toBe('standard');
    expect(decision.autoSelectedEntryPoints).toEqual([]);
  });

  it('requires manual selection when confidence is low', () => {
    const confidence = createContextConfidence('low', 40, ['distributedCandidates']);
    const candidates = [dummyCandidate('src/a.ts', 50), dummyCandidate('src/b.ts', 48)];

    const decision = resolveAutoPackDecision(confidence, candidates);

    expect(decision.decision).toBe('MANUAL_SELECTION_REQUIRED');
    expect(decision.requiresSelection).toBe(true);
    expect(decision.strategy).toBe('expanded');
    expect(decision.autoSelectedEntryPoints).toEqual([]);
  });

  it('requires manual selection when candidates list is empty even if high', () => {
    const confidence = createContextConfidence('high', 90, ['strongExactMatch']);

    const decision = resolveAutoPackDecision(confidence, []);

    expect(decision.decision).toBe('MANUAL_SELECTION_REQUIRED');
    expect(decision.requiresSelection).toBe(true);
    expect(decision.autoSelectedEntryPoints).toEqual([]);
  });
});
