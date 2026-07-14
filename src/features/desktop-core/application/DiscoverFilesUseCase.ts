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
    const matched = files.filter(f => matches(recipe, f.relativePath));
    return matched.map(f => ({ ...createCandidateFile(project.id, f.relativePath, [reason(recipe)], undefined, f.size), score: 0 }));
  }

  private async clipboard(projects: readonly Project[]): Promise<AnalyzeProjectsResult> {
    const paths = (await this.ports.clipboard.readText()).split(/\r?\n/).filter(Boolean);
    const rawCandidates = paths.flatMap(path => projectPath(path, projects));
    const candidates = await Promise.all(rawCandidates.map(async c => {
      const project = projects.find(p => p.id === c.projectId);
      const size = project ? await this.ports.fileSize.getSize(project, c.relativePath) : undefined;
      return { ...c, size };
    }));
    return { candidates, warnings: outsideWarnings(paths, candidates, projects) };
  }

  private async gitDiff(projects: readonly Project[]): Promise<AnalyzeProjectsResult> {
    const results = await Promise.all(projects.map(project => this.ports.gitMetadata.getMetadata(project)));
    const flat = results.flatMap((result, index) => result.modifiedPaths.map(path => ({ project: projects[index], path })));
    const candidates = await Promise.all(flat.map(async item => {
      const size = await this.ports.fileSize.getSize(item.project, item.path);
      return { ...candidate(item.project.id, item.path, 'gitModified'), size };
    }));
    return { candidates, warnings: results.flatMap(result => result.warning ? [result.warning] : []) };
  }

  private async gitCommit(ref: string, projects: readonly Project[]): Promise<AnalyzeProjectsResult> {
    const results = await Promise.all(projects.map(project => this.ports.gitHistory.getCommitPaths(project, ref)));
    const flat = results.flatMap((result, index) => result.paths.map(path => ({ project: projects[index], path })));
    const candidates = await Promise.all(flat.map(async item => {
      const size = await this.ports.fileSize.getSize(item.project, item.path);
      return { ...candidate(item.project.id, item.path, 'gitCommit'), size };
    }));
    return { candidates, warnings: results.flatMap(result => result.warning ? [result.warning] : []) };
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
