import type { CandidateFile } from '../domain/CandidateFile';
import { evaluateBudget } from '../domain/ContextBudget';
import type { PackMode } from '../domain/PackMode';
import type { Project } from '../domain/Project';
import type {
  AnalysisWarning,
  BuildDesktopContextInput,
  BuildDesktopContextPorts,
  BuildDesktopContextResult,
  DesktopContextFile,
} from './ports';

type ReadAttempt = Readonly<{
  file?: DesktopContextFile;
  warning?: AnalysisWarning;
}>;

export class BuildDesktopContextUseCase {
  constructor(private readonly ports: BuildDesktopContextPorts) {}

  async build(input: BuildDesktopContextInput): Promise<BuildDesktopContextResult> {
    const projects = await this.ports.projects.getByIds(projectIds(input.candidates));
    const mode = input.packMode ?? 'full';
    const attempts = mode === 'directoryTree' ? [] : await Promise.all(input.candidates.map(candidate =>
      this.readCandidate(candidate, projects, input.maxFileSizeKB, mode)));
    const files = attempts.flatMap(attempt => attempt.file ? [attempt.file] : []);
    const warnings = attempts.flatMap(attempt => attempt.warning ? [attempt.warning] : []);
    const preview = mode === 'directoryTree' ? input.candidates.map(candidate => candidate.relativePath).join('\n') : this.ports.formatter.format({ format: input.format, files });
    const budget = evaluateBudget(new TextEncoder().encode(preview).byteLength, input.tokenLimit ?? Number.MAX_SAFE_INTEGER);
    const manifest = input.candidates.map(candidate => ({ projectId: candidate.projectId, relativePath: candidate.relativePath, included: files.some(file => file.relativePath === candidate.relativePath), reasons: candidate.reasons }));
    if (!budget.withinLimit) return { preview: '', warnings: [...warnings, budgetWarning()], budget, manifest };
    return { preview, warnings, budget, manifest };
  }

  private async readCandidate(
    candidate: CandidateFile,
    projects: readonly Project[],
    maxFileSizeKB: number,
    mode: PackMode,
  ): Promise<ReadAttempt> {
    const project = projects.find(item => item.id === candidate.projectId);
    if (!project) return { warning: unreadableWarning(candidate) };
    const content = await this.ports.fileContent.read(project, candidate.relativePath);
    if (content === undefined) return { warning: unreadableWarning(candidate) };
    if (isOversized(content, maxFileSizeKB)) return { warning: oversizedWarning(candidate) };
    return { file: { relativePath: candidate.relativePath, content: mode === 'skeleton' ? skeleton(content) : content } };
  }
}

const projectIds = (candidates: readonly CandidateFile[]): readonly string[] =>
  [...new Set(candidates.map(candidate => candidate.projectId))];

const isOversized = (content: string, maxFileSizeKB: number): boolean =>
  new TextEncoder().encode(content).byteLength > maxFileSizeKB * 1024;

const unreadableWarning = (candidate: CandidateFile): AnalysisWarning => ({
  kind: 'unreadableFile', projectId: candidate.projectId,
  relativePath: candidate.relativePath, message: `${candidate.relativePath} cannot be read.`,
});

const oversizedWarning = (candidate: CandidateFile): AnalysisWarning => ({
  kind: 'oversizedFile', projectId: candidate.projectId,
  relativePath: candidate.relativePath, message: `${candidate.relativePath} exceeds the output size limit.`,
});

const skeleton = (content: string): string => content.split(/\r?\n/).filter(line => /\b(class|interface|type|function|export|const|def)\b/.test(line)).join('\n');

const budgetWarning = (): AnalysisWarning => ({ kind: 'oversizedFile', projectId: 'workspace', message: 'The generated context exceeds the token budget.' });
