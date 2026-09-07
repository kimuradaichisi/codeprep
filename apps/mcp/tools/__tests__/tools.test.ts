// apps/mcp/tools/__tests__/tools.test.ts
import { describe, expect, it, vi } from 'vitest';
import type { McpContextContainer } from '../../composition';
import { handleWorkspaceStatus, WORKSPACE_STATUS_TOOL_NAME } from '../workspaceStatusTool';
import { handleDiscoverEntryPoints, DISCOVER_ENTRY_POINTS_TOOL_NAME } from '../discoverEntryPointsTool';
import { handleBuildContextPack, BUILD_CONTEXT_PACK_TOOL_NAME } from '../buildContextPackTool';
import { PathSecurityError } from '../../security';

describe('MCP Tools', () => {
  const createMockContainer = (overrides?: Partial<McpContextContainer>): McpContextContainer => ({
    project: { id: 'test-proj', name: 'Test', rootPath: 'D:/test-workspace' },
    discoverUseCase: {
      execute: vi.fn().mockResolvedValue({
        candidates: [{ projectId: 'test-proj', relativePath: 'src/order.ts', score: 80, reasons: ['filenameMatch'], matchedTerms: ['order'] }],
        warnings: [],
        terms: ['order'],
      }),
    } as any,
    enrichUseCase: {
      execute: vi.fn().mockResolvedValue([{
        candidate: { projectId: 'test-proj', relativePath: 'src/order.ts', score: 80, reasons: ['filenameMatch'], matchedTerms: ['order'] },
        evidence: [{ kind: 'dependency', projectId: 'test-proj', candidatePath: 'src/order.ts', relatedPath: 'src/item.ts', detail: 'imports' }],
        supportScore: 20,
      }]),
    } as any,
    buildContextUseCase: {
      execute: vi.fn().mockResolvedValue({
        manifest: {
          projectId: 'test-proj',
          task: 'fix refund',
          entryPoints: ['src/order.ts'],
          entries: [{ projectId: 'test-proj', relativePath: 'src/order.ts', role: 'target', packMode: 'full', score: 100 }],
          budget: { bytes: 500, estimatedTokens: 125, limit: 40000, withinLimit: true },
        },
        warnings: [],
      }),
    } as any,
    prepareContextUseCase: { execute: vi.fn() } as any,
    formatter: {
      format: vi.fn().mockReturnValue('# Packaged Code Context'),
    } as any,

    fileContentPort: {
      canRead: vi.fn().mockResolvedValue(true),
      read: vi.fn().mockResolvedValue('export class Order {}'),
    },
    checkStatus: vi.fn().mockResolvedValue({
      workspaceRoot: 'D:/test-workspace',
      workspaceBound: true,
      repositoryIndex: 'ready',
      knowledgeIndex: 'ready',
      semanticIndex: 'missing',
      diagnostics: [],
    }),
    ...overrides,
  });

  describe(WORKSPACE_STATUS_TOOL_NAME, () => {
    it('returns workspace status result', async () => {
      const container = createMockContainer();
      const res = await handleWorkspaceStatus(container);
      expect(res.workspaceBound).toBe(true);
      expect(res.repositoryIndex).toBe('ready');
      expect(res.semanticIndex).toBe('missing');
    });

    it('distinguishes semantic degraded state from repository/knowledge failure', async () => {
      const container = createMockContainer({
        checkStatus: vi.fn().mockResolvedValue({
          workspaceRoot: 'D:/test-workspace',
          workspaceBound: true,
          repositoryIndex: 'ready',
          knowledgeIndex: 'ready',
          semanticIndex: 'degraded',
          diagnostics: ['Semantic embedding provider unavailable (degraded): connection refused'],
        }),
      });
      const res = await handleWorkspaceStatus(container);
      expect(res.repositoryIndex).toBe('ready');
      expect(res.knowledgeIndex).toBe('ready');
      expect(res.semanticIndex).toBe('degraded');
      expect(res.diagnostics[0]).toContain('degraded');
    });
  });

  describe(DISCOVER_ENTRY_POINTS_TOOL_NAME, () => {
    it('validates input and returns transformed enriched candidates', async () => {
      const container = createMockContainer();
      const res = await handleDiscoverEntryPoints(container, { task: 'fix refund issue' });
      expect(res.task).toBe('fix refund issue');
      expect(res.candidates).toHaveLength(1);
      expect(res.candidates[0].relativePath).toBe('src/order.ts');
      expect(res.candidates[0].supportScore).toBe(20);
      expect(res.candidates[0].evidence[0].kind).toBe('dependency');
      expect(res.confidence).toBeDefined();
      expect(res.suggestedPackStrategy).toBeDefined();
    });

    it('succeeds gracefully with deterministic candidates when semantic search degrades', async () => {
      const container = createMockContainer({
        discoverUseCase: {
          execute: vi.fn().mockResolvedValue({
            candidates: [{ projectId: 'test-proj', relativePath: 'src/order.ts', score: 70, reasons: ['symbolLikeMatch'], matchedTerms: ['order'] }],
            warnings: [{ kind: 'rgFailure', projectId: 'test-proj', message: 'Semantic candidate discovery degraded: embedding connection failed' }],
            terms: ['order'],
          }),
        } as any,
      });
      const res = await handleDiscoverEntryPoints(container, { task: 'fix refund issue' });
      expect(res.candidates).toHaveLength(1);
      expect(res.candidates[0].relativePath).toBe('src/order.ts');
      expect(res.warnings[0]).toContain('Semantic candidate discovery degraded');
    });

    it('rejects empty task', async () => {
      const container = createMockContainer();
      await expect(handleDiscoverEntryPoints(container, { task: '' })).rejects.toThrow('Field "task" must be a non-empty string');
    });
  });

  describe(BUILD_CONTEXT_PACK_TOOL_NAME, () => {
    it('builds context pack with manifest and formatted content', async () => {
      const container = createMockContainer();
      const res = await handleBuildContextPack(container, {
        task: 'fix refund',
        selectedEntryPoints: ['src/order.ts'],
      });
      expect(res.manifest.task).toBe('fix refund');
      expect(res.content).toBe('# Packaged Code Context');
    });

    it('rejects path traversal in selectedEntryPoints', async () => {
      const container = createMockContainer();
      await expect(handleBuildContextPack(container, {
        task: 'fix refund',
        selectedEntryPoints: ['../etc/passwd'],
      })).rejects.toThrow(PathSecurityError);
    });
  });
});
