export type PatchFormat =
    | 'codeprep'
    | 'unifiedDiff'
    | 'pathCodeBlock'
    | 'markdownCodeBlock'
    | 'chatGptMixed'
    | 'plainCode'
    | 'unknown';

export const ALL_FORMATS: PatchFormat[] = ['codeprep', 'unifiedDiff', 'pathCodeBlock', 'markdownCodeBlock', 'chatGptMixed', 'plainCode', 'unknown'];
