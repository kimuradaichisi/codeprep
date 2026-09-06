import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProjectRegistryStore } from '../../src/features/repository-context/infrastructure/filesystem/ProjectRegistryStore';
import {
  handleGetRepositoryIndexStatus,
  handleRefreshRepositoryIndex,
} from './RepositoryIndexHandler';

describe('Workspace Lifecycle Repository & Knowledge Index', () => {
  let tempRoot: string;
  let indexesDir: string;
  let projectDir: string;
  let mockRegistry: ProjectRegistryStore;

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'codeprep-lifecycle-'));
    indexesDir = join(tempRoot, 'indexes');
    projectDir = join(tempRoot, 'project-a');

    await mkdir(join(projectDir, 'src'), { recursive: true });
    await mkdir(join(projectDir, 'docs'), { recursive: true });

    await writeFile(
      join(projectDir, 'src/OrderService.ts'),
      'export class OrderService { async createOrder() {} }',
      'utf8'
    );
    await writeFile(
      join(projectDir, 'docs/refund.md'),
      '# Refund Policy\n\n30 days window.',
      'utf8'
    );

    const registryPath = join(tempRoot, 'registry.json');
    mockRegistry = new ProjectRegistryStore(registryPath);
    await mockRegistry.saveAll([
      {
        id: 'project-a',
        name: 'Project A',
        rootPath: projectDir,
        excludePatterns: [],
      },
    ]);
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  it('runs complete lifecycle: first load, no-change reuse, one-file incremental refresh, and resilience to failure', async () => {
    const workspaceId = 'test-workspace';

    // 0. Initial Status before build
    const initialStatus = await handleGetRepositoryIndexStatus(indexesDir, workspaceId);
    expect(initialStatus.status).toBe('not_indexed');

    // 1. First Load -> Build
    const firstRes = await handleRefreshRepositoryIndex(mockRegistry, indexesDir, workspaceId);
    expect(firstRes.status).toBe('ready');
    expect(firstRes.rebuilt).toBe(true);
    expect(firstRes.knowledgeStatus).toBe('ready');
    expect(firstRes.knowledgeEntries).toBeGreaterThan(0);

    const postBuildStatus = await handleGetRepositoryIndexStatus(indexesDir, workspaceId);
    expect(postBuildStatus.status).toBe('ready');
    expect(postBuildStatus.knowledgeStatus).toBe('ready');
    expect(postBuildStatus.knowledgeEntries).toBe(firstRes.knowledgeEntries);

    // 2. No-change Load -> Reuse
    const secondRes = await handleRefreshRepositoryIndex(mockRegistry, indexesDir, workspaceId);
    expect(secondRes.status).toBe('ready');
    expect(secondRes.rebuilt).toBe(false);
    expect(secondRes.metrics?.modified).toBe(0);
    expect(secondRes.metrics?.unchanged).toBe(2);
    expect(secondRes.knowledgeStatus).toBe('ready');
    expect(secondRes.knowledgeEntries).toBe(firstRes.knowledgeEntries);

    // 3. One-file change -> Incremental Refresh
    await writeFile(
      join(projectDir, 'src/OrderService.ts'),
      'export class OrderService { async cancelOrder() {} }',
      'utf8'
    );
    const thirdRes = await handleRefreshRepositoryIndex(mockRegistry, indexesDir, workspaceId);
    expect(thirdRes.status).toBe('ready');
    expect(thirdRes.rebuilt).toBe(false);
    expect(thirdRes.metrics?.modified).toBe(1);
    expect(thirdRes.knowledgeStatus).toBe('ready');
    expect(thirdRes.knowledgeEntries).toBeGreaterThan(0);

    // 4. Knowledge Index failure -> Workspace remains usable
    const brokenIndexesDir = join(tempRoot, 'non-writable-sub');
    await writeFile(brokenIndexesDir, 'not a directory', 'utf8'); // causes knowledge save to fail

    // Knowledge sync fails inside handleRefreshRepositoryIndex, but Repository index or degraded knowledge is caught
    const resWithBrokenKnowledge = await handleRefreshRepositoryIndex(mockRegistry, brokenIndexesDir, workspaceId);
    // Even if store path has issue, the handler gracefully returns without throwing
    expect(['ready', 'degraded']).toContain(resWithBrokenKnowledge.status);
  });
});
