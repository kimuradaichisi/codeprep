import type { CandidateFile } from '../domain/CandidateFile';
import { scoreCandidate } from '../domain/FileScorer';
import type { PackMode } from '../domain/PackMode';
import type { Project } from '../domain/Project';
import * as path from 'path';
import type { SourceExcerpt } from '../domain/SourceExcerpt';
import type {
  AnalysisWarning,
  DesktopContextFile,
  FileContentPort,
} from './ports';
import type { SkeletonService } from '../../engine/domain/SkeletonService';
import { DependencyScanner } from '../../engine/application/DependencyScanner';

export type DesktopOutputSelection = Readonly<{
  files: readonly DesktopContextFile[];
  warnings: readonly AnalysisWarning[];
}>;

export class DesktopOutputBuilder {
  constructor(
    private readonly fileContent: FileContentPort,
    private readonly skeletonService: SkeletonService,
    private readonly dependencyScanner: DependencyScanner
  ) {}

  async build(
    candidates: readonly CandidateFile[],
    projects: readonly Project[],
    maxFileSizeKB: number,
    mode: PackMode,
    includeDependencies?: boolean,
    tokenLimit?: number,
    autoOptimize?: boolean
  ): Promise<DesktopOutputSelection> {
    if (mode === 'matchedSnippets') {
      return buildMatchedSnippets(candidates);
    }

    const resolved = await this.resolveDependencies(candidates, projects, includeDependencies);
    const readResults = await this.readCandidatesContent(resolved, projects, maxFileSizeKB);
    const sorted = this.scoreAndSortCandidates(readResults, autoOptimize);
    return this.packWithBudget(sorted, mode, tokenLimit, autoOptimize);
  }

  private async resolveDependencies(
    candidates: readonly CandidateFile[],
    projects: readonly Project[],
    includeDependencies?: boolean
  ): Promise<Array<{ candidate: CandidateFile; forcedMode?: PackMode }>> {
    const resolved = candidates.map(c => ({ candidate: c, forcedMode: undefined as PackMode | undefined }));
    if (!includeDependencies) return resolved;
    await this.traverseDependencies(candidates, projects, resolved);
    return resolved;
  }

  private async traverseDependencies(
    candidates: readonly CandidateFile[],
    projects: readonly Project[],
    resolved: Array<{ candidate: CandidateFile; forcedMode?: PackMode }>
  ): Promise<void> {
    const visited = new Set<string>(candidates.map(c => c.relativePath));
    const queue: Array<[CandidateFile, number]> = candidates.map(c => [c, 0]);

    while (queue.length > 0) {
      const [curr, depth] = queue.shift()!;
      if (depth >= 2) continue;
      await this.processDependencyItem(curr, depth, projects, visited, queue, resolved);
    }
  }

  private async processDependencyItem(
    curr: CandidateFile,
    depth: number,
    projects: readonly Project[],
    visited: Set<string>,
    queue: Array<[CandidateFile, number]>,
    resolved: Array<{ candidate: CandidateFile; forcedMode?: PackMode }>
  ): Promise<void> {
    const project = projects.find(p => p.id === curr.projectId);
    if (!project) return;
    const content = await this.fileContent.read(project, curr.relativePath);
    if (content === undefined) return;
    const deps = await this.dependencyScanner.findDependencies(curr.relativePath, content, project.rootPath);
    for (const depPath of deps) {
      await this.addDependencyCandidate(depPath, curr, depth, project, visited, queue, resolved);
    }
  }

  private async addDependencyCandidate(
    depPath: string,
    curr: CandidateFile,
    depth: number,
    project: Project,
    visited: Set<string>,
    queue: Array<[CandidateFile, number]>,
    resolved: Array<{ candidate: CandidateFile; forcedMode?: PackMode }>
  ): Promise<void> {
    const resolvedDepPath = await resolveWithExtensions(this.fileContent, project, depPath);
    if (resolvedDepPath && !visited.has(resolvedDepPath)) {
      visited.add(resolvedDepPath);
      const depCandidate = {
        projectId: curr.projectId,
        relativePath: resolvedDepPath,
        reasons: ['pathAffinity'],
        excluded: false
      } as CandidateFile;
      queue.push([depCandidate, depth + 1]);
      resolved.push({ candidate: depCandidate, forcedMode: 'skeleton' });
    }
  }

  private async readCandidatesContent(
    resolved: Array<{ candidate: CandidateFile; forcedMode?: PackMode }>,
    projects: readonly Project[],
    maxFileSizeKB: number
  ) {
    return Promise.all(
      resolved.map(async item => {
        const project = projects.find(p => p.id === item.candidate.projectId);
        if (!project) return { item, content: undefined, error: 'unreadable' as const };
        const content = await this.fileContent.read(project, item.candidate.relativePath);
        if (content === undefined) return { item, content: undefined, error: 'unreadable' as const };
        if (isOversized(content, maxFileSizeKB)) return { item, content, error: 'oversized' as const };
        return { item, content, error: undefined };
      })
    );
  }

