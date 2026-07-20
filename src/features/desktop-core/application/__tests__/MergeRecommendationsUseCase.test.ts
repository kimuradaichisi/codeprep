import { describe, expect, it } from 'vitest';
import type { AnalyzedCandidate } from '../ports';
import { createRecommendation, type RecommendationRecord } from '../../domain/Recommendation';
import { mergeRecommendations } from '../MergeRecommendationsUseCase';

const baseCandidate = (
  projectId: string,
  relativePath: string,
  score = 10,
): AnalyzedCandidate => ({
  projectId,
  relativePath,
  reasons: ['rgMatch'],
  excluded: false,
  score,
});

const recommendation = (
  relativePath: string,
  source: 'markdownLink' | 'gitCoChange',
  score: number,
  detail: string = source,
): RecommendationRecord => {
  const result = createRecommendation({
    projectId: 'p1', relativePath, source, score, detail,
  });
  if (!result) throw new Error('Invalid test recommendation');
  return result;
};

describe('mergeRecommendations', () => {
  it('deduplicates normalized keys and recommendation sources', () => {
    const result = mergeRecommendations([], [
      recommendation('docs\\auth.md', 'markdownLink', 0.8),
      recommendation('docs/auth.md', 'markdownLink', 0.4),
      recommendation('docs/auth.md', 'gitCoChange', 0.6),
    ]);

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.recommendationReasons).toHaveLength(2);
    expect(result.recommendationReasonsByKey.get('p1:docs/auth.md')).toHaveLength(2);
    expect(result.candidates[0]?.score).toBe(1.4);
    expect(result.selectedKeys).toEqual([]);
  });

  it('keeps the original base candidate and selection state intact', () => {
    const base = baseCandidate('p1', 'src\\auth.ts', 42);
    const selectedKeys = ['p1:src/auth.ts'];
    const result = mergeRecommendations(
      [base],
      [recommendation('src/auth.ts', 'markdownLink', 0.9), recommendation('docs/a.md', 'gitCoChange', 0.7)],
      selectedKeys,
    );

    expect(result.candidates[0]).toBe(base);
    expect(result.candidates[0]).toEqual(base);
    expect(result.recommendationReasonsByKey.get('p1:src/auth.ts')).toHaveLength(1);
    expect(result.recommendationReasonsByKey.get('p1:docs/a.md')).toHaveLength(1);
    expect(result.selectedKeys).toEqual(['p1:src/auth.ts']);
    expect(result.selectedKeys).not.toBe(selectedKeys);
  });

  it('matches selected keys after normalizing path separators', () => {
    const base = baseCandidate('p1', 'src/app.ts');
    const selectedKeys = ['p1:src\\app.ts'];
    const result = mergeRecommendations([base], [], selectedKeys);

    expect(result.selectedKeys).toEqual(['p1:src/app.ts']);
    expect(result.selectedKeys).not.toBe(selectedKeys);
    expect(result.candidates[0]).toBe(base);
    expect(result.candidates[0]?.excluded).toBe(false);
    expect(selectedKeys).toEqual(['p1:src\\app.ts']);
  });

  it('uses the result map as the reason lookup for every merged candidate', () => {
    const base = baseCandidate('p1', 'src/app.ts');
    const result = mergeRecommendations([base], [recommendation('docs/a.md', 'gitCoChange', 0.7)]);

    expect(result.recommendationReasonsByKey.get('p1:src/app.ts')).toEqual([]);
    expect(result.recommendationReasonsByKey.get('p1:docs/a.md')).toHaveLength(1);
  });

  it('keeps the highest-scoring reason per source with a detail tie-breaker', () => {
    const result = mergeRecommendations([], [
      recommendation('docs/a.md', 'gitCoChange', 0.7, 'z-detail'),
      recommendation('docs/a.md', 'gitCoChange', 0.9, 'low-detail'),
      recommendation('docs/a.md', 'gitCoChange', 0.9, 'high-detail'),
    ]);

    expect(result.recommendationReasonsByKey.get('p1:docs/a.md')).toEqual([{
      source: 'gitCoChange', score: 0.9, detail: 'high-detail',
    }]);
  });

  it('uses code-unit ordering for equal-score detail tie-breaks', () => {
    const result = mergeRecommendations([], [
      recommendation('docs/a.md', 'gitCoChange', 0.9, 'a-detail'),
      recommendation('docs/a.md', 'gitCoChange', 0.9, 'Z-detail'),
    ]);

    expect(result.recommendationReasonsByKey.get('p1:docs/a.md')).toEqual([{
      source: 'gitCoChange', score: 0.9, detail: 'Z-detail',
    }]);
  });

  it('sorts by finite aggregate score and normalized key on ties', () => {
    const result = mergeRecommendations([], [
      recommendation('z.md', 'markdownLink', 0.5),
      recommendation('a.md', 'gitCoChange', 0.5),
      recommendation('b.md', 'markdownLink', 0.5),
    ]);

    expect(result.candidates.map(candidate => `${candidate.projectId}:${candidate.relativePath}`)).toEqual([
      'p1:a.md', 'p1:b.md', 'p1:z.md',
    ]);
    expect(result.candidates.every(candidate => Number.isFinite(candidate.score))).toBe(true);
  });

  it('uses code-unit ordering for equal-score candidate keys', () => {
    const result = mergeRecommendations([], [
      recommendation('a.md', 'markdownLink', 0.5),
      recommendation('A.md', 'gitCoChange', 0.5),
      recommendation('ä.md', 'markdownLink', 0.5),
      recommendation('z.md', 'gitCoChange', 0.5),
    ]);

    expect(result.candidates.map(candidate => candidate.relativePath)).toEqual([
      'A.md', 'a.md', 'z.md', 'ä.md',
    ]);
  });

  it('returns the original candidates for an empty recommendation result', () => {
    const base = baseCandidate('p1', 'src/app.ts');
    const second = baseCandidate('p1', 'docs/readme.md', 20);
    const result = mergeRecommendations([base, second], [], ['p1:src/app.ts']);

    expect(result.candidates).toEqual([base, second]);
    expect(result.candidates[0]).toBe(base);
    expect(result.selectedKeys).toEqual(['p1:src/app.ts']);
  });
});