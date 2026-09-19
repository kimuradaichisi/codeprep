// src/features/repository-context/domain/workingset/__tests__/WorkingSetSelector.test.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import { WorkingSetSelector } from '../WorkingSetSelector';
import type { WorkingSetCandidate } from '../WorkingSetCandidate';

describe('WorkingSetSelector', () => {
  const makeCandidate = (
    path: string,
    priority: number,
    score: number,
    role: 'target' | 'dependency' | 'test' | 'supporting' = 'supporting'
  ): WorkingSetCandidate => ({
    nodeId: `node:${path}`,
    path,
    role,
    tier: priority <= 2 ? 'core' : 'supporting',
    score,
    priority,
    estimatedTokens: 500,
    estimatedBytes: 2000,
    reasons: [`reason for ${path}`],
    relationPaths: [],
    provenance: 'graph',
  });

  it('selects explicit and core candidates with highest priority', () => {
    const c1 = makeCandidate('src/Explicit.ts', 1, 1.0, 'target');
    const c2 = makeCandidate('src/Core.ts', 2, 0.9, 'target');
    const c3 = makeCandidate('src/Supporting.ts', 7, 0.5, 'supporting');

    const result = WorkingSetSelector.select({
      task: 'test task',
      graphCandidates: [c3, c2, c1],
    });

    expect(result.workingSet.core.length).toBe(2);
    expect(result.workingSet.entries[0].relativePath).toBe('src/Explicit.ts');
    expect(result.workingSet.entries[1].relativePath).toBe('src/Core.ts');
    expect(result.workingSet.entries[2].relativePath).toBe('src/Supporting.ts');
  });

  it('deduplicates multiple candidates with the same path and keeps highest score', () => {
    const c1 = makeCandidate('src/Service.ts', 3, 0.6, 'dependency');
    const c2 = makeCandidate('src/Service.ts', 2, 0.9, 'target');

    const result = WorkingSetSelector.select({
      task: 'dedup task',
      graphCandidates: [c1, c2],
    });

    expect(result.workingSet.entries.length).toBe(1);
    expect(result.workingSet.entries[0].relativePath).toBe('src/Service.ts');
    expect(result.workingSet.entries[0].tier).toBe('core');
    expect(result.workingSet.entries[0].score).toBe(0.9);
    expect(result.excluded.some((e) => e.reason === 'duplicateCoverage')).toBe(true);
  });

  it('injects recall reserve without displacing core entries', () => {
    const graphCandidates = [
      makeCandidate('src/Core1.ts', 2, 0.9, 'target'),
      makeCandidate('src/Core2.ts', 2, 0.85, 'target'),
    ];
    const legacyCandidates = [
      { relativePath: 'src/Core1.ts', score: 0.95, reasons: ['legacy match'] }, // existing in graph
      { relativePath: 'src/Legacy1.ts', score: 0.8, reasons: ['legacy hit 1'] },
      { relativePath: 'docs/arch.md', score: 0.7, reasons: ['doc hit'] },
      { relativePath: 'docs/extra.md', score: 0.6, reasons: ['doc extra'] }, // should be limited
    ];

    const result = WorkingSetSelector.select({
      task: 'reserve task',
      graphCandidates,
      legacyCandidates,
      reserveOptions: { maxRecallReserve: 3, maxDocsInReserve: 1 },
    });

    const entries = result.workingSet.entries;
    expect(entries.some((e) => e.relativePath === 'src/Legacy1.ts')).toBe(true);
    expect(entries.some((e) => e.relativePath === 'docs/arch.md')).toBe(true);
    // doc limit = 1 prevents docs/extra.md from entering reserve
    expect(entries.some((e) => e.relativePath === 'docs/extra.md')).toBe(false);
    expect(result.workingSet.recallReserve.length).toBe(2);
  });

  it('respects budget limits and records excluded reasons', () => {
    const candidates = [
      makeCandidate('src/A.ts', 2, 0.9),
      makeCandidate('src/B.ts', 2, 0.8),
      makeCandidate('src/C.ts', 3, 0.7),
    ];
    const tightBudget = { maxFiles: 2, maxNodes: 5, maxEstimatedTokens: 5000, maxBytes: 10000 };

    const result = WorkingSetSelector.select({
      task: 'budget task',
      graphCandidates: candidates,
      budget: tightBudget,
    });

    expect(result.workingSet.entries.length).toBe(2);
    expect(result.excluded.length).toBe(1);
    expect(result.excluded[0].path).toBe('src/C.ts');
    expect(result.excluded[0].reason).toBe('budgetExceeded');
  });

  it('excludes candidates with weak evidence', () => {
    const weak = makeCandidate('src/Weak.ts', 7, 0.05, 'supporting');
    const result = WorkingSetSelector.select({
      task: 'weak task',
      graphCandidates: [weak],
    });

    expect(result.workingSet.entries.length).toBe(0);
    expect(result.excluded.length).toBe(1);
    expect(result.excluded[0].reason).toBe('weakEvidence');
  });
});
