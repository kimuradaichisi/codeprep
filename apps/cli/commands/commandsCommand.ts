/*
 * Copyright 2026 CodePrep Contributors
 */
import { CANONICAL_COMMAND_CATALOG } from '../catalog/commandCatalog';
import type { CommandCatalogDto } from '../catalog/cliSpec';
import { writeCliResult } from '../io/cliOutput';

export interface CommandsCommandArgs {
  readonly format?: string;
  readonly json?: boolean;
}

export function runCommandsCommand(args: CommandsCommandArgs): void {
  const isJson = args.json || args.format === 'json';
  if (isJson) {
    const catalog: CommandCatalogDto = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      commands: CANONICAL_COMMAND_CATALOG,
    };
    writeCliResult(JSON.stringify(catalog, null, 2));
    return;
  }
  writeCliResult(renderCommandsTable());
}

function renderCommandsTable(): string {
  const lines: string[] = [
    'Available CodePrep Commands:',
    '--------------------------------------------------------------------------------',
  ];
  for (const cmd of CANONICAL_COMMAND_CATALOG) {
    const cmdStr = `codeprep ${cmd.name}`.padEnd(28, ' ');
    lines.push(`  ${cmdStr} [${cmd.category}] ${cmd.summary}`);
  }
  lines.push(
    '--------------------------------------------------------------------------------',
    'Tip: Run "codeprep <command> --help" for details or "codeprep commands --json" for structured discovery.'
  );
  return lines.join('\n');
}
