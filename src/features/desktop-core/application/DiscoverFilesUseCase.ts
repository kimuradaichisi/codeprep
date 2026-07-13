import { createCandidateFile, type CandidateReason } from '../domain/CandidateFile';
import type { Project } from '../domain/Project';
import type { SearchRecipe } from '../domain/SearchRecipe';
import type {
  AnalysisWarning,
  AnalyzedCandidate,
  DiscoverFilesInput,
  DiscoverFilesPorts,
  AnalyzeProjectsResult,
} from './ports';

export class DiscoverFilesUseCase {
  constructor(private readonly ports: DiscoverFilesPorts) {}

  async discover(input: DiscoverFilesInput): Promise<AnalyzeProjectsResult> {
    const projects = await this.ports.projects.getByIds(input.projectIds);
    return this.resolve(input.recipe, projects);
  }

  private async resolve(recipe: SearchRecipe, projects: readonly Project[]): Promise<AnalyzeProjectsResult> {
    if (recipe.kind === 'clipboardPaths') return this.clipboard(projects);
    if (recipe.kind === 'gitDiff') return this.gitDiff(projects);
    if (recipe.kind === 'gitCommit') return this.gitCommit(recipe.ref, projects);
    return this.projectFiles(recipe, projects);
  }

  private async projectFiles(recipe: Exclude<SearchRecipe, { kind: 'clipboardPaths' | 'gitDiff' | 'gitCommit' }>, projects: readonly Project[]): Promise<AnalyzeProjectsResult> {
    const paths = await Promise.all(projects.map(project => this.eligible(project, recipe)));
    return { candidates: sortCandidates(paths.flat()), warnings: [] };
  }

  private async eligible(project: Project, recipe: Exclude<SearchRecipe, { kind: 'clipboardPaths' | 'gitDiff' | 'gitCommit' }>): Promise<readonly AnalyzedCandidate[]> {
    const files = await this.ports.files.list(project);
    return files.filter(path => matches(recipe, path)).map(path => candidate(project.id, path, reason(recipe)));
  }

  private async clipboard(projects: readonly Project[]): Promise<AnalyzeProjectsResult> {
    const paths = (await this.ports.clipboard.readText()).split(/\r?\n/).filter(Boolean);
    const candidates = paths.flatMap(path => projectPath(path, projects));
    return { candidates, warnings: outsideWarnings(paths, candidates, projects) };
  }

  private async gitDiff(projects: readonly Project[]): Promise<AnalyzeProjectsResult> {
    const results = await Promise.all(projects.map(project => this.ports.gitMetadata.getMetadata(project)));
    return { candidates: results.flatMap((result, index) => result.modifiedPaths.map(path => candidate(projects[index].id, path, 'gitModified'))), warnings: results.flatMap(result => result.warning ? [result.warning] : []) };
  }

  private async gitCommit(ref: string, projects: readonly Project[]): Promise<AnalyzeProjectsResult> {
    const results = await Promise.all(projects.map(project => this.ports.gitHistory.getCommitPaths(project, ref)));
    return { candidates: results.flatMap((result, index) => result.paths.map(path => candidate(projects[index].id, path, 'gitCommit'))), warnings: results.flatMap(result => result.warning ? [result.warning] : []) };
  }
}

const matches = (recipe: Exclude<SearchRecipe, { kind: 'clipboardPaths' | 'gitDiff' | 'gitCommit' }>, path: string): boolean =>
  recipe.kind === 'text' ? path.toLowerCase().includes(recipe.query.toLowerCase()) : recipe.kind === 'extension' ? recipe.extensions.some(extension => path.endsWith(extension)) : path.startsWith(`${recipe.path.replace(/\\/g, '/').replace(/\/$/, '')}/`);

const reason = (recipe: Exclude<SearchRecipe, { kind: 'clipboardPaths' | 'gitDiff' | 'gitCommit' }>): CandidateReason =>
  recipe.kind === 'extension' ? 'extensionMatch' : recipe.kind === 'directory' ? 'directoryMatch' : 'rgMatch';

const candidate = (projectId: string, relativePath: string, candidateReason: CandidateReason): AnalyzedCandidate =>
  ({ ...createCandidateFile(projectId, relativePath, [candidateReason]), score: 0 });

const projectPath = (path: string, projects: readonly Project[]): readonly AnalyzedCandidate[] => {
  const source = normalize(path);
  const project = projects.find(item => source.startsWith(`${normalize(item.rootPath)}/`));
  return project ? [candidate(project.id, source.slice(normalize(project.rootPath).length + 1), 'clipboardPath')] : [];
};

const outsideWarnings = (paths: readonly string[], candidates: readonly AnalyzedCandidate[], projects: readonly Project[]): readonly AnalysisWarning[] =>
  paths.length === candidates.length ? [] : [{ kind: 'outsideProject', projectId: projects[0]?.id ?? 'workspace', message: 'Clipboard paths outside registered projects were excluded.' }];

const normalize = (path: string): string => path.trim().replace(/\\/g, '/').replace(/\/$/, '');

const sortCandidates = (candidates: readonly AnalyzedCandidate[]): readonly AnalyzedCandidate[] =>
  [...candidates].sort((left, right) => left.relativePath.localeCompare(right.relativePath));
