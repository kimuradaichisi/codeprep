import { describe, expect, it } from 'vitest';
import { mergeSourceLines, type SourceLine } from '../SourceExcerpt';

describe('mergeSourceLines', () => {
  it('should sort, remove duplicate lines, merge adjacent ranges, and keep input immutable', () => {
    const input: readonly SourceLine[] = [
      { lineNumber: 4, content: 'd\n' },
      { lineNumber: 3, content: 'c\n' },
      { lineNumber: 4, content: 'd\n' },
      { lineNumber: 10, content: 'j\n' },
      { lineNumber: 9, content: 'i\n' },
    ];
    const originalInput = JSON.stringify(input);

    const result = mergeSourceLines(input);

    expect(result).toEqual([
      { startLine: 3, endLine: 4, content: 'c\nd\n' },
      { startLine: 9, endLine: 10, content: 'i\nj\n' },
    ]);
    expect(JSON.stringify(input)).toBe(originalInput);
  });
});
