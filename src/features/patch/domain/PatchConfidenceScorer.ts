import { PatchConfidence } from './PatchConfidence';

export class PatchConfidenceScorer {
    score(baseScore: number, reasons: string[], warnings: string[] = []): PatchConfidence {
        let score = Math.max(0, Math.min(100, Math.round(baseScore)));
        const level = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low';
        return { score, level, reasons, warnings };
    }
}
