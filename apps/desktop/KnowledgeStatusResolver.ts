// apps/desktop/KnowledgeStatusResolver.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import * as path from 'node:path';
import {
  isKnowledgeDbAvailable,
  resolveKnowledgeDbPath,
} from '../../src/features/repository-context/infrastructure/workingset/createPrepareContextPackV2UseCase';
import { SqliteRepositoryKnowledgeStore } from '../../src/features/repository-context/infrastructure/knowledge/sqlite/SqliteRepositoryKnowledgeStore';
import { GitCliRevisionAdapter } from '../../src/features/repository-context/infrastructure/git/GitCliRevisionAdapter';

export type KnowledgeDbStatus =
  | 'ready'
  | 'missing'
  | 'stale'
  | 'dirty'
  | 'refresh_required';

export interface KnowledgeStatusResult {
  readonly status: KnowledgeDbStatus;
  readonly message: string;
  readonly nodeCount: number;
  readonly commitHash?: string;
}

export type KnowledgeStoreReader = Pick<SqliteRepositoryKnowledgeStore, 'getStatistics' | 'findLatest' | 'close'>;
export type KnowledgeGitReader = Pick<GitCliRevisionAdapter, 'currentRevision' | 'isWorkingTreeClean'>;

export interface KnowledgeStatusDependencies {
  readonly createStore?: (workspaceRoot: string, dbPath: string) => KnowledgeStoreReader;
  readonly createGit?: () => KnowledgeGitReader;
}

export async function resolveKnowledgeStatus(
  workspaceRoot: string,
  deps: KnowledgeStatusDependencies = {}
): Promise<KnowledgeStatusResult> {
  if (!isKnowledgeDbAvailable(workspaceRoot)) {
    return {
      status: 'missing',
      message: 'Knowledge index is missing. Build knowledge graph or run sync.',
      nodeCount: 0,
    };
  }

  return inspectKnowledgeDatabase(workspaceRoot, deps);
}

async function inspectKnowledgeDatabase(
  workspaceRoot: string,
  deps: KnowledgeStatusDependencies
): Promise<KnowledgeStatusResult> {
  const dbPath = resolveKnowledgeDbPath(workspaceRoot);
  const store: KnowledgeStoreReader = deps.createStore
    ? deps.createStore(workspaceRoot, dbPath)
    : new SqliteRepositoryKnowledgeStore({ workspaceRoot, dbPath });
  const git: KnowledgeGitReader = deps.createGit ? deps.createGit() : new GitCliRevisionAdapter();

  try {
    const stats = await store.getStatistics('latest');
    if (stats.nodeCount === 0) {
      return {
        status: 'missing',
        message: 'Knowledge database exists but contains no snapshot nodes. Refresh required.',
        nodeCount: 0,
      };
    }
    return await evaluateGitSync(workspaceRoot, store, git, stats.nodeCount);
  } finally {
    await store.close();
  }
}

async function evaluateGitSync(
  workspaceRoot: string,
  store: KnowledgeStoreReader,
  git: KnowledgeGitReader,
  nodeCount: number
): Promise<KnowledgeStatusResult> {
  const currentRevision = (await git.currentRevision(workspaceRoot)) ?? undefined;
  const isClean = await git.isWorkingTreeClean(workspaceRoot);
  const repoName = path.basename(workspaceRoot);
  const snapshot = (await store.findLatest(repoName)) ?? (await store.findLatest('codeprep-repo'));
  const snapCommit = snapshot?.revision;
  return buildSyncResult(currentRevision, snapCommit, isClean, nodeCount);
}

function buildSyncResult(
  currentRevision: string | undefined,
  snapCommit: string | undefined,
  isClean: boolean,
  nodeCount: number
): KnowledgeStatusResult {
  if (snapCommit && currentRevision && snapCommit !== currentRevision) {
    return {
      status: 'stale',
      message: `Knowledge snapshot is stale (HEAD: ${currentRevision.slice(0, 7)} vs DB: ${snapCommit.slice(0, 7)}). Refresh required.`,
      nodeCount, commitHash: snapCommit,
    };
  }
  if (!isClean) {
    return {
      status: 'dirty',
      message: 'Working tree has uncommitted modifications. Refresh recommended for latest accuracy.',
      nodeCount, commitHash: snapCommit,
    };
  }
  return {
    status: 'ready',
    message: 'Knowledge database is ready and in sync with repository HEAD.',
    nodeCount, commitHash: snapCommit,
  };
}
