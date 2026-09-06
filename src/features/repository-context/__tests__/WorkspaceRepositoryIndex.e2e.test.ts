import { mkdir, mkdtemp, rm, unlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Project } from '../domain/Project';
import { RefreshRepositoryIndexUseCase } from '../application/RefreshRepositoryIndexUseCase';
import { JsonRepositoryIndexStore } from '../infrastructure/filesystem/JsonRepositoryIndexStore';
import { NodeCryptoFingerprintClient } from '../infrastructure/filesystem/NodeCryptoFingerprintClient';
import { ProjectScannerClient } from '../infrastructure/filesystem/ProjectScannerClient';

describe('Workspace Repository Index Foundation E2E', () => {
  let tempRoot: string;
  let storeDir: string;
  let backendDir: string;
  let commonDir: string;
  let backendProject: Project;
  let commonProject: Project;
  let refreshUseCase: RefreshRepositoryIndexUseCase;
  let store: JsonRepositoryIndexStore;

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'codeprep-idx-e2e-'));
    storeDir = join(tempRoot, 'indexes');
    backendDir = join(tempRoot, 'workspace-a', 'project-backend');
    commonDir = join(tempRoot, 'workspace-a', 'project-common');

    await mkdir(join(backendDir, 'src/order'), { recursive: true });
    await mkdir(join(backendDir, 'tests'), { recursive: true });
    await mkdir(join(backendDir, 'docs/order'), { recursive: true });
    await mkdir(join(commonDir, 'src'), { recursive: true });

    await writeFile(join(backendDir, 'src/order/OrderService.ts'), 'export class OrderService {}');
    await writeFile(join(backendDir, 'src/order/ReturnPolicy.ts'), 'export class ReturnPolicy {}');
    await writeFile(join(backendDir, 'tests/OrderService.test.ts'), 'test("order", () => {});');
    await writeFile(join(backendDir, 'docs/order/refund.md'), '# Refund Documentation');
    await writeFile(join(commonDir, 'src/Money.ts'), 'export class Money {}');

    backendProject = { id: 'backend', name: 'Backend', rootPath: backendDir, excludePatterns: [] };
    commonProject = { id: 'common', name: 'Common', rootPath: commonDir, excludePatterns: [] };

    store = new JsonRepositoryIndexStore(storeDir);
    const scanner = new ProjectScannerClient();
    const fingerprint = new NodeCryptoFingerprintClient((id) => (id === 'backend' ? backendDir : commonDir));
    const clock = { nowIso: () => new Date().toISOString() };
    const ports = { store, scanner, fingerprint, clock };

    refreshUseCase = new RefreshRepositoryIndexUseCase(ports);
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  it('runs complete lifecycle: first load, second load, modify, add, delete, and workspace isolation', async () => {
    const projects = [backendProject, commonProject];

    // 1. First load: Index does not exist -> Build (added = 5)
    const firstResult = await refreshUseCase.execute({ workspaceId: 'workspace-a', projects });
    expect(firstResult.rebuilt).toBe(true);
    expect(firstResult.metrics.added).toBe(5);
    expect(firstResult.metrics.totalFiles).toBe(5);

    // 2. Second load: No changes -> Refresh (unchanged = 5, added=0, modified=0, deleted=0)
    const secondResult = await refreshUseCase.execute({ workspaceId: 'workspace-a', projects });
    expect(secondResult.rebuilt).toBe(false);
    expect(secondResult.metrics.unchanged).toBe(5);
    expect(secondResult.metrics.added).toBe(0);
    expect(secondResult.metrics.modified).toBe(0);
    expect(secondResult.metrics.deleted).toBe(0);

    // 3. Modify: OrderService.ts changed -> modified = 1
    await writeFile(join(backendDir, 'src/order/OrderService.ts'), 'export class OrderService { /* updated */ }');
    const modResult = await refreshUseCase.execute({ workspaceId: 'workspace-a', projects });
    expect(modResult.metrics.modified).toBe(1);
    expect(modResult.changeSet.modified[0].relativePath).toBe('src/order/OrderService.ts');
    expect(modResult.metrics.unchanged).toBe(4);

    // 4. Add: RefundService.ts added -> added = 1
    await writeFile(join(backendDir, 'src/order/RefundService.ts'), 'export class RefundService {}');
    const addResult = await refreshUseCase.execute({ workspaceId: 'workspace-a', projects });
    expect(addResult.metrics.added).toBe(1);
    expect(addResult.changeSet.added[0].relativePath).toBe('src/order/RefundService.ts');
    expect(addResult.metrics.totalFiles).toBe(6);

    // 5. Delete: ReturnPolicy.ts deleted -> deleted = 1
    await unlink(join(backendDir, 'src/order/ReturnPolicy.ts'));
    const delResult = await refreshUseCase.execute({ workspaceId: 'workspace-a', projects });
    expect(delResult.metrics.deleted).toBe(1);
    expect(delResult.changeSet.deleted[0].relativePath).toBe('src/order/ReturnPolicy.ts');
    expect(delResult.metrics.totalFiles).toBe(5);

    // 6. Workspace switch: workspace-b does not interfere with workspace-a
    const wsBResult = await refreshUseCase.execute({ workspaceId: 'workspace-b', projects: [commonProject] });
    expect(wsBResult.rebuilt).toBe(true);
    expect(wsBResult.metrics.totalFiles).toBe(1);

    const wsAReload = await store.load('workspace-a');
    expect(wsAReload?.entries.length).toBe(5);
  });

  it('detects modification when file content changes with same byte length', async () => {
    const projects = [commonProject];
    const initial = await refreshUseCase.execute({ workspaceId: 'workspace-same-size', projects });
    expect(initial.metrics.added).toBe(1);

    // 'export class Money {}' と同じ 21 バイトの異なる文字列
    await writeFile(join(commonDir, 'src/Money.ts'), 'export class Price {}');
    const refreshed = await refreshUseCase.execute({ workspaceId: 'workspace-same-size', projects });

    expect(refreshed.metrics.modified).toBe(1);
    expect(refreshed.changeSet.modified[0].relativePath).toBe('src/Money.ts');
    expect(refreshed.metrics.unchanged).toBe(0);
  });
});
