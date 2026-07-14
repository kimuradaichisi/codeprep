import type { CandidateFile } from '../domain/CandidateFile';
import { evaluateBudget } from '../domain/ContextBudget';
import type { PackMode } from '../domain/PackMode';
import type { Project } from '../domain/Project';
import { DesktopOutputBuilder, type DesktopOutputSelection } from './DesktopOutputBuilder';
import { SkeletonService } from '../../engine/domain/SkeletonService';
import { DependencyScanner } from '../../engine/application/DependencyScanner';
import type {
  AnalysisWarning,
  BuildDesktopContextInput,
  BuildDesktopContextPorts,
  BuildDesktopContextResult,
  DesktopContextFile,
} from './ports';

export class BuildDesktopContextUseCase {
  constructor(private readonly ports: BuildDesktopContextPorts) {}

  async build(input: BuildDesktopContextInput): Promise<BuildDesktopContextResult> {
    const projects = await this.ports.projects.getByIds(projectIds(input.candidates));
    const mode = input.packMode ?? 'full';
    const output = await getOutput(input, projects, this.ports.fileContent, mode);
    const preview = getPreview(input, output.files, this.ports.formatter, mode);
    const budget = evaluateBudget(new TextEncoder().encode(preview).byteLength, input.tokenLimit ?? Number.MAX_SAFE_INTEGER);
    const manifest = input.candidates.map(c => ({
      projectId: c.projectId,
      relativePath: c.relativePath,
      included: output.files.some(f => f.relativePath === c.relativePath || f.relativePath.startsWith(`${c.relativePath}:`)),
      reasons: c.reasons
    }));
    if (!budget.withinLimit) return { preview: '', warnings: [...output.warnings, budgetWarning()], budget, manifest };
    return { preview, warnings: output.warnings, budget, manifest };
  }
}

const getOutput = async (
  input: BuildDesktopContextInput,
  projects: readonly Project[],
  fileContent: BuildDesktopContextPorts['fileContent'],
  mode: PackMode
): Promise<DesktopOutputSelection> => {
  if (mode === 'directoryTree') return { files: [], warnings: [] };
  const builder = new DesktopOutputBuilder(fileContent, new SkeletonService(), new DependencyScanner());
  return builder.build(input.candidates, projects, input.maxFileSizeKB, mode, input.includeDependencies, input.tokenLimit, input.autoOptimize);
};

const getPreview = (
  input: BuildDesktopContextInput,
  files: readonly DesktopContextFile[],
  formatter: BuildDesktopContextPorts['formatter'],
  mode: PackMode
): string =>
  mode === 'directoryTree'
    ? input.candidates.map(c => c.relativePath).join('\n')
    : formatter.format({ format: input.format, files });

const projectIds = (candidates: readonly CandidateFile[]): readonly string[] =>
  [...new Set(candidates.map(candidate => candidate.projectId))];

const budgetWarning = (): AnalysisWarning => ({
  kind: 'oversizedFile',
  projectId: 'workspace',
  message: 'The generated context exceeds the token budget.'
});

