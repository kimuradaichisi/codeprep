import type { CandidateFile } from '../domain/CandidateFile';
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
    includeDependencies?: boolean
  ): Promise<DesktopOutputSelection> {
    if (mode === 'matchedSnippets') {
      return buildMatchedSnippets(candidates);
    }

    const resolved = candidates.map(c => ({ candidate: c, forcedMode: undefined as PackMode | undefined }));

    if (includeDependencies) {
      const visited = new Set<string>(candidates.map(c => c.relativePath));
      const queue: Array<[CandidateFile, number]> = candidates.map(c => [c, 0]);

      while (queue.length > 0) {
        const [curr, depth] = queue.shift()!;
        if (depth >= 2) continue;

        const project = projects.find(p => p.id === curr.projectId);
        if (!project) continue;

        const content = await this.fileContent.read(project, curr.relativePath);
        if (content === undefined) continue;

        const deps = await this.dependencyScanner.findDependencies(curr.relativePath, content, project.rootPath);
        for (const depPath of deps) {
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
      }
    }

    const attempts = await Promise.all(
      resolved.map(item => this.readCandidate(item.candidate, projects, maxFileSizeKB, mode, item.forcedMode))
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
    forcedMode?: PackMode
  ): Promise<Readonly<{ file?: DesktopContextFile; warning?: AnalysisWarning }>> {
    const project = projects.find(item => item.id === candidate.projectId);
    if (!project) return { warning: unreadableWarning(candidate) };
    const content = await this.fileContent.read(project, candidate.relativePath);
    if (content === undefined) return { warning: unreadableWarning(candidate) };
    if (isOversized(content, maxFileSizeKB)) return { warning: oversizedWarning(candidate) };
    const currentMode = forcedMode || mode;
    return {
      file: {
        relativePath: candidate.relativePath,
        content: currentMode === 'skeleton' ? this.skeletonService.extract(content) : content
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

