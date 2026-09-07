// apps/desktop/__tests__/DesktopMcpParity.test.ts
import { describe, expect, it, vi } from 'vitest';
import type { Project } from '../../../src/features/repository-context/domain/Project';
import type { DesktopApi } from '../DesktopApi';
import type { McpContextContainer } from '../../mcp/composition';
import { handleDiscoverEntryPoints } from '../../mcp/tools/discoverEntryPointsTool';
import { handleBuildContextPack } from '../../mcp/tools/buildContextPackTool';

const testProject: Project = {
  id: 'order-project',
  name: 'Order Project',
  rootPath: '/fake/repo',
};

const setupParityFixtures = () => {
  const candidates = [
    { projectId: 'order-project', relativePath: 'src/order/OrderService.ts', score: 85, reasons: ['filenameMatch'] as const },
    { projectId: 'order-project', relativePath: 'src/order/ReturnPolicy.ts', score: 40, reasons: ['semanticMatch'] as const },
  ];
  const enriched = candidates.map((c, i) => ({
    candidate: c,
    supportScore: i === 0 ? 50 : 10,
    evidence: [{ kind: 'relatedTest' as const, sourcePath: c.relativePath, relatedPath: 'tests/Order.test.ts', weight: 20 }],
  }));

  const mockDesktopApi = {
    discoverEntryPointCandidates: vi.fn(async () => ({
      candidates,
      enrichedCandidates: enriched,
      confidence: { level: 'high' as const, score: 88, reasons: ['largeScoreGap' as const, 'strongStructuralSupport' as const] },
      suggestedPackStrategy: 'fast' as const,
      terms: ['order', 'refund'],
      warnings: [],
    })),
    buildTaskContext: vi.fn(async (req) => ({
      manifest: {
        projectId: testProject.id,
        task: req.task,
        entryPoints: req.entryPoints,
        entries: req.entryPoints.map((ep: string) => ({
          projectId: testProject.id,
          relativePath: ep,
          role: 'target' as const,
          packMode: 'full' as const,
          score: 85,
          candidateReasons: [],
          recommendationReasons: [],
        })),
        budget: { bytes: 2000, estimatedTokens: 500, limit: 40000, withinLimit: true },
      },
      markdown: '# Manifest',
      content: '# Packaged OrderService',
      resolvedStrategy: req.strategy === 'fast' || req.strategy === 'auto' ? ('fast' as const) : ('standard' as const),
      candidates: [],
      warnings: [],
    })),
  } as unknown as DesktopApi;

  const mockMcpContainer = {
    project: testProject,
    discoverUseCase: { execute: vi.fn(async () => ({ candidates, warnings: [] })) },
    enrichUseCase: { execute: vi.fn(async () => enriched) },
    buildContextUseCase: {
      execute: vi.fn(async (inp) => ({
        manifest: {
          projectId: testProject.id,
          task: inp.taskContext.task,
          entryPoints: inp.taskContext.entryPoints,
          entries: inp.taskContext.entryPoints.map((ep: string) => ({
            projectId: testProject.id,
            relativePath: ep,
            role: 'target' as const,
            packMode: 'full' as const,
            score: 85,
            candidateReasons: [],
            recommendationReasons: [],
          })),
          budget: { bytes: 2000, estimatedTokens: 500, limit: 40000, withinLimit: true },
        },
        warnings: [],
      })),
    },
    fileContentPort: { read: vi.fn(async () => 'export class OrderService {}') },
    formatter: { format: vi.fn(() => '# Packaged OrderService') },
  } as unknown as McpContextContainer;

  return { mockDesktopApi, mockMcpContainer };
};

describe('Desktop / MCP Parity', () => {
  it('yields identical confidence and pack strategy for the same task', async () => {
    const { mockDesktopApi, mockMcpContainer } = setupParityFixtures();
    const task = '返品時に二重返金される問題を調査する';
    const selected = ['src/order/OrderService.ts'];

    // Desktop Discovery & Build
    const desktopDisc = await mockDesktopApi.discoverEntryPointCandidates({ projectId: testProject.id, task });
    const desktopPack = await mockDesktopApi.buildTaskContext({ projectId: testProject.id, task, entryPoints: selected, strategy: 'auto' });

    // MCP Discovery & Build
    const mcpDisc = await handleDiscoverEntryPoints(mockMcpContainer, { task });
    const mcpPack = await handleBuildContextPack(mockMcpContainer, { task, selectedEntryPoints: selected, strategy: 'auto' });

    // Parity Assertions
    expect(desktopDisc.confidence?.level).toBe(mcpDisc.confidence?.level);
    expect(desktopDisc.suggestedPackStrategy).toBe(mcpDisc.suggestedPackStrategy);
    expect(desktopPack.resolvedStrategy).toBe('fast');
    expect(desktopPack.manifest.entryPoints).toEqual(mcpPack.manifest.entryPoints);
    expect(desktopPack.manifest.entries.map((e) => e.relativePath)).toEqual(mcpPack.manifest.entries.map((e) => e.relativePath));
  });
});
