export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface PatchConfidence {
    readonly score: number;
    readonly level: ConfidenceLevel;
    readonly reasons: string[];
    readonly warnings: string[];
}
