import { PatchCandidate, ResolvedPatch } from './PatchCandidate';

export class PatchTargetResolver {
    resolve(candidate: PatchCandidate, workspaceFiles: string[], recentFiles: string[] = []): ResolvedPatch {
        const reasons: string[] = [];
        let confidence = 0;
        let targetPath: string | undefined;

        if (candidate.pathHint) {
            const exact = workspaceFiles.find(f => f === candidate.pathHint);
            if (exact) {
                targetPath = exact;
                confidence += 80;
                reasons.push('path exact match');
            } else {
                const suffix = workspaceFiles.find(f => f.endsWith(candidate.pathHint!));
                if (suffix) {
                    targetPath = suffix;
                    confidence += 60;
                    reasons.push('path suffix match');
                }
            }
        }

        // If path hint matched but the matched file appears in recentFiles, give a small boost
        if (targetPath && recentFiles.length > 0) {
            const idx = recentFiles.findIndex(r => r === targetPath);
            if (idx >= 0) {
                const bonus = Math.max(20 - idx * 2, 5);
                confidence += bonus;
                reasons.push('recentness bonus');
            }
        }

        // When no path hint resolved, prefer recentFiles by ordering (recentFiles[0] is best)
        if (!targetPath && recentFiles.length > 0) {
            targetPath = recentFiles[0];
            const idx = 0;
            const bonus = Math.max(40 - idx * 3, 5);
            confidence += bonus;
            reasons.push('recent file fallback');
        }

        if (!targetPath && workspaceFiles.length === 1) {
            targetPath = workspaceFiles[0];
            confidence += 10;
            reasons.push('single workspace file fallback');
        }

        if (!targetPath) reasons.push('no target inferred');

        // cap confidence to 100 for presentation
        if (confidence > 100) confidence = 100;

        return { candidate, targetPath, confidence, reasons };
    }
}
