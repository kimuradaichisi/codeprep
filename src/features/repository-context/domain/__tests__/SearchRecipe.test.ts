import { describe, expect, it } from 'vitest';

import { createSearchRecipe } from '../SearchRecipe';

describe('createSearchRecipe', () => {
  it('normalizes comma-separated extensions', () => {
    expect(createSearchRecipe('extension', '.ts, tsx')).toEqual({
      kind: 'extension',
      extensions: ['.ts', '.tsx'],
    });
  });

  it('rejects an empty extension recipe', () => {
    expect(() => createSearchRecipe('extension', ' , ')).toThrow('Extension is required.');
  });
});
