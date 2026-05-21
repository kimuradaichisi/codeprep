import { PatchCandidate } from './PatchCandidate';
import { PatchFormat } from './PatchFormat';

export class PatchCandidateParser {
    parse(text: string, format: PatchFormat): PatchCandidate[] {
        const res: PatchCandidate[] = [];
        if (!text) return res;

        if (format === 'pathCodeBlock' || format === 'markdownCodeBlock') {
            // naive: capture path line followed by the first code fence
            const re = /^(?<path>[\w\-\/\.]+\.(ts|js|tsx|jsx|json|md))\s*\n(?:```[a-zA-Z0-9]*\n)([\s\S]*?)(?:\n```)/m;
            const m = re.exec(text);
            if (m && (m as any).groups) {
                res.push({
                    format,
                    pathHint: (m as any).groups['path'],
                    language: undefined,
                    content: (m[2] || '').toString(),
                    context: text,
                });
                return res;
            }
        }

        // If unified diff, keep whole as content
        if (format === 'unifiedDiff') {
            res.push({ format, content: text, context: text });
            return res;
        }

        // fallback: single candidate with whole content
        res.push({ format, content: text, context: text });
        return res;
    }
}
