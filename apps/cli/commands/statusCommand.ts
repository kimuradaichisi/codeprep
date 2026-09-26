/*
 * Copyright 2026 CodePrep Contributors
 */
import * as path from 'path';
import { createCliContainer } from '../composition';
import { checkMcpStatus } from '../../mcp/statusChecker';
import type { McpWorkspaceStatusResult } from '../../mcp/types';
import { writeCliResult, logCliProgress } from '../io/cliOutput';

export interface StatusCommandArgs {
  readonly workspace?: string;
  readonly format?: string;
  readonly output?: string;
  readonly quiet?: boolean;
}

export interface CliStatusResult extends McpWorkspaceStatusResult {
  readonly schemaVersion: 1;
}

export async function runStatusCommand(
  args: StatusCommandArgs,
  containerFactory = createCliContainer
): Promise<CliStatusResult> {
  const ws = args.workspace ? path.resolve(args.workspace) : process.cwd();
  logCliProgress(`Checking status for workspace: ${ws}`, args.quiet);

  const container = containerFactory(ws);
  const mcpStatus = await checkMcpStatus({
    project: container.project,
    files: container.filesPort,
    knowledgeStore: container.structuredKnowledgeStore,
    semanticStore: container.semanticStore,
    embeddingPort: container.embeddingAdapter,
  });

  const result: CliStatusResult = {
    schemaVersion: 1,
    ...mcpStatus,
  };

  const isText = args.format === 'text';
  const rendered = isText ? renderTextStatus(result) : JSON.stringify(result, null, 2);
  writeCliResult(rendered, { output: args.output, quiet: args.quiet });
  return result;
}

function renderTextStatus(res: CliStatusResult): string {
  const lines: string[] = [
    'CodePrep Workspace Status:',
    `  Root:             ${res.workspaceRoot}`,
    `  Bound:            ${res.workspaceBound ? 'yes' : 'no'}`,
    `  Repository Index: ${res.repositoryIndex}`,
    `  Knowledge Index:  ${res.knowledgeIndex}`,
    `  Semantic Index:   ${res.semanticIndex}`,
  ];
  if (res.diagnostics && res.diagnostics.length > 0) {
    lines.push('  Diagnostics:');
    for (const d of res.diagnostics) {
      lines.push(`    - ${d}`);
    }
  }
  return lines.join('\n');
}
