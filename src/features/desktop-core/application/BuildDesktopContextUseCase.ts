import type { CandidateFile } from '../domain/CandidateFile';
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
    const attempts = await Promise.all(input.candidates.map(candidate =>
      this.readCandidate(candidate, projects, input.maxFileSizeKB)));
    const files = attempts.flatMap(attempt => attempt.file ? [attempt.file] : []);
    const warnings = attempts.flatMap(attempt => attempt.warning ? [attempt.warning] : []);
    return { preview: this.ports.formatter.format({ format: input.format, files }), warnings };
  }

  private async readCandidate(
    candidate: CandidateFile,
    projects: readonly Project[],
    maxFileSizeKB: number,
  ): Promise<ReadAttempt> {
    const project = projects.find(item => item.id === candidate.projectId);
    if (!project) return { warning: unreadableWarning(candidate) };
    const content = await this.ports.fileContent.read(project, candidate.relativePath);
    if (content === undefined) return { warning: unreadableWarning(candidate) };
    if (isOversized(content, maxFileSizeKB)) return { warning: oversizedWarning(candidate) };
    return { file: { relativePath: candidate.relativePath, content } };
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
