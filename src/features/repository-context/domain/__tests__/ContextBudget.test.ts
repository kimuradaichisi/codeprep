import { describe, expect, it } from 'vitest';

import { evaluateBudget } from '../ContextBudget';

describe('evaluateBudget', () => {
  it('estimates one token for every four bytes', () => {
    expect(evaluateBudget(400, 100)).toEqual({
      bytes: 400,
      estimatedTokens: 100,
      limit: 100,
      withinLimit: true,
    });
  });

  it('marks values above the limit as over budget', () => {
    expect(evaluateBudget(404, 100).withinLimit).toBe(false);
  });
});
