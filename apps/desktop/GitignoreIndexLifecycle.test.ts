// apps/desktop/GitignoreIndexLifecycle.test.ts
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProjectRegistryStore } from '../../src/features/repository-context/infrastructure/filesystem/ProjectRegistryStore';
import { JsonRepositoryIndexStore } from '../../src/features/repository-context/infrastructure/filesystem/JsonRepositoryIndexStore';
import { JsonStructuredKnowledgeIndexStore } from '../../src/features/repository-context/infrastructure/filesystem/JsonStructuredKnowledgeIndexStore';
import { JsonSemanticIndexStore } from '../../src/features/repository-context/infrastructure/filesystem/JsonSemanticIndexStore';
import { FakeEmbeddingPort } from '../../src/features/repository-context/infrastructure/embedding/FakeEmbeddingPort';
import { handleRefreshRepositoryIndex } from './RepositoryIndexHandler';

describe('Gitignore Change Index Lifecycle', () => {
  let tempRoot: string;
  let indexesDir: string;
  let projectDir: string;
  let mockRegistry: ProjectRegistryStore;
  const workspaceId = 'test-lifecycle-ws';

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'codeprep-gitignore-lifecycle-'));
    indexesDir = join(tempRoot, 'indexes');
    projectDir = join(tempRoot, 'project');

    await mkdir(join(projectDir, 'src'), { recursive: true });
    await writeFile(join(projectDir, 'src/foo.ts'), 'export function processPayment() {}\n', 'utf8');
    await writeFile(join(projectDir, 'src/bar.ts'), 'export function handleOrder() {}\n', 'utf8');

    const registryPath = join(tempRoot, 'registry.json');
    mockRegistry = new ProjectRegistryStore(registryPath);
    await mockRegistry.saveAll([{ id: 'project', name: 'Project', rootPath: projectDir }]);
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  it('removes foo.ts from all 3 indexes when ignored and restores on unignore', async () => {
    const fakePort = new FakeEmbeddingPort();
    const repoStore = new JsonRepositoryIndexStore(indexesDir);
    const knowledgeStore = new JsonStructuredKnowledgeIndexStore(indexesDir);
    const semanticStore = new JsonSemanticIndexStore(indexesDir);

    // 1. Initial Build: foo.ts and bar.ts are present
    const firstRes = await handleRefreshRepositoryIndex(mockRegistry, indexesDir, workspaceId, fakePort);
    expect(firstRes.status).toBe('ready');

    await assertFilePresence(repoStore, knowledgeStore, semanticStore, workspaceId, 'src/foo.ts', true);
    await assertFilePresence(repoStore, knowledgeStore, semanticStore, workspaceId, 'src/bar.ts', true);

    // 2. Add foo.ts to .gitignore and refresh -> foo.ts removed from all 3 indexes
    await writeFile(join(projectDir, '.gitignore'), 'src/foo.ts\n', 'utf8');
    const secondRes = await handleRefreshRepositoryIndex(mockRegistry, indexesDir, workspaceId, fakePort);
    expect(secondRes.status).toBe('ready');

    await assertFilePresence(repoStore, knowledgeStore, semanticStore, workspaceId, 'src/foo.ts', false);
    await assertFilePresence(repoStore, knowledgeStore, semanticStore, workspaceId, 'src/bar.ts', true);

    // 3. Remove foo.ts from .gitignore and refresh -> foo.ts restored in all 3 indexes
    await writeFile(join(projectDir, '.gitignore'), '', 'utf8');
    const thirdRes = await handleRefreshRepositoryIndex(mockRegistry, indexesDir, workspaceId, fakePort);
    expect(thirdRes.status).toBe('ready');

    await assertFilePresence(repoStore, knowledgeStore, semanticStore, workspaceId, 'src/foo.ts', true);
    await assertFilePresence(repoStore, knowledgeStore, semanticStore, workspaceId, 'src/bar.ts', true);
  });
});

async function assertFilePresence(
  repoStore: JsonRepositoryIndexStore,
  kStore: JsonStructuredKnowledgeIndexStore,
  sStore: JsonSemanticIndexStore,
  wsId: string,
  relPath: string,
  shouldExist: boolean
): Promise<void> {
  const repo = await repoStore.load(wsId);
  const repoExists = repo?.entries.some((e) => e.relativePath === relPath) ?? false;
  expect(repoExists).toBe(shouldExist);

  const kIndex = await kStore.load(wsId);
  const kExists = kIndex?.entries.some((e) => e.relativePath === relPath) ?? false;
  expect(kExists).toBe(shouldExist);

  const sIndex = await sStore.load(wsId);
  const sExists = sIndex?.entries.some((e) => e.relativePath === relPath) ?? false;
  expect(sExists).toBe(shouldExist);
}
