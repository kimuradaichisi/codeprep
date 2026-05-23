export interface PatchCodeBlock {
    readonly info: string;
    readonly content: string;
    readonly before: string;
    readonly after: string;
    readonly start: number;
    readonly end: number;
}
