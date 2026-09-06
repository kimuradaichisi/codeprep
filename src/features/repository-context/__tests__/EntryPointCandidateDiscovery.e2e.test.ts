// src/features/repository-context/__tests__/EntryPointCandidateDiscovery.e2e.test.ts
import { describe, expect, it, vi } from 'vitest';
import { DiscoverEntryPointCandidatesUseCase } from '../application/DiscoverEntryPointCandidatesUseCase';
import { BuildTaskContextUseCase } from '../application/BuildTaskContextUseCase';
import { formatContextManifest } from '../infrastructure/formatting/ContextManifestFormatter';
import type { DiscoverEntryPointCandidatesPorts } from '../application/entryPointCandidatePorts';
import type { BuildTaskContextPorts } from '../application/taskContextPorts';
import type { Project } from '../domain/Project';

describe('Phase 2: Entry Point Candidate Discovery E2E Scenario', () => {
  const project: Project = { id: 'order-system', name: 'OrderSystem', rootPath: '/repo' };

  const workspaceFiles = [
    { relativePath: 'src/order/OrderService.ts', size: 500 },
    { relativePath: 'src/order/ReturnPolicy.ts', size: 300 },
    { relativePath: 'src/payment/RefundSettlementService.ts', size: 800 },
    { relativePath: 'src/payment/RefundSettlementService.test.ts', size: 400 },
    { relativePath: 'docs/order/refund.md', size: 250 },
    { relativePath: 'AGENTS.md', size: 150 },
  ];

  const fileContents: Record<string, string> = {
    'src/order/OrderService.ts': 'export class OrderService { processOrder() {} }',
    'src/order/ReturnPolicy.ts': 'export class ReturnPolicy { validateReturn() {} } // 返品ポリシー',
    'src/payment/RefundSettlementService.ts': 'export class RefundSettlementService { // 二重返金防止ロジック\n refund() {} }',
    'src/payment/RefundSettlementService.test.ts': 'describe("RefundSettlementService", () => { it("二重返金を防ぐ", () => {}); });',
    'docs/order/refund.md': '# 返金・返品仕様書\n二重返金防止ロジックの概要。',
    'AGENTS.md': '# Repository Rules',
  };

  const createDiscoveryPorts = (): DiscoverEntryPointCandidatesPorts => ({
    projects: { getByIds: vi.fn(async () => [project]) },
    files: { list: vi.fn(async () => workspaceFiles) },
    ripgrep: {
      search: vi.fn(async (_proj, query) => {
        const lower = query.toLowerCase();
        const matches: { relativePath: string }[] = [];
        for (const [path, content] of Object.entries(fileContents)) {
          if (content.toLowerCase().includes(lower) || path.toLowerCase().includes(lower)) {
            matches.push({ relativePath: path });
          }
        }
        return { matches };
      }),
    },
    fileContent: {
      read: vi.fn(async (_proj, rel) => fileContents[rel] ?? ''),
      canRead: vi.fn(async () => true),
    },
  });

  const createBuildTaskContextPorts = (): BuildTaskContextPorts => ({
    projects: { getByIds: vi.fn(async () => [project]) },
    files: { list: vi.fn(async () => workspaceFiles) },
    fileContent: {
      read: vi.fn(async () => 'export class RefundSettlementService {}'),
      canRead: vi.fn(async () => true),
    },
    dependencyScanner: { findDependencies: vi.fn(async () => ['src/order/ReturnPolicy.ts']) },
  });

  it('executes full flow: Task -> Discovery -> Selection -> Context Pack', async () => {
    // 1. Task 入力から Entry Point 候補を決定論的に探索
    const discoveryUseCase = new DiscoverEntryPointCandidatesUseCase(createDiscoveryPorts());
    const discoveryResult = await discoveryUseCase.execute({
      task: '返品時の二重返金の原因を調査する',
      projectIds: [project.id],
    });

    expect(discoveryResult.candidates.length).toBeGreaterThan(0);
    const candidatePaths = discoveryResult.candidates.map((c) => c.relativePath);

    // 二重返金・返品に関連する候補が含まれることを確認
    expect(candidatePaths.some((p) => p.includes('RefundSettlementService'))).toBe(true);
    expect(candidatePaths.some((p) => p.includes('refund.md'))).toBe(true);

    // 2. ユーザーが上位候補から Entry Point を選択 (Human Selection)
    const selectedEntryPoint = 'src/payment/RefundSettlementService.ts';
    expect(candidatePaths).toContain(selectedEntryPoint);

    // 3. 選択された Entry Point を Phase 1 の BuildTaskContextUseCase に渡して Context Pack を構築
    const buildUseCase = new BuildTaskContextUseCase(createBuildTaskContextPorts());
    const buildResult = await buildUseCase.execute({
      taskContext: {
        projectId: project.id,
        task: '返品時の二重返金の原因を調査する',
        entryPoints: [selectedEntryPoint],
      },
    });

    expect(buildResult.manifest.entries.length).toBeGreaterThan(0);
    expect(buildResult.manifest.entries[0].relativePath).toBe(selectedEntryPoint);
    expect(buildResult.manifest.entries[0].role).toBe('target');

    // 4. Markdown Context Manifest 出力確認
    const markdown = formatContextManifest(buildResult.manifest);
    expect(markdown).toContain('## Task\n\n返品時の二重返金の原因を調査する');
    expect(markdown).toContain('src/payment/RefundSettlementService.ts');
  });
});
