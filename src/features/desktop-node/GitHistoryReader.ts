import type { AnalysisWarning, GitHistoryPort } from '../desktop-core/application/ports';
import type { Project } from '../desktop-core/domain/Project';
import { nodeProcessRunner, type ProcessRunner } from './RipgrepClient';

export class GitHistoryReader implements GitHistoryPort {
  public constructor(private readonly runner: ProcessRunner = nodeProcessRunner) {}

  public async getCommitPaths(project: Project, ref: string) {
    try {
      const output = await this.runner.run('git', ['show', '--format=', '--name-only', ref], project.rootPath);
      if (output.exitCode !== 0) throw new Error(output.stderr);
      return { paths: parseCommitPaths(output.stdout) };
    } catch {
      return { paths: [], warning: gitFailureWarning(project) };
    }
  }
}

export const parseCommitPaths = (output: string): readonly string[] =>
  [...new Set(output.split(/\r?\n/).map(path => path.trim()).filter(Boolean))];

const gitFailureWarning = (project: Project): AnalysisWarning => ({
  kind: 'gitFailure', projectId: project.id, message: 'Git commit paths could not be read.',
});
