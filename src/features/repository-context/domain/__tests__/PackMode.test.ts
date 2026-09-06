import { describe, expect, it } from 'vitest';

import { isPackMode } from '../PackMode';

describe('isPackMode', () => {
  it('accepts supported pack modes only', () => {
    expect(isPackMode('skeleton')).toBe(true);
    expect(isPackMode('archive')).toBe(false);
  });
});
