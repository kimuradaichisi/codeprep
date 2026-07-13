import { PatchCodeBlock } from './PatchCodeBlock';

const PATH_LIKE = /(?:\b|\W)([\w./\\-]+\.[a-zA-Z0-9_-]+)(?:\b|\W)/;
const PREFIXES = /^(?:File|Path|ファイル|対象)[:\s]+/i;

export class PatchPathHintExtractor {
    public extract(block: PatchCodeBlock): string | undefined {
        const info = block.info || '';
        const fromInfo = this.fromFenceInfo(info);
        if (fromInfo) return fromInfo;

        const before = block.before || '';
        const after = block.after || '';

        const fromNearby = this.fromNearbyText(before) || this.fromNearbyText(after);
        return fromNearby;
    }

    private fromFenceInfo(info: string): string | undefined {
        if (!info) return undefined;
        // fence info like: "ts path/to/file.ts" or "path/to/file.ts"
        const parts = info.split(/\s+/).map(p => p.trim()).filter(Boolean);
        for (const p of parts) {
            const n = this.normalizePathHint(p);
            if (n) return n;
        }
        return undefined;
    }

    private fromNearbyText(text: string): string | undefined {
        if (!text) return undefined;
        const lines = text.split(/\r?\n/).slice(-3);
        for (const l of lines.reverse()) {
            const trimmed = l.trim().replace(/^\s*[`"]|[`"]\s*$/g, '');
            const cleaned = trimmed.replace(PREFIXES, '');
            const n = this.normalizePathHint(cleaned);
            if (n) return n;
        }
        return undefined;
    }

    private normalizePathHint(v: string): string | undefined {
        if (!v) return undefined;
        if (/^https?:\/\//i.test(v)) return undefined;
        // remove surrounding ticks or quotes
        let s = v.replace(/^`|`$/g, '').replace(/^"|"$/g, '');
        // remove a/ or b/ prefixes from diffs
        s = s.replace(/^[ab]\//, '');
        // strip ./
        s = s.replace(/^\.\//, '');
        if (s.includes('node_modules') || s.includes('dist') || s.match(/^[A-Z]:\\/)) return undefined;
        const m = s.match(PATH_LIKE);
        return m ? m[1].replace(/^\.\//, '') : undefined;
    }
}
