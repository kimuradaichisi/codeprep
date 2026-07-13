import type {
  AnalysisWarning,
  GitMetadata,
  GitMetadataPort,
} from '../desktop-core/application/ports';
import type { Project } from '../desktop-core/domain/Project';
import { nodeProcessRunner, type ProcessRunner } from './RipgrepClient';

const RECENT_COMMIT_LIMIT = 100;

export class GitMetadataClient implements GitMetadataPort {
  public constructor(private readonly runner: ProcessRunner = nodeProcessRunner) {}

  public async getMetadata(project: Project): Promise<GitMetadata> {
    try {
      const [status, log] = await Promise.all([
        gitStatus(project, this.runner),
        gitLog(project, this.runner),
      ]);
      return { modifiedPaths: parseGitStatus(status), recentPaths: parseGitLog(log) };
    } catch {
      return { modifiedPaths: [], recentPaths: [], warning: gitFailureWarning(project) };
    }
  }
}

export const parseGitStatus = (output: string): readonly string[] =>
  uniqueLines(output.split(/\r?\n/).map(line => normalizeStatusPath(line.slice(3))));

export const parseGitLog = (output: string): readonly string[] =>
  uniqueLines(output.split(/\r?\n/).map(line => line.trim()));

const gitStatus = async (project: Project, runner: ProcessRunner): Promise<string> => {
  const output = await runner.run('git', ['status', '--porcelain'], project.rootPath);
  if (output.exitCode !== 0) throw new Error(output.stderr);
  return output.stdout;
};

const gitLog = async (project: Project, runner: ProcessRunner): Promise<string> => {
  const output = await runner.run('git', ['log', `--max-count=${RECENT_COMMIT_LIMIT}`, '--name-only', '--format='], project.rootPath);
  if (output.exitCode !== 0) throw new Error(output.stderr);
  return output.stdout;
};

const normalizeStatusPath = (path: string): string => {
  const marker = ' -> ';
  return path.includes(marker) ? path.split(marker).at(-1)?.trim() ?? '' : path.trim();
};

const uniqueLines = (lines: readonly string[]): readonly string[] =>
  [...new Set(lines.filter(Boolean))];

const gitFailureWarning = (project: Project): AnalysisWarning => ({
  kind: 'gitFailure',
  projectId: project.id,
  message: 'Git metadata could not be read.',
});

