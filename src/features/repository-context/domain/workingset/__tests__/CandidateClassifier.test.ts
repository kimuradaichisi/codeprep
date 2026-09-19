// src/features/repository-context/domain/workingset/__tests__/CandidateClassifier.test.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import { CandidateClassifier } from '../CandidateClassifier';

describe('CandidateClassifier', () => {
  it('classifies explicit items as priority 1 core', () => {
    const res = CandidateClassifier.classify({
      isExplicit: true,
      score: 1.0,
      role: 'target',
    });
    expect(res).toEqual({ tier: 'core', priority: 1 });
  });

  it('classifies high-confidence seeds or relations as priority 2 core', () => {
    const seedRes = CandidateClassifier.classify({
      isSeed: true,
      score: 0.9,
      role: 'target',
    });
    expect(seedRes).toEqual({ tier: 'core', priority: 2 });

    const relRes = CandidateClassifier.classify({
      relations: ['BINDS_TO'],
      score: 0.8,
      role: 'dependency',
    });
    expect(relRes).toEqual({ tier: 'core', priority: 2 });
  });

  it('classifies legacy reserve as priority 6 recallReserve', () => {
    const res = CandidateClassifier.classify({
      isLegacyReserve: true,
      score: 0.7,
      role: 'supporting',
    });
    expect(res).toEqual({ tier: 'recallReserve', priority: 6 });
  });

  it('classifies dependencies, tests, docs, and others into supporting priorities', () => {
    expect(
      CandidateClassifier.classify({ role: 'dependency', score: 0.5 }).priority
    ).toBe(3);
    expect(
      CandidateClassifier.classify({ role: 'test', score: 0.5 }).priority
    ).toBe(4);
    expect(
      CandidateClassifier.classify({ role: 'architecture', score: 0.5 }).priority
    ).toBe(5);
    expect(
      CandidateClassifier.classify({ role: 'supporting', score: 0.5 }).priority
    ).toBe(7);
  });
});
