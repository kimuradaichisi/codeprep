import { describe, it, expect } from 'vitest';
import { PatchCandidateParser } from '../PatchCandidateParser';

describe('PatchCandidateParser', () => {
    const parser = new PatchCandidateParser();

    it('returns empty for empty input', () => {
        expect(parser.parse('')).toEqual([]);
    });

    it('extracts path + code block', () => {
        const text = "src/commands/GitCommands.ts\n\n```ts\nexport class GitCommands {}\n```";
        const res = parser.parse(text);
        expect(res.length).toBe(1);
        expect(res[0].pathHint).toBe('src/commands/GitCommands.ts');
        expect(res[0].language).toBe('typescript');
    });

    it('parses fenced info path', () => {
        const text = "```ts src/features/git/infrastructure/GitCliClient.ts\nexport class GitCliClient {}\n```";
        const res = parser.parse(text);
        expect(res.length).toBe(1);
        expect(res[0].pathHint).toBe('src/features/git/infrastructure/GitCliClient.ts');
    });

    it('parses plain code into candidate', () => {
        const text = "export class GitCliClient implements IGitClient {}";
        const res = parser.parse(text);
        expect(res.length).toBe(1);
        expect(res[0].source).toBe('plainCode');
    });

    it('parses unified diff into candidate', () => {
        const diff = "--- a/src/foo.ts\n+++ b/src/foo.ts\n@@ -1 +1 @@\n-old\n+new\n";
        const res = parser.parse(diff);
        expect(res.length).toBeGreaterThan(0);
        expect(res[0].format).toBe('unified');
    });
});

