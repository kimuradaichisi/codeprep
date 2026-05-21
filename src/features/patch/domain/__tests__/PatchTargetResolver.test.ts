import { describe, it, expect } from 'vitest';
import { PatchTargetResolver } from '../PatchTargetResolver';
import { PatchCandidate } from '../PatchCandidate';

describe('PatchTargetResolver', () => {
    it('prefers recent files ordering when no path hint provided', () => {
        const resolver = new PatchTargetResolver();
        const candidate: PatchCandidate = { format: 'unified', content: '', context: '' } as any;
        const workspaceFiles = ['/repo/src/a.ts', '/repo/src/b.ts'];
        const recentFiles = ['/repo/src/b.ts', '/repo/src/a.ts'];

        const res = resolver.resolve(candidate, workspaceFiles, recentFiles);
        expect(res.targetPath).toBe('/repo/src/b.ts');
        expect(res.confidence).toBeGreaterThan(10);
        expect(res.reasons).toContain('recent file fallback');
    });

    it('gives higher confidence when pathHint matches exactly and is recent', () => {
        const resolver = new PatchTargetResolver();
        const candidate: PatchCandidate = { format: 'unified', content: '', context: '', pathHint: '/repo/src/a.ts' } as any;
        const workspaceFiles = ['/repo/src/a.ts', '/repo/src/b.ts'];
        const recentFiles = ['/repo/src/a.ts', '/repo/src/b.ts'];

        const res = resolver.resolve(candidate, workspaceFiles, recentFiles);
        expect(res.targetPath).toBe('/repo/src/a.ts');
        expect(res.confidence).toBeGreaterThan(80);
        expect(res.reasons).toContain('path exact match');
        expect(res.reasons).toContain('recentness bonus');
    });
});
