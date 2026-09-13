#!/usr/bin/env node
/*
 * Copyright 2026 CodePrep Contributors
 */
import { parseCliArguments } from './argumentParser';
import { runContextCommand } from './contextCommand';

async function main(): Promise<void> {
  const args = parseCliArguments(process.argv.slice(2));
  await runContextCommand(args);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[codeprep-cli:error] ${message}\n`);
  process.exit(1);
});
