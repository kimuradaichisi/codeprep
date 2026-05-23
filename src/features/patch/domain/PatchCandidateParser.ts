import { PatchCandidate, PatchCandidateSource, PatchFormat } from './PatchCandidate';
import { PatchCodeBlockScanner } from './PatchCodeBlockScanner';
import { PatchPathHintExtractor } from './PatchPathHintExtractor';
import { PatchLanguageDetector } from './PatchLanguageDetector';

export class PatchCandidateParser {
    private scanner = new PatchCodeBlockScanner();
    private pather = new PatchPathHintExtractor();
    private lang = new PatchLanguageDetector();

    public parse(text: string): PatchCandidate[] {
        if (!text || text.trim() === '') return [];
        // unified diff detection
        if (this.isUnifiedDiff(text)) return this.parseUnifiedDiff(text);

        const blocks = this.scanner.scan(text);
        const candidates: PatchCandidate[] = [];
        for (const b of blocks) {
            const pathHint = this.pather.extract(b);
            const language = this.lang.detect(b.info, pathHint, b.content);
            candidates.push({
                format: 'plain',
                pathHint: pathHint,
                language: language,
                content: b.content.trim(),
                context: (b.before + '\n' + b.after).trim(),
                source: 'fencedCodeBlock'
            });
        }

        if (candidates.length > 0) return candidates;

        // fallback: plain code or single-line
        const plain = text.trim();
        if (plain.length > 0) {
            return [{ format: 'plain', content: plain, context: '', source: 'plainCode' } as PatchCandidate];
        }
        return [];
    }

    private isUnifiedDiff(text: string): boolean {
        return /(^---\s+a\/|^\+\+\+\s+b\/|^@@\s+-\d+,\d+)/m.test(text);
    }

    private parseUnifiedDiff(text: string): PatchCandidate[] {
        const files: PatchCandidate[] = [];
        const fileHeader = /(^---\s+a\/(?<old>[^\n]+)\n\+\+\+\s+b\/(?<new>[^\n]+))/gm;
        let m: RegExpExecArray | null;
        while ((m = fileHeader.exec(text)) !== null) {
            const fname = (m.groups && (m.groups['new'] || m.groups['old'])) || undefined;
            const start = m.index;
            const next = fileHeader.exec(text);
            const end = next ? next.index : text.length;
            // reset lastIndex to current m end for next loop
            if (next) fileHeader.lastIndex = next.index;
            const chunk = text.slice(start, end);
            const normalized = fname ? fname.replace(/^[ab]\//, '') : undefined;
            files.push({
                format: 'unified',
                pathHint: normalized,
                language: undefined,
                content: chunk.trim(),
                context: '',
                source: 'unifiedDiff'
            });
            if (!next) break;
        }
        if (files.length === 0) {
            // whole-diff as single candidate
            files.push({ format: 'unified', content: text.trim(), context: '', source: 'unifiedDiff' } as PatchCandidate);
        }
        return files;
    }
}

