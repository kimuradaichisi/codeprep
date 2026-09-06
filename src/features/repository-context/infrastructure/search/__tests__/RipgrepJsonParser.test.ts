import { describe, expect, it } from 'vitest';
import { parseRipgrepJson } from '../RipgrepJsonParser';

describe('parseRipgrepJson', () => {
  it('should parse match and context events, merging overlapping excerpts', () => {
    const output = [
      JSON.stringify({
        type: 'match',
        data: {
          path: { text: 'src/app.ts' },
          line_number: 3,
          lines: { text: 'three\n' }
        }
      }),
      JSON.stringify({
        type: 'context',
        data: {
          path: { text: 'src/app.ts' },
          line_number: 2,
          lines: { text: 'two\n' }
        }
      }),
      JSON.stringify({
        type: 'context',
        data: {
          path: { text: 'src/app.ts' },
          line_number: 4,
          lines: { text: 'four\n' }
        }
      }),
      JSON.stringify({
        type: 'match',
        data: {
          path: { text: 'src/index.ts' },
          line_number: 10,
          lines: { text: 'const main = () => {};\n' }
        }
      }),
      'invalid json',
      JSON.stringify({ type: 'other' })
    ].join('\n');

    const result = parseRipgrepJson(output);

    expect(result).toEqual([
      {
        relativePath: 'src/app.ts',
        excerpts: [
          { startLine: 2, endLine: 4, content: 'two\nthree\nfour\n' }
        ]
      },
      {
        relativePath: 'src/index.ts',
        excerpts: [
          { startLine: 10, endLine: 10, content: 'const main = () => {};\n' }
        ]
      }
    ]);
  });
});
