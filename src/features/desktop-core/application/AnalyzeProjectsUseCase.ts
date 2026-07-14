import type { Project } from '../domain/Project';
import type {
  AnalysisWarning,
  AnalyzeProjectsInput,
  AnalyzeProjectsPorts,
  AnalyzeProjectsResult,
} from './ports';
import {
  buildResult,
  mergeProjectAnalysis,
  type CandidateSignal,
  type ProjectAnalysis,
} from './AnalysisResultBuilder';

type ReadCheck = Readonly<{
  signal?: CandidateSignal;
  warning?: AnalysisWarning;
}>;

export class AnalyzeProjectsUseCase {
  constructor(private readonly ports: AnalyzeProjectsPorts) {}

  async analyze(input: AnalyzeProjectsInput): Promise<AnalyzeProjectsResult> {
    const projects = await this.ports.projects.getByIds(input.projectIds);
    const analyses = await Promise.all(
      projects.map(project => this.analyzeProject(project, input.query, input.contextLines)),
    );

    return buildResult(analyses);
  }

  private async analyzeProject(
    project: Project,
    query: string,
    contextLines: number,
  ): Promise<ProjectAnalysis> {
    if (!isValidRoot(project)) {
      return { signals: [], warnings: [invalidRootWarning(project)] };
    }

    const [ripgrep, git] = await Promise.all([
      this.ports.ripgrep.search(project, query, contextLines),
      this.ports.gitMetadata.getMetadata(project),
    ]);
    const analysis = mergeProjectAnalysis(project, ripgrep, git);

    return this.filterReadable(analysis);
  }


  private async filterReadable(
    analysis: ProjectAnalysis,
  ): Promise<ProjectAnalysis> {
    const checks = await Promise.all(
      analysis.signals.map(signal => this.checkReadable(signal)),
    );

    return mergeReadChecks(analysis.warnings, checks);
  }

  private async checkReadable(signal: CandidateSignal): Promise<ReadCheck> {
    const readable = await this.ports.fileContent.canRead(
      signal.project,
      signal.relativePath,
    );

    return readable ? { signal } : { warning: unreadableWarning(signal) };
  }
}

const mergeReadChecks = (
  warnings: readonly AnalysisWarning[],
  checks: readonly ReadCheck[],
): ProjectAnalysis => ({
  signals: checks.flatMap(check => (check.signal ? [check.signal] : [])),
  warnings: [
    ...warnings,
    ...checks.flatMap(check => (check.warning ? [check.warning] : [])),
  ],
});

const isValidRoot = (project: Project): boolean =>
  project.rootPath.trim().length > 0;

const invalidRootWarning = (project: Project): AnalysisWarning => ({
  kind: 'invalidRoot',
  projectId: project.id,
  message: `Project ${project.name} has an invalid root.`,
});

const unreadableWarning = (signal: CandidateSignal): AnalysisWarning => ({
  kind: 'unreadableFile',
  projectId: signal.project.id,
  relativePath: signal.relativePath,
  message: `${signal.relativePath} cannot be read.`,
});