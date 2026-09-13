/*
 * Copyright 2026 CodePrep Contributors
 */
import {
  createRepositoryContextContainer,
  type RepositoryContextContainer,
} from '../../src/features/repository-context/infrastructure/composition/RepositoryContextContainer';

export function createCliContainer(workspaceRootRaw: string): RepositoryContextContainer {
  return createRepositoryContextContainer(workspaceRootRaw, 'cli-workspace');
}
