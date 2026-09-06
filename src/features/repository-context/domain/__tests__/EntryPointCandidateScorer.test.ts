// src/features/repository-context/domain/__tests__/EntryPointCandidateScorer.test.ts
import { describe, expect, it } from 'vitest';
import {
  calculateCandidateScore,
  mergeCandidateEvidences,
  sortEntryPointCandidates,
  filterEntryPointCandidates,
} from '../EntryPointCandidateScorer';
import type { EntryPointCandidate, EntryPointCandidateEvidence } from '../EntryPointCandidate';

describe('EntryPointCandidateScorer', () => {
  it('calculates score with no duplicate reasons', () => {
    const score = calculateCandidateScore(['filenameMatch', 'filenameMatch', 'textMatch']);
    // filenameMatch (60) + textMatch (35) = 95
    expect(score).toBe(95);
  });

  it('merges multiple evidences for the same file', () => {
    const evidences: EntryPointCandidateEvidence[] = [
      { projectId: 'p1', relativePath: 'src/Service.ts', reason: 'filenameMatch', matchedTerm: 'Service' },
      { projectId: 'p1', relativePath: 'src/Service.ts', reason: 'textMatch', matchedTerm: 'service' },
      { projectId: 'p1', relativePath: 'docs/guide.md', reason: 'headingMatch', matchedTerm: 'Guide' },
    ];

    const merged = mergeCandidateEvidences(evidences);
    expect(merged.length).toBe(2);

    const service = merged.find((c) => c.relativePath === 'src/Service.ts');
    expect(service).toBeDefined();
    expect(service?.score).toBe(95);
    expect(service?.reasons).toEqual(['filenameMatch', 'textMatch']);
    expect(service?.matchedTerms).toEqual(['Service', 'service']);
    expect(service?.kind).toBe('code');

    const doc = merged.find((c) => c.relativePath === 'docs/guide.md');
    expect(doc?.kind).toBe('document');
  });

  it('sorts candidates by score descending, exact match, then path', () => {
    const candidates: EntryPointCandidate[] = [
      { projectId: 'p1', relativePath: 'b.ts', score: 60, reasons: ['filenameMatch'], matchedTerms: [] },
      { projectId: 'p1', relativePath: 'a.ts', score: 60, reasons: ['exactFilenameMatch'], matchedTerms: [] },
      { projectId: 'p1', relativePath: 'c.ts', score: 80, reasons: ['symbolLikeMatch'], matchedTerms: [] },
      { projectId: 'p1', relativePath: 'a2.ts', score: 60, reasons: ['filenameMatch'], matchedTerms: [] },
    ];

    const sorted = sortEntryPointCandidates(candidates);
    expect(sorted[0].relativePath).toBe('c.ts'); // 80
    expect(sorted[1].relativePath).toBe('a.ts'); // 60 with exactFilenameMatch
    expect(sorted[2].relativePath).toBe('a2.ts'); // 60 without exact, 'a2' < 'b'
    expect(sorted[3].relativePath).toBe('b.ts'); // 60 without exact
  });

  it('filters out ignored candidates and respects max limit', () => {
    const candidates: EntryPointCandidate[] = [
      { projectId: 'p1', relativePath: 'node_modules/pkg/index.js', score: 100, reasons: ['exactFilenameMatch'], matchedTerms: [] },
      { projectId: 'p1', relativePath: 'src/app.ts', score: 50, reasons: ['textMatch'], matchedTerms: [] },
      { projectId: 'p1', relativePath: 'assets/icon.png', score: 70, reasons: ['filenameMatch'], matchedTerms: [] },
    ];

    const filtered = filterEntryPointCandidates(candidates, 10);
    expect(filtered.length).toBe(1);
    expect(filtered[0].relativePath).toBe('src/app.ts');
  });
});
