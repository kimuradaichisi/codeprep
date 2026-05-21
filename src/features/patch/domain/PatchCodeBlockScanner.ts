import { PatchCodeBlock } from './PatchCodeBlock';

export class PatchCodeBlockScanner {
    public scan(text: string): PatchCodeBlock[] {
        const blocks: PatchCodeBlock[] = [];
        const fence = /```([^\n]*)\n([\s\S]*?)\n```/g;
        let m: RegExpExecArray | null;
        while ((m = fence.exec(text)) !== null) {
            const info = m[1].trim();
            const content = m[2];
            const start = m.index;
            const end = fence.lastIndex;
            const before = text.slice(Math.max(0, start - 200), start);
            const after = text.slice(end, Math.min(text.length, end + 200));
            blocks.push({ info, content, before, after, start, end });
        }
        return blocks;
    }
}
