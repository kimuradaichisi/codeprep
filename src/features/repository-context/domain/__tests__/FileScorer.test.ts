import { expect, it } from 'vitest';

import type { CandidateReason } from '../CandidateFile';
import { scoreCandidate } from '../FileScorer';

it('scores rg and git signals higher than path-only matches', () => {
  const scored = scoreCandidate({
    reasons: ['rgMatch', 'gitModified', 'pathAffinity'],
    manualPin: false,
  });

  expect(scored.score).toBe(80);
});

it.each([
  ['rgMatch', 35],
  ['gitModified', 30],
  ['recentCommit', 20],
  ['pathAffinity', 15],
  ['fileTypeBoost', 10],
  ['excluded', -1000],
] satisfies ReadonlyArray<readonly [CandidateReason, number]>)(
  'scores %s with its expected weight',
  (reason, expectedScore) => {
    const scored = scoreCandidate({ reasons: [reason], manualPin: false });

    expect(scored.score).toBe(expectedScore);
  },
);

it('treats rgMatch as the ripgrep discovery signal', () => {
  const scored = scoreCandidate({ reasons: ['rgMatch'], manualPin: false });

  expect(scored.reasons).toEqual(['rgMatch']);
  expect(scored.score).toBe(35);
});

it('adds manual pin as the strongest positive score signal', () => {
  const scored = scoreCandidate({
    reasons: ['pathAffinity'],
    manualPin: true,
  });

  expect(scored.score).toBe(115);
  expect(scored.reasons).toEqual(['pathAffinity', 'manualPin']);
});

it('ignores manualPin input reason when manualPin flag is false', () => {
  const scored = scoreCandidate({
    reasons: ['pathAffinity', 'manualPin'],
    manualPin: false,
  });

  expect(scored.score).toBe(15);
  expect(scored.reasons).toEqual(['pathAffinity']);
});

it('applies excluded as the strongest negative score signal', () => {
  const scored = scoreCandidate({
    reasons: ['rgMatch', 'excluded'],
    manualPin: true,
  });

  expect(scored.score).toBe(-865);
});

it('keeps returned reasons unchanged when input reasons mutate', () => {
  const reasons: CandidateReason[] = ['rgMatch'];
  const scored = scoreCandidate({ reasons, manualPin: true });

  reasons.push('excluded');

  expect(scored.reasons).toEqual(['rgMatch', 'manualPin']);
});