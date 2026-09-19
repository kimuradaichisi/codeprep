// src/features/repository-context/infrastructure/workingset/createPrepareContextPackV2UseCase.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import * as path from 'path';
import * as fs from 'fs';
import type { RepositoryContextContainer } from '../composition/RepositoryContextContainer';
import { SqliteRepositoryKnowledgeStore } from '../knowledge/sqlite/SqliteRepositoryKnowledgeStore';
import { QueryRelevantSubgraphUseCase } from '../../application/ir/query/QueryRelevantSubgraphUseCase';
import { DefaultSourceExtractor } from './DefaultSourceExtractor';
import { BuildContextPackV2UseCase } from '../../application/workingset/BuildContextPackV2UseCase';
import { PrepareContextPackV2UseCase } from '../../application/workingset/PrepareContextPackV2UseCase';

import { GitCliRevisionAdapter } from '../git/GitCliRevisionAdapter';

export interface CreatePrepareContextPackV2Options {
  readonly dbPath?: string;
  readonly skipDbCheck?: boolean;
}

export function resolveKnowledgeDbPath(workspaceRoot: string, dbPath?: string): string {
  return dbPath ?? path.join(workspaceRoot, '.codeprep', 'repository-knowledge.db');
}

export function isKnowledgeDbAvailable(workspaceRoot: string, dbPath?: string): boolean {
  return fs.existsSync(resolveKnowledgeDbPath(workspaceRoot, dbPath));
}

export function assertKnowledgeDbAvailable(workspaceRoot: string, dbPath?: string): void {
  const target = resolveKnowledgeDbPath(workspaceRoot, dbPath);
  if (!fs.existsSync(target)) {
    throw new Error(
      `Knowledge database not found at "${target}". Run "codeprep index" to build knowledge graph, or choose another strategy.`
    );
  }
}

export function createPrepareContextPackV2UseCase(
  container: RepositoryContextContainer,
  options?: CreatePrepareContextPackV2Options | string
): { useCase: PrepareContextPackV2UseCase; store: SqliteRepositoryKnowledgeStore } {
  const opts: CreatePrepareContextPackV2Options = typeof options === 'string'
    ? { dbPath: options }
    : options ?? {};

  const root = container.project.rootPath;
  const resolvedDbPath = resolveKnowledgeDbPath(root, opts.dbPath);
  if (!opts.skipDbCheck) {
    assertKnowledgeDbAvailable(root, resolvedDbPath);
  }

  const store = new SqliteRepositoryKnowledgeStore({
    workspaceRoot: root,
    dbPath: resolvedDbPath,
  });

  return { useCase: buildUseCaseInstance(container, store), store };
}

function buildUseCaseInstance(
  container: RepositoryContextContainer,
  store: SqliteRepositoryKnowledgeStore
): PrepareContextPackV2UseCase {
  const querySubgraphUseCase = new QueryRelevantSubgraphUseCase(store);
  const extractor = new DefaultSourceExtractor(container.fileContentPort);
  const buildContextPackV2UseCase = new BuildContextPackV2UseCase(extractor);
  const revisionPort = new GitCliRevisionAdapter();

  return new PrepareContextPackV2UseCase({
    querySubgraphUseCase,
    discoverUseCase: container.discoverUseCase,
    buildContextPackV2UseCase,
    revisionPort,
    knowledgeStore: store,
  });
}

