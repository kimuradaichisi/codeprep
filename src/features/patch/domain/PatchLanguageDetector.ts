export class PatchLanguageDetector {
    public detect(info: string, pathHint: string | undefined, content: string): string | undefined {
        const fromInfo = this.fromInfo(info);
        if (fromInfo) return fromInfo;
        const fromPath = this.fromPath(pathHint);
        if (fromPath) return fromPath;
        return this.fromContent(content);
    }

    private fromInfo(info?: string): string | undefined {
        if (!info) return undefined;
        const token = info.split(/\s+/)[0].toLowerCase();
        return this.mapToken(token);
    }

    private fromPath(path?: string): string | undefined {
        if (!path) return undefined;
        const ext = path.split('.').pop();
        if (!ext) return undefined;
        return this.mapToken(ext.toLowerCase());
    }

    private fromContent(content: string): string | undefined {
        if (/^\s*\{/m.test(content) && /"\w+"\s*:/m.test(content)) return 'json';
        if (/class\s+\w+/m.test(content) || /export\s+class/m.test(content)) return 'typescript';
        if (/function\s+\w+/m.test(content) || /console\.log\(/m.test(content)) return 'javascript';
        return undefined;
    }

    private mapToken(tok: string): string | undefined {
        const map: Record<string, string> = {
            ts: 'typescript',
            typescript: 'typescript',
            js: 'javascript',
            javascript: 'javascript',
            json: 'json',
            md: 'markdown',
            html: 'html'
        };
        return map[tok];
    }
}
