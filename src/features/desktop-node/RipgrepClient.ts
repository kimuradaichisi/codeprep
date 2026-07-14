import { spawn } from 'child_process';
import type {
  AnalysisWarning,
  RipgrepPort,
  RipgrepResult,
} from '../desktop-core/application/ports';
import type { Project } from '../desktop-core/domain/Project';
import { parseRipgrepJson } from './RipgrepJsonParser';

export type ProcessOutput = Readonly<{
  stdout: string;
  stderr: string;
  exitCode: number;
}>;

export type ProcessRunner = Readonly<{
  run(command: string, args: readonly string[], cwd: string): Promise<ProcessOutput>;
}>;

export const nodeProcessRunner: ProcessRunner = { run: runProcess };

export class RipgrepClient implements RipgrepPort {
  public constructor(
    private readonly runner: ProcessRunner = nodeProcessRunner,
    private readonly excludes: readonly string[] = [],
  ) {}

  public async search(project: Project, query: string, contextLines: number): Promise<RipgrepResult> {
    try {
      const excludes = [...this.excludes, ...(project.excludePatterns ?? [])];
      const output = await this.runner.run('rg', rgArgs(query, contextLines, excludes), project.rootPath);
      return toRipgrepResult(project, output);
    } catch (error) {
      const warning = isMissingRgError(error) ? missingRgWarning(project) : rgFailureWarning(project);
      return { matches: [], warning };
    }
  }
}

const rgArgs = (
  query: string,
  contextLines: number,
  excludes: readonly string[],
): readonly string[] => [
  '--json',
  '--context',
  String(contextLines),
  '--hidden',
  ...excludes.flatMap(exclude => ['--glob', `!${exclude}`]),
  '--',
  query,
];

const toRipgrepResult = (project: Project, output: ProcessOutput): RipgrepResult => {
  if (output.exitCode <= 1) return { matches: parseRipgrepJson(output.stdout) };
  return { matches: [], warning: rgFailureWarning(project) };
};


const missingRgWarning = (project: Project): AnalysisWarning => ({
  kind: 'missingRg',
  projectId: project.id,
  message: 'Ripgrep is not available.',
});

const rgFailureWarning = (project: Project): AnalysisWarning => ({
  kind: 'rgFailure',
  projectId: project.id,
  message: 'Ripgrep search could not be completed.',
});

function runProcess(
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<ProcessOutput> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], { cwd, shell: false });
    const chunks = collectProcessChunks(child, resolve);
    child.stdout.on('data', chunks.stdout);
    child.stderr.on('data', chunks.stderr);
    child.on('error', reject);
  });
}

const collectProcessChunks = (
  child: ReturnType<typeof spawn>,
  resolve: (output: ProcessOutput) => void,
) => {
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.on('close', code => {
    resolve({ stdout: join(stdout), stderr: join(stderr), exitCode: code ?? 1 });
  });
  return { stdout: pushChunk(stdout), stderr: pushChunk(stderr) };
};

const pushChunk = (chunks: Buffer[]) => (chunk: Buffer) => chunks.push(chunk);

const join = (chunks: readonly Buffer[]): string => Buffer.concat(chunks).toString('utf8');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isMissingRgError = (error: unknown): boolean =>
  isRecord(error) && error.code === 'ENOENT';



