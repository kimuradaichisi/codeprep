/*
 * Copyright 2026 CodePrep Contributors
 */
import * as path from 'path';
import { createCliContainer } from '../composition';
import { isKnowledgeDbAvailable, createPrepareContextPackV2UseCase } from '../../../src/features/repository-context/infrastructure/workingset/createPrepareContextPackV2UseCase';
import { writeCliResult, logCliProgress } from '../io/cliOutput';

export interface KnowledgeStatusArgs {
  readonly workspace?: string;
  readonly format?: string;
  readonly output?: string;
  readonly quiet?: boolean;
}

export interface CliKnowledgeStatusResult {
  readonly schemaVersion: 1;
  readonly workspace: string;
  readonly databaseAvailable: boolean;
  readonly nodeCount: number;
  readonly relationCount: number;
  readonly latestSnapshot?: string;
}

export async function runKnowledgeStatusCommand(
  args: KnowledgeStatusArgs,
  containerFactory = createCliContainer
): Promise<CliKnowledgeStatusResult> {
  const ws = args.workspace ? path.resolve(args.workspace) : process.cwd();
  logCliProgress(`Checking knowledge status in: ${ws}`, args.quiet);
  const container = containerFactory(ws);
  if (!isKnowledgeDbAvailable(ws)) {
    const emptyResult: CliKnowledgeStatusResult = {
      schemaVersion: 1, workspace: ws, databaseAvailable: false, nodeCount: 0, relationCount: 0,
    };
    outputKnowledgeStatus(emptyResult, args);
    return emptyResult;
  }
  const result = await fetchExistingKnowledgeStats(container, ws);
  outputKnowledgeStatus(result, args);
  return result;
}

async function fetchExistingKnowledgeStats(
  container: ReturnType<typeof createCliContainer>,
  ws: string
): Promise<CliKnowledgeStatusResult> {
  const { store } = createPrepareContextPackV2UseCase(container);
  try {
    const stats = await store.getStatistics('latest');
    const latest = await store.findLatest(container.project.name);
    return {
      schemaVersion: 1, workspace: ws, databaseAvailable: true,
      nodeCount: stats.nodeCount, relationCount: stats.edgeCount,
      latestSnapshot: latest?.snapshotId,
    };
  } finally {
    await store.close();
  }
}

function outputKnowledgeStatus(result: CliKnowledgeStatusResult, args: KnowledgeStatusArgs): void {
  const isText = args.format === 'text';
  const text = isText ? renderTextKnowledge(result) : JSON.stringify(result, null, 2);
  writeCliResult(text, { output: args.output, quiet: args.quiet });
}

function renderTextKnowledge(res: CliKnowledgeStatusResult): string {
  return [
    'Knowledge Graph Store Status:',
    `  Workspace:          ${res.workspace}`,
    `  Database Available: ${res.databaseAvailable ? 'yes' : 'no'}`,
    `  Node Count:         ${res.nodeCount}`,
    `  Relation Count:     ${res.relationCount}`,
    `  Latest Snapshot:    ${res.latestSnapshot ?? 'none'}`,
  ].join('\n');
}
