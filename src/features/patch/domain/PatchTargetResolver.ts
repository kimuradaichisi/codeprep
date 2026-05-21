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

        if (!targetPath && recentFiles.length > 0) {
            targetPath = recentFiles[0];
            confidence += 20;
            reasons.push('recent file fallback');
        }

        if (!targetPath && workspaceFiles.length === 1) {
            targetPath = workspaceFiles[0];
            confidence += 10;
            reasons.push('single workspace file fallback');
        }

        if (!targetPath) reasons.push('no target inferred');

        return { candidate, targetPath, confidence, reasons };
    }
}
