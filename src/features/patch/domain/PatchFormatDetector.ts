import { PatchFormat } from './PatchFormat';

export class PatchFormatDetector {
    detect(text: string): PatchFormat {
        if (!text || text.trim().length === 0) return 'unknown';

        const hasDiffHeader = /(^---\s+a\/|^\+\+\+\s+b\/|^@@ )/m.test(text);
        if (hasDiffHeader) return 'unifiedDiff';

        // CodePrep marker
        if (/CodePrep/.test(text) && /```/.test(text)) return 'codeprep';

        // path + code block: a line that looks like a path followed by a code fence
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < Math.min(6, lines.length); i++) {
            const l = lines[i].trim();
            if (/^([\w\-\/\.]+\.(ts|js|tsx|jsx|json|md))$/.test(l) && /```/.test(text)) return 'pathCodeBlock';
        }

        // markdown code block
        if (/```[a-zA-Z0-9]*\n[\s\S]*\n```/.test(text)) return 'markdownCodeBlock';

        // chatGPT mixed heuristics
        if (/^###?\s+/.test(text) || /以下のファイル|修正してください/.test(text)) return 'chatGptMixed';

        // plain code
        if (/\b(import|export|function|class|const|let)\b/.test(text)) return 'plainCode';

        return 'unknown';
    }
}
