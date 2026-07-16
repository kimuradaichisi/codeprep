import { createCandidateFile, type CandidateReason } from '../domain/CandidateFile';
import type { Project } from '../domain/Project';
import type { SearchRecipe } from '../domain/SearchRecipe';
import type {
  AnalysisWarning,
  AnalyzedCandidate,
  DiscoverFilesInput,
  DiscoverFilesPorts,
  AnalyzeProjectsResult,
  DocGraphRelation,
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
    if (recipe.kind === 'docGraph') return this.docGraph(recipe, projects);
    return this.projectFiles(recipe, projects);
  }

  private async projectFiles(recipe: Exclude<SearchRecipe, { kind: 'clipboardPaths' | 'gitDiff' | 'gitCommit' | 'docGraph' }>, projects: readonly Project[]): Promise<AnalyzeProjectsResult> {
    const paths = await Promise.all(projects.map(project => this.eligible(project, recipe)));
    return { candidates: sortCandidates(paths.flat()), warnings: [] };
  }

  private async eligible(project: Project, recipe: Exclude<SearchRecipe, { kind: 'clipboardPaths' | 'gitDiff' | 'gitCommit' | 'docGraph' }>): Promise<readonly AnalyzedCandidate[]> {
    const files = await this.ports.files.list(project);
    const matched = files.filter(f => matches(recipe, f.relativePath));
    return matched.map(f => ({ ...createCandidateFile(project.id, f.relativePath, [reason(recipe)], undefined, f.size), score: 0 }));
  }

  private async clipboard(projects: readonly Project[]): Promise<AnalyzeProjectsResult> {
    const text = await this.ports.clipboard.readText();
    const paths = this.extractPaths(text);
    const candidates: AnalyzedCandidate[] = [];
    const unmatched: string[] = [];
    for (const path of paths) {
      const resolved = await this.resolvePath(path, projects);
      if (resolved) candidates.push(resolved);
      else unmatched.push(path);
    }
    return { candidates, warnings: unmatched.length > 0 ? [this.outsideWarning(projects[0], unmatched)] : [] };
  }

  private outsideWarning(project: Project | undefined, unmatched: readonly string[]): AnalysisWarning {
    return { kind: 'outsideProject', projectId: project?.id ?? 'workspace', message: `Unresolved: ${unmatched.join(', ')}` };
  }

  private async resolvePath(path: string, projects: readonly Project[]): Promise<AnalyzedCandidate | undefined> {
    for (const project of projects) {
      const projectFiles = await this.ports.files.list(project);
      const resolvedRelPath = this.matchFile(path, projectFiles);
      if (resolvedRelPath) {
        const fileInfo = projectFiles.find(f => f.relativePath === resolvedRelPath);
        return { ...createCandidateFile(project.id, resolvedRelPath, ['clipboardPath'], undefined, fileInfo?.size), score: 0 };
      }
    }
    return undefined;
  }

  private extractPaths(text: string): readonly string[] {
    const regex = /(([a-zA-Z]:\\|(?:\.\/|\/))?[a-z0-9_./\\-]+\.[a-z0-9]+)/gi;
    const matches = text.match(regex) || [];
    const paths = new Set<string>();
    for (const match of matches) {
      const cleaned = match.replace(/^['"`]+|['"`]+$/g, '').replace(/:\d+(:\d+)?$/, '').replace(/\\/g, '/').trim();
      if (cleaned && cleaned.includes('.')) paths.add(cleaned);
    }
    return Array.from(paths);
  }

  private matchFile(clipPath: string, files: readonly Readonly<{ relativePath: string; size: number }>[]): string | undefined {
    const normalized = clipPath.toLowerCase().replace(/^\/+/, '');
    const exact = files.find(f => f.relativePath.toLowerCase() === normalized);
    if (exact) return exact.relativePath;

    const suffix = files.filter(f => f.relativePath.toLowerCase().endsWith(normalized) || normalized.endsWith(f.relativePath.toLowerCase()));
    if (suffix.length === 1) return suffix[0].relativePath;

    const segments = normalized.split('/');
    if (segments.length >= 2) return this.bestSegmentMatch(segments, files);
    return undefined;
  }

  private bestSegmentMatch(segments: readonly string[], files: readonly Readonly<{ relativePath: string; size: number }>[]): string | undefined {
    let best: string | undefined;
    let max = 0;
    for (const f of files) {
      const matchCount = this.countMatchingSegments(segments, f.relativePath.toLowerCase().split('/'));
      if (matchCount >= 2 && matchCount > max) {
        max = matchCount;
        best = f.relativePath;
      } else if (matchCount >= 2 && matchCount === max) {
        best = undefined;
      }
    }
    return best;
  }

  private countMatchingSegments(clip: readonly string[], rel: readonly string[]): number {
    let count = 0;
    const min = Math.min(clip.length, rel.length);
    for (let i = 1; i <= min; i++) {
      if (clip[clip.length - i] === rel[rel.length - i]) count++;
      else break;
    }
    return count;
  }

  private async gitDiff(projects: readonly Project[]): Promise<AnalyzeProjectsResult> {
    const results = await Promise.all(projects.map(project => this.ports.gitMetadata.getMetadata(project)));
    const flat = results.flatMap((result, index) => result.modifiedPaths.map(path => ({ project: projects[index], path })));
    const candidates = await Promise.all(flat.map(async item => {
      const size = await this.ports.fileSize.getSize(item.project, item.path);
      return { ...candidate(item.project.id, item.path, 'gitModified'), size };
    }));
    const withDeps = await this.appendDependencies(candidates, projects);
    return { candidates: withDeps, warnings: results.flatMap(result => result.warning ? [result.warning] : []) };
  }

  private async gitCommit(ref: string, projects: readonly Project[]): Promise<AnalyzeProjectsResult> {
    const results = await Promise.all(projects.map(project => this.ports.gitHistory.getCommitPaths(project, ref)));
    const flat = results.flatMap((result, index) => result.paths.map(path => ({ project: projects[index], path })));
    const candidates = await Promise.all(flat.map(async item => {
      const size = await this.ports.fileSize.getSize(item.project, item.path);
      return { ...candidate(item.project.id, item.path, 'gitCommit'), size };
    }));
    const withDeps = await this.appendDependencies(candidates, projects);
    return { candidates: withDeps, warnings: results.flatMap(result => result.warning ? [result.warning] : []) };
  }

  private async appendDependencies(candidates: readonly AnalyzedCandidate[], projects: readonly Project[]): Promise<readonly AnalyzedCandidate[]> {
    const list = [...candidates];
    const visited = new Set<string>(candidates.map(c => c.relativePath));

    for (const c of candidates) {
      const project = projects.find(p => p.id === c.projectId);
      if (!project) continue;
      const content = await this.ports.fileContent.read(project, c.relativePath);
      if (!content) continue;

      const projectFiles = await this.ports.files.list(project);
      const deps = await this.ports.dependencyScanner.findDependencies(c.relativePath, content, project.rootPath);
      for (const dep of deps) {
        const resolved = await this.resolveWithExtensions(projectFiles, dep);
        if (resolved && !visited.has(resolved.relativePath)) {
          visited.add(resolved.relativePath);
          list.push({ ...createCandidateFile(project.id, resolved.relativePath, ['dependency'], undefined, resolved.size), score: 0 });
        }
      }
    }
    return list;
  }

  private async resolveWithExtensions(
    projectFiles: readonly Readonly<{ relativePath: string; size: number }>[],
    depPath: string
  ): Promise<Readonly<{ relativePath: string; size: number }> | undefined> {
    const target = depPath.toLowerCase();
    const exts = ['.ts', '.tsx', '.js', '.jsx', '.d.ts'];
    for (const ext of exts) {
      const match = projectFiles.find(f => f.relativePath.toLowerCase() === `${target}${ext}` || f.relativePath.toLowerCase() === `${target}/index${ext}`);
      if (match) return match;
    }
    return undefined;
  }

  private async docGraph(
    recipe: Extract<SearchRecipe, { kind: 'docGraph' }>,
    projects: readonly Project[]
  ): Promise<AnalyzeProjectsResult> {
    const candidates: AnalyzedCandidate[] = [];
    for (const project of projects) {
      const relations = await this.ports.docGraph.findRelated(project, recipe.path);
      const projectFiles = await this.ports.files.list(project);
      this.collectDocGraphCandidates(project, relations, projectFiles, candidates);
    }
    return { candidates: sortCandidates(candidates), warnings: [] };
  }

  private collectDocGraphCandidates(
    project: Project,
    relations: readonly DocGraphRelation[],
    projectFiles: readonly Readonly<{ relativePath: string; size: number }>[],
    candidates: AnalyzedCandidate[]
  ): void {
    for (const rel of relations) {
      const fileInfo = projectFiles.find(f => f.relativePath === rel.path);
      if (fileInfo) {
        candidates.push({
          ...createCandidateFile(project.id, rel.path, ['docgraph'], undefined, fileInfo.size),
          score: rel.confidence
        });
      }
    }
  }
}

const matches = (recipe: Exclude<SearchRecipe, { kind: 'clipboardPaths' | 'gitDiff' | 'gitCommit' }>, path: string): boolean =>
  recipe.kind === 'text' ? path.toLowerCase().includes(recipe.query.toLowerCase()) : recipe.kind === 'extension' ? recipe.extensions.some(extension => path.endsWith(extension)) : path.startsWith(`${recipe.path.replace(/\\/g, '/').replace(/\/$/, '')}/`);

const reason = (recipe: Exclude<SearchRecipe, { kind: 'clipboardPaths' | 'gitDiff' | 'gitCommit' }>): CandidateReason =>
  recipe.kind === 'extension' ? 'extensionMatch' : recipe.kind === 'directory' ? 'directoryMatch' : 'rgMatch';

const candidate = (projectId: string, relativePath: string, candidateReason: CandidateReason): AnalyzedCandidate =>
  ({ ...createCandidateFile(projectId, relativePath, [candidateReason]), score: 0 });

const normalize = (path: string): string => path.trim().replace(/\\/g, '/').replace(/\/$/, '');

const sortCandidates = (candidates: readonly AnalyzedCandidate[]): readonly AnalyzedCandidate[] =>
  [...candidates].sort((left, right) => left.relativePath.localeCompare(right.relativePath));
