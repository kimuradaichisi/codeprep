export class PatchDiffBuilder {
    buildUnifiedDiff(targetPath: string, original: string, patched: string): string {
        const a = original.split(/\r?\n/);
        const b = patched.split(/\r?\n/);
        const lines: string[] = [];
        lines.push(`--- a/${targetPath}`);
        lines.push(`+++ b/${targetPath}`);
        lines.push('@@');

        const max = Math.max(a.length, b.length);
        for (let i = 0; i < max; i++) {
            const oa = a[i] ?? '';
            const ob = b[i] ?? '';
            if (oa === ob) {
                lines.push(` ${oa}`);
            } else {
                if (oa !== '') lines.push(`- ${oa}`);
                if (ob !== '') lines.push(`+ ${ob}`);
            }
        }
        return lines.join('\n');
    }
}
