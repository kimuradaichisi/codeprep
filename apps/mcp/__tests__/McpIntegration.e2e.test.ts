// apps/mcp/__tests__/McpIntegration.e2e.test.ts
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMcpContainer } from '../composition';
import { handleWorkspaceStatus } from '../tools/workspaceStatusTool';
import { handleDiscoverEntryPoints } from '../tools/discoverEntryPointsTool';
import { handleBuildContextPack } from '../tools/buildContextPackTool';

describe('MCP Integration E2E Pipeline', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'codeprep-mcp-e2e-'));
    await mkdir(join(tempDir, 'src/order'), { recursive: true });
    await mkdir(join(tempDir, 'src/payment'), { recursive: true });
    await mkdir(join(tempDir, 'tests'), { recursive: true });
    await mkdir(join(tempDir, 'docs/order'), { recursive: true });

    await writeFile(join(tempDir, 'src/order/OrderService.ts'), 'import  ../payment/RefundService;\nexport class OrderService {\n  refundOrder() {}\n}\n');
    await writeFile(join(tempDir, 'src/payment/RefundService.ts'), 'export class RefundService {\n  processRefund() {}\n}\n');
    await writeFile(join(tempDir, 'tests/OrderService.test.ts'), 'describe(OrderService, () => {});\n');
    await writeFile(join(tempDir, 'docs/order/refund.md'), '# Refund Policy\nDouble refund checks.\n');
    await writeFile(join(tempDir, 'CHANGELOG.md'), '# Changelog\n- Fix refund duplicates\n');
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (_err) {
      // Ignore cleanup error on Windows temp locking
    }
  });

  it('executes complete external agent workflow: status -> discover -> select -> pack', async () => {
    const container = createMcpContainer(tempDir);

    // Step 1: Check Workspace Status
    const status = await handleWorkspaceStatus(container);
    expect(status.workspaceBound).toBe(true);
    expect(status.workspaceRoot).toBe(resolve(tempDir));
    expect(status.repositoryIndex).toBe('ready');

    // Step 2: Discover Entry Points with Native Evidence
    const discovery = await handleDiscoverEntryPoints(container, {
      task: 'Fix duplicate refund in order service',
      maxCandidates: 5,
      enrichTopN: 3,
    });
    expect(discovery.candidates.length).toBeGreaterThan(0);
    const relativePaths = discovery.candidates.map((c) => c.relativePath);
    expect(relativePaths).toContain('src/order/OrderService.ts');

    const orderCand = discovery.candidates.find((c) => c.relativePath === 'src/order/OrderService.ts');
    expect(orderCand).toBeDefined();
    expect(orderCand?.evidence.length).toBeGreaterThan(0);

    // Step 3: Caller selects OrderService as entry point and builds context pack
    const pack = await handleBuildContextPack(container, {
      task: 'Fix duplicate refund in order service',
      selectedEntryPoints: ['src/order/OrderService.ts'],
      tokenLimit: 20000,
    });

    expect(pack.manifest.entryPoints).toEqual(['src/order/OrderService.ts']);
    expect(pack.manifest.budget.withinLimit).toBe(true);
    expect(pack.content).toContain('OrderService');
  }, 20000);
});
