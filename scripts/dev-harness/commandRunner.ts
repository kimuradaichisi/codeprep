import { spawnSync, type SpawnSyncOptions } from 'node:child_process';

export interface CommandExecResult {
  readonly success: boolean;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
}

export function runShellCommand(command: string, args: readonly string[], cwd = process.cwd()): CommandExecResult {
  const start = Date.now();
  const options: SpawnSyncOptions = {
    cwd,
    encoding: 'utf-8',
    shell: true,
    maxBuffer: 50 * 1024 * 1024,
  };

  const child = spawnSync(command, args, options);
  const durationMs = Date.now() - start;
  const exitCode = child.status ?? 1;

  return {
    success: exitCode === 0,
    exitCode,
    stdout: (child.stdout ?? '').toString(),
    stderr: (child.stderr ?? '').toString(),
    durationMs,
  };
}

export function outputHarnessResult(data: unknown, format: 'text' | 'json', textRenderer: () => void): void {
  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(data)}\n`);
    return;
  }
  textRenderer();
}
