export class ExcludePattern {
    private readonly regex: RegExp;
    private static readonly MAX_REGEX_LENGTH = 500;

    private constructor(pattern: string, isRegex: boolean = false) {
        if (isRegex) {
            this.regex = ExcludePattern.buildSafeRegex(pattern);
        } else {
            this.regex = this.convertToRegex(pattern);
        }
    }

    private static buildSafeRegex(pattern: string): RegExp {
        if (pattern.length > ExcludePattern.MAX_REGEX_LENGTH) return /(?!)/;
        try { return new RegExp(pattern); } catch { return /(?!)/; }
    }

    public static create(pattern: string): ExcludePattern {
        return new ExcludePattern(pattern, false);
    }

    public static createFromRegex(pattern: string): ExcludePattern {
        return new ExcludePattern(pattern, true);
    }

    public match(path: string): boolean {
        // パス区切り文字を / に統一して判定
        const normalized = path.replace(/\\/g, '/');
        return this.regex.test(normalized);
    }

    private convertToRegex(pattern: string): RegExp {
        const escaped = pattern
            .replace(/[.+*^${}()|[\]\\]/g, '\\$&')
            .replace(/\\\*/g, '[^/]*');
        // 前後が文字列の端か、またはスラッシュ（/）である場合にマッチさせる
        return new RegExp(`(?:^|/)${escaped}(?=/|$)`);
    }



}