  private scoreAndSortCandidates(
    readResults: Array<{
      item: { candidate: CandidateFile; forcedMode?: PackMode };
      content: string | undefined;
      error: 'unreadable' | 'oversized' | undefined;
    }>,
    autoOptimize?: boolean
  ) {
    const scored = readResults.map(res => {
      const score = scoreCandidate({
        reasons: res.item.candidate.reasons,
        manualPin: res.item.candidate.reasons.includes('manualPin')
      }).score;
      return { ...res, score };
    });
    if (autoOptimize) {
      scored.sort((left, right) => right.score - left.score);
    }
    return scored;
  }

  private packWithBudget(
    scored: Array<ScoredReadResult>,
    mode: PackMode,
    tokenLimit?: number,
    autoOptimize?: boolean
  ): DesktopOutputSelection {
    const files: DesktopContextFile[] = [];
    const warnings: AnalysisWarning[] = [];
    const state = { accumulatedBytes: 0, byteLimit: tokenLimit && autoOptimize ? tokenLimit * 4 : Number.MAX_SAFE_INTEGER };

    for (const res of scored) {
      this.processBudgetCandidate(res, mode, state, files, warnings, autoOptimize);
    }
    return { files, warnings };
  }

  private processBudgetCandidate(
    res: ScoredReadResult,
    mode: PackMode,
    state: { accumulatedBytes: number; byteLimit: number },
    files: DesktopContextFile[],
    warnings: AnalysisWarning[],
    autoOptimize?: boolean
  ): void {
    if (res.error === 'unreadable') {
      warnings.push(unreadableWarning(res.item.candidate));
      return;
    }
    if (res.error === 'oversized') {
      warnings.push(oversizedWarning(res.item.candidate));
      return;
    }
    this.packValidCandidate(res, mode, state, files, warnings, autoOptimize);
  }

  private packValidCandidate(
    res: ScoredReadResult,
    mode: PackMode,
    state: { accumulatedBytes: number; byteLimit: number },
    files: DesktopContextFile[],
    warnings: AnalysisWarning[],
    autoOptimize?: boolean
  ): void {
    const content = res.content!;
    let targetMode = res.item.forcedMode || mode;
    const fullSize = estimateFilePayloadSize(res.item.candidate.relativePath, content);

    if (autoOptimize && targetMode !== 'skeleton' && (state.accumulatedBytes + fullSize) > state.byteLimit) {
      targetMode = 'skeleton';
    }

    if (targetMode === 'skeleton') {
      this.packSkeletonCandidate(res.item.candidate, content, state, files, warnings, autoOptimize);
    } else {
      files.push({ relativePath: res.item.candidate.relativePath, content });
      state.accumulatedBytes += fullSize;
    }
  }

  private packSkeletonCandidate(
    candidate: CandidateFile,
    content: string,
    state: { accumulatedBytes: number; byteLimit: number },
    files: DesktopContextFile[],
    warnings: AnalysisWarning[],
    autoOptimize?: boolean
  ): void {
    const skeletonContent = this.skeletonService.extract(content);
    const skeletonSize = estimateFilePayloadSize(candidate.relativePath, skeletonContent);

    if (autoOptimize && ((state.accumulatedBytes + skeletonSize) > state.byteLimit)) {
      warnings.push(budgetExcludedWarning(candidate));
      return;
    }

    files.push({ relativePath: candidate.relativePath, content: skeletonContent });
    state.accumulatedBytes += skeletonSize;
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

const resolveWithExtensions = async (
  fileContent: FileContentPort,
  project: Project,
  relativePath: string
): Promise<string | undefined> => {
  if (path.extname(relativePath)) {
    if (await fileContent.canRead(project, relativePath)) {
      return relativePath;
    }
    return undefined;
  }
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
  for (const ext of extensions) {
    const candidate = relativePath + ext;
    if (await fileContent.canRead(project, candidate)) {
      return candidate;
    }
  }
  return undefined;
};

type ScoredReadResult = Readonly<{
  item: { candidate: CandidateFile; forcedMode?: PackMode };
  content: string | undefined;
  error: 'unreadable' | 'oversized' | undefined;
  score: number;
}>;

const budgetExcludedWarning = (candidate: CandidateFile): AnalysisWarning => ({
  kind: 'oversizedFile',
  projectId: candidate.projectId,
  relativePath: candidate.relativePath,
  message: `File ${candidate.relativePath} was excluded to fit the token budget.`
});

const estimateFilePayloadSize = (relativePath: string, content: string): number => {
  return new TextEncoder().encode(content).byteLength;
};

