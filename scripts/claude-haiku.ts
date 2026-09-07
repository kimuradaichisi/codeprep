// scripts/claude-haiku.ts
import { spawn, type ChildProcess } from 'child_process';

export const DEFAULT_HAIKU_MODEL = 'claude-haiku-4-5-20251001';

export function resolveHaikuModel(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): string {
  return env.CODEPREP_CLAUDE_HAIKU_MODEL || DEFAULT_HAIKU_MODEL;
}

export function buildClaudeArgs(
  userArgs: readonly string[] = [],
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): string[] {
  const model = resolveHaikuModel(env);
  return ['--model', model, ...userArgs];
}

export function runClaudeHaiku(
  args: readonly string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env
): ChildProcess {
  const fullArgs = buildClaudeArgs(args, env);
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'claude.cmd' : 'claude';

  const child = spawn(cmd, fullArgs, {
    stdio: 'inherit',
    shell: isWin,
    env,
  });

  child.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'ENOENT') {
      console.error('\n[Error] "claude" CLI was not found in your PATH.');
      console.error('Please install Claude Code CLI (e.g. `npm install -g @anthropic-ai/claude-code`) or ensure it is in your system PATH.\n');
    } else {
      console.error('[Error] Failed to launch Claude Code:', err.message);
    }
    process.exit(1);
  });

  child.on('close', (code: number | null) => {
    process.exit(code ?? 0);
  });

  return child;
}

if (process.argv[1] && (process.argv[1].endsWith('claude-haiku.ts') || process.argv[1].endsWith('claude-haiku.mjs'))) {
  runClaudeHaiku();
}
