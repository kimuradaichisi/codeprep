import { PatchCandidateParser } from '../domain/PatchCandidateParser';
import { PatchTargetResolver } from '../domain/PatchTargetResolver';
import { PatchDiffBuilder } from '../domain/PatchDiffBuilder';
import { PatchConfidenceScorer } from '../domain/PatchConfidenceScorer';
import { PatchCandidate } from '../domain/PatchCandidate';
import { PatchConfidence } from '../domain/PatchConfidence';

export interface FileSystemLike {
    readFile(path: string): Promise<string>;
}

export interface SmartPatchPlan {
    targetPath?: string;
    original: string;
    patched: string;
    diff: string;
    confidence: PatchConfidence;
}

export class SmartPatchUseCase {
    private parser = new PatchCandidateParser();
    private resolver = new PatchTargetResolver();
    private diffBuilder = new PatchDiffBuilder();
    private scorer = new PatchConfidenceScorer();

    constructor(private fs: FileSystemLike, private workspaceFiles: string[], private recentFiles: string[] = []) { }

    public async planFromText(text: string): Promise<SmartPatchPlan[]> {
        const candidates = this.parser.parse(text);
        const plans: SmartPatchPlan[] = [];

        for (const c of candidates) {
            const resolved = this.resolver.resolve(c, this.workspaceFiles, this.recentFiles);
            const target = resolved.targetPath;
            let original = '';
            if (target) {
                try { original = await this.fs.readFile(target); } catch { original = ''; }
            }
            const patched = c.content;
            const diff = this.diffBuilder.buildUnifiedDiff(target || '<unknown>', original, patched);
            const baseScore = resolved.confidence + (target ? 10 : 0);
            const confidence = this.scorer.score(baseScore, resolved.reasons);
            plans.push({ targetPath: target, original, patched, diff, confidence });
        }

        return plans;
    }
}
