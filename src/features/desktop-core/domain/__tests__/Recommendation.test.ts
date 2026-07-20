import { describe, expect, it } from 'vitest';
import type { RecommendationSource } from '../Recommendation';
import {
  createRecommendation,
  defaultRecommendationSettings,
  isRecommendationSource,
} from '../Recommendation';

describe('Recommendation', () => {
  it('accepts the recommendation sources and enables fallback sources by default', () => {
    expect(isRecommendationSource('docgraph')).toBe(true);
    expect(isRecommendationSource('markdownLink')).toBe(true);
    expect(isRecommendationSource('nameHeading')).toBe(true);
    expect(isRecommendationSource('gitCoChange')).toBe(true);
    expect(isRecommendationSource('directoryProximity')).toBe(true);
    expect(defaultRecommendationSettings()).toEqual({
      markdownLink: true,
      nameHeading: true,
      gitCoChange: true,
      directoryProximity: true,
    });
  });

  it('rejects unknown sources', () => {
    expect(isRecommendationSource('unknown')).toBe(false);
    expect(isRecommendationSource(null)).toBe(false);
    expect(isRecommendationSource(1)).toBe(false);
  });

  it('returns undefined for an unknown source at runtime', () => {
    expect(
      createRecommendation({
        projectId: 'p1',
        relativePath: 'docs/auth.md',
        source: 'unknown' as RecommendationSource,
        score: 0.8,
        detail: 'link from docs/index.md',
      }),
    ).toBeUndefined();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -0.1])(
    'rejects invalid score %s',
    score => {
      expect(
        createRecommendation({
          projectId: 'p1',
          relativePath: 'docs/auth.md',
          source: 'markdownLink',
          score,
          detail: 'link from docs/index.md',
        }),
      ).toBeUndefined();
    },
  );

  it('accepts score 0 as the lower valid score boundary', () => {
    expect(
      createRecommendation({
        projectId: 'p1',
        relativePath: 'docs/auth.md',
        source: 'markdownLink',
        score: 0,
        detail: 'link from docs/index.md',
      }),
    ).toEqual({
      projectId: 'p1',
      relativePath: 'docs/auth.md',
      reason: {
        source: 'markdownLink',
        score: 0,
        detail: 'link from docs/index.md',
      },
    });
  });

  it('normalizes paths and returns the recommendation reason', () => {
    expect(
      createRecommendation({
        projectId: 'p1',
        relativePath: 'docs\\auth.md',
        source: 'markdownLink',
        score: 0.8,
        detail: 'link from docs/index.md',
      }),
    ).toEqual({
      projectId: 'p1',
      relativePath: 'docs/auth.md',
      reason: {
        source: 'markdownLink',
        score: 0.8,
        detail: 'link from docs/index.md',
      },
    });
  });
});