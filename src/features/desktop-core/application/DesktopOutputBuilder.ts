import type { CandidateFile } from '../domain/CandidateFile';
import type { PackMode } from '../domain/PackMode';
import type { Project } from '../domain/Project';
import type { SourceExcerpt } from '../domain/SourceExcerpt';
import type {
  AnalysisWarning,
  DesktopContextFile,
  FileContentPort,
} from './ports';

export type DesktopOutputSelection = Readonly<{
  files: readonly DesktopContextFile[];
  warnings: readonly AnalysisWarning[];
}>;

export class DesktopOutputBuilder {
  constructor(private readonly fileContent: FileContentPort) {}

  async build(
    candidates: readonly CandidateFile[],
    projects: readonly Project[],
    maxFileSizeKB: number,
    mode: PackMode,
  ): Promise<DesktopOutputSelection> {
    if (mode === 'matchedSnippets') {
      return buildMatchedSnippets(candidates);
    }
    const attempts = await Promise.all(
      candidates.map(c => this.readCandidate(c, projects, maxFileSizeKB, mode))
    );
    return {
      files: attempts.flatMap(a => a.file ? [a.file] : []),
      warnings: attempts.flatMap(a => a.warning ? [a.warning] : []),
    };
  }

  private async readCandidate(
    candidate: CandidateFile,
    projects: readonly Project[],
    maxFileSizeKB: number,
    mode: PackMode,
  ): Promise<Readonly<{ file?: DesktopContextFile; warning?: AnalysisWarning }>> {
    const project = projects.find(item => item.id === candidate.projectId);
    if (!project) return { warning: unreadableWarning(candidate) };
    const content = await this.fileContent.read(project, candidate.relativePath);
    if (content === undefined) return { warning: unreadableWarning(candidate) };
    if (isOversized(content, maxFileSizeKB)) return { warning: oversizedWarning(candidate) };
    return {
      file: {
        relativePath: candidate.relativePath,
        content: mode === 'skeleton' ? skeleton(content) : content
      }
    };
  }
}

const buildMatchedSnippets = (candidates: readonly CandidateFile[]): DesktopOutputSelection => {
  const files: DesktopContextFile[] = [];
  const warnings: AnalysisWarning[] = [];
  for (const c of candidates) {
    if (!c.excerpts || c.excerpts.length === 0) {
      warnings.push(missingExcerptWarning(c));
    } else {
      c.excerpts.forEach(e => files.push(excerptFile(c.relativePath, e)));
    }
  }
  return { files, warnings };
};

const excerptFile = (path: string, excerpt: SourceExcerpt): DesktopContextFile => ({
  relativePath: `${path}:${excerpt.startLine}-${excerpt.endLine}`,
  content: excerpt.content,
});

const isOversized = (content: string, maxFileSizeKB: number): boolean =>
  new TextEncoder().encode(content).byteLength > maxFileSizeKB * 1024;

const unreadableWarning = (candidate: CandidateFile): AnalysisWarning => ({
  kind: 'unreadableFile',
  projectId: candidate.projectId,
  relativePath: candidate.relativePath,
  message: `${candidate.relativePath} cannot be read.`,
});

const oversizedWarning = (candidate: CandidateFile): AnalysisWarning => ({
  kind: 'oversizedFile',
  projectId: candidate.projectId,
  relativePath: candidate.relativePath,
  message: `${candidate.relativePath} exceeds the output size limit.`,
});

const missingExcerptWarning = (candidate: CandidateFile): AnalysisWarning => ({
  kind: 'missingExcerpt',
  projectId: candidate.projectId,
  relativePath: candidate.relativePath,
  message: `No excerpts available for ${candidate.relativePath}.`,
});

const skeleton = (content: string): string =>
  content.split(/\r?\n/).filter(line => /\b(class|interface|type|function|export|const|def)\b/.test(line)).join('\n');
