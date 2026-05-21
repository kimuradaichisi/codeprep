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
    expect(res.confidence).toBeGreaterThan(0);
    expect(res.reasons).toContain('recent file fallback');
  });
});
