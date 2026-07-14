import { describe, expect, it } from 'vitest';
import { toAnalyzeInput, toBuildInput } from './DesktopRequestParser';

describe('DesktopRequestParser', () => {
  describe('toAnalyzeInput', () => {
    it('accepts valid request with contextLines', () => {
      const valid = { query: 'auth', projectIds: ['p1'], contextLines: 3 };
      expect(toAnalyzeInput(valid)).toEqual(valid);
    });

    it('rejects invalid contextLines values', () => {
      const cases = [
        { query: 'auth', projectIds: ['p1'], contextLines: -1 },
        { query: 'auth', projectIds: ['p1'], contextLines: 51 },
        { query: 'auth', projectIds: ['p1'], contextLines: 1.5 },
        { query: 'auth', projectIds: ['p1'], contextLines: '3' },
        { query: 'auth', projectIds: ['p1'] }
      ];
      cases.forEach(c => {
        expect(() => toAnalyzeInput(c)).toThrow();
      });
    });
  });

  describe('toBuildInput', () => {
    it('accepts valid candidates with excerpts', () => {
      const valid = {
        candidates: [
          {
            projectId: 'p1',
            relativePath: 'src/app.ts',
            reasons: ['rgMatch'],
            excluded: false,
            excerpts: [{ startLine: 1, endLine: 2, content: 'line\n' }]
          }
        ],
        format: 'markdown',
        maxFileSizeKB: 500,
        packMode: 'matchedSnippets',
        tokenLimit: 12000
      };
      expect(toBuildInput(valid)).toEqual(valid);
    });

    it('rejects candidates with malformed excerpts', () => {
      const invalid = {
        candidates: [
          {
            projectId: 'p1',
            relativePath: 'src/app.ts',
            reasons: ['rgMatch'],
            excluded: false,
            excerpts: [{ startLine: '1', endLine: 2, content: 'line\n' }]
          }
        ],
        format: 'markdown',
        maxFileSizeKB: 500,
        packMode: 'matchedSnippets'
      };
      expect(() => toBuildInput(invalid)).toThrow();
    });
  });
});
