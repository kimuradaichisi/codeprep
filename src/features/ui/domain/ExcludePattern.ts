export class ExcludePattern {
    private readonly regex: RegExp;

    private constructor(pattern: string, isRegex: boolean = false) {
        if (isRegex) {
            this.regex = new RegExp(pattern);
        } else {
            this.regex = this.convertToRegex(pattern);
        }
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
