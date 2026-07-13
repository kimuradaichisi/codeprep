import { describe, expect, it } from 'vitest';
import { DesktopContextFormatter } from '../DesktopContextFormatter';

describe('DesktopContextFormatter', () => {
  it.each([
    ['markdown', '## File: src/app.ts'],
    ['xml', '<file path="src/app.ts">'],
    ['json', 'src/app.ts'],
  ] as const)('formats selected content as %s', (format, expected) => {
    const result = new DesktopContextFormatter().format({
      format,
      files: [{ relativePath: 'src/app.ts', content: 'export const value = 1;' }],
    });

    expect(result).toContain(expected);
  });
});
