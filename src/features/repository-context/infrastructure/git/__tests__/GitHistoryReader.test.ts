import { describe, expect, it } from 'vitest';

import { parseCommitPaths } from '../GitHistoryReader';

describe('parseCommitPaths', () => {
  it('returns unique normalized paths from git output', () => {
    expect(parseCommitPaths('src/a.ts\r\nREADME.md\nsrc/a.ts\n')).toEqual([
      'src/a.ts',
      'README.md',
    ]);
  });
});
