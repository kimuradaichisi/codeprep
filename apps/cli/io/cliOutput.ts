/*
 * Copyright 2026 CodePrep Contributors
 */
import * as fs from 'fs';

export interface CliOutputOptions {
  readonly format?: string;
  readonly output?: string;
  readonly quiet?: boolean;
}

export function writeCliResult(content: string, options?: CliOutputOptions): void {
  if (options?.output) {
    fs.writeFileSync(options.output, content, 'utf-8');
    if (!options.quiet) {
      process.stderr.write(`[codeprep-cli] Output written to ${options.output}\n`);
    }
  } else {
    process.stdout.write(content + '\n');
  }
}

export function logCliProgress(message: string, quiet?: boolean): void {
  if (quiet) return;
  process.stderr.write(`[codeprep-cli] ${message}\n`);
}

export function logCliError(message: string): void {
  process.stderr.write(`[codeprep-cli:error] ${message}\n`);
}
