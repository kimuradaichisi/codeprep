// apps/mcp/composition.ts
import {
  createRepositoryContextContainer,
  type RepositoryContextContainer,
} from '../../src/features/repository-context/infrastructure/composition/RepositoryContextContainer';
import type { McpWorkspaceStatusResult } from './types';
import { checkMcpStatus } from './statusChecker';

import type { PrepareContextPackV2UseCase } from '../../src/features/repository-context/application/workingset/PrepareContextPackV2UseCase';

export interface McpContextContainer extends Pick<
  RepositoryContextContainer,
  'project' | 'discoverUseCase' | 'enrichUseCase' | 'buildContextUseCase' | 'prepareContextUseCase' | 'formatter' | 'fileContentPort'
> {
  readonly structuredKnowledgeStore?: RepositoryContextContainer['structuredKnowledgeStore'];
  readonly semanticStore?: RepositoryContextContainer['semanticStore'];
  readonly embeddingAdapter?: RepositoryContextContainer['embeddingAdapter'];
  readonly filesPort?: RepositoryContextContainer['filesPort'];
  readonly prepareContextPackV2UseCase?: PrepareContextPackV2UseCase;
  checkStatus(): Promise<McpWorkspaceStatusResult>;
}

export function createMcpContainer(workspaceRootRaw: string): McpContextContainer {
  const container = createRepositoryContextContainer(workspaceRootRaw, 'mcp-workspace');
  const checkStatus = () =>
    checkMcpStatus({
      project: container.project,
      files: container.filesPort,
      knowledgeStore: container.structuredKnowledgeStore,
      semanticStore: container.semanticStore,
      embeddingPort: container.embeddingAdapter,
    });
  return {
    ...container,
    checkStatus,
  };
}
