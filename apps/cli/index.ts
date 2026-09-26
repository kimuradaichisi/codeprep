#!/usr/bin/env node
/*
 * Copyright 2026 CodePrep Contributors
 */
import { dispatchCli } from './dispatcher';

async function main(): Promise<void> {
  await dispatchCli(process.argv.slice(2));
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[codeprep-cli:error] ${message}\n`);
  process.exit(process.exitCode ?? 1);
});
