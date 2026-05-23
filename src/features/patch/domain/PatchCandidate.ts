export type PatchFormat = 'unified' | 'plain' | 'unknown';

export type PatchCandidateSource = 'fencedCodeBlock' | 'unifiedDiff' | 'plainCode' | 'chatGptMixed';

export interface PatchCandidate {
    readonly format: PatchFormat;
    readonly pathHint?: string;
    readonly language?: string;
    readonly content: string;
    readonly context: string;
    readonly source: PatchCandidateSource;
    readonly startLineHint?: number;
}

export interface ResolvedPatch {
    readonly candidate: PatchCandidate;
    readonly targetPath?: string;
    readonly confidence: number;
    readonly reasons: string[];
}
