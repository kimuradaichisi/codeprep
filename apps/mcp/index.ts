// apps/mcp/index.ts
import { runServer } from './server';
import { stderrError } from './logger';

function parseWorkspaceArg(args: readonly string[]): string {
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--workspace' || args[i] === '-w') && i + 1 < args.length) {
      return args[i + 1];
    }
    if (args[i].startsWith('--workspace=')) {
      return args[i].slice('--workspace='.length);
    }
  }
  return process.cwd();
}

async function main(): Promise<void> {
  const workspace = parseWorkspaceArg(process.argv.slice(2));
  await runServer(workspace);
}

main().catch((err) => {
  stderrError('Fatal error in MCP CLI', err);
  process.exit(1);
});
