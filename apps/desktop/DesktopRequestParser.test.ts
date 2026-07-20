import { describe, expect, it } from 'vitest';
import { toAnalyzeInput, toBuildInput, toDiscoverInput } from './DesktopRequestParser';

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
        tokenLimit: 50000,
        includeDependencies: false,
        autoOptimize: false
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

  describe('toDiscoverInput', () => {
    it('uses enabled recommendation defaults when settings are absent', () => {
      const result = toDiscoverInput({ projectIds: ['p1'], recipe: { kind: 'gitDiff' } });
      expect(result.recommendationSettings).toEqual({
        markdownLink: true, nameHeading: true, gitCoChange: true, directoryProximity: true,
      });
    });

    it('rejects malformed recommendation settings', () => {
      expect(() => toDiscoverInput({
        projectIds: ['p1'], recipe: { kind: 'gitDiff' },
        recommendationSettings: { markdownLink: 'yes' },
      })).toThrow();
    });
  });
});
