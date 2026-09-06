import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BuildStructuredKnowledgeIndexUseCase } from '../application/BuildStructuredKnowledgeIndexUseCase';
import { KnowledgeExtractionService } from '../application/KnowledgeExtractionService';
import { RefreshStructuredKnowledgeIndexUseCase } from '../application/RefreshStructuredKnowledgeIndexUseCase';
import type { MarkdownSectionEntry } from '../domain/MarkdownSectionEntry';
import type { RepositoryIndex, RepositoryIndexEntry } from '../domain/RepositoryIndex';
import type { RepositoryIndexChangeSet } from '../domain/RepositoryIndexChangeSet';
import { TypeScriptSymbolExtractor } from '../infrastructure/code/TypeScriptSymbolExtractor';
import { JsonStructuredKnowledgeIndexStore } from '../infrastructure/filesystem/JsonStructuredKnowledgeIndexStore';
import { NodeFsKnowledgeFileReader } from '../infrastructure/filesystem/NodeFsKnowledgeFileReader';
import { MarkdownSectionExtractor } from '../infrastructure/markdown/MarkdownSectionExtractor';

const ORDER_SERVICE_CODE = [
  'export class OrderService {',
  '  /**',
  '   * Create a new order',
  '   */',
  '  async createOrder(request: OrderRequest): Promise<OrderResult> {',
  '    return { success: true };',
  '  }',
  '}',
].join('\n');

const RETURN_POLICY_CODE = [
  'export interface ReturnPolicy {',
  '  canReturn(item: Item): boolean;',
  '}',
].join('\n');

const REFUND_MD = [
  '# Refund Policy',
  '',
  'Standard refund window is 30 days.',
  '',
  '## Exceptions',
  '',
  'Custom software has no refund.',
].join('\n');

describe('StructuredKnowledgeIndex E2E Scenario (Chapters 26 & 27)', () => {
  const testWorkspaceDir = join(__dirname, '.test-workspace-e2e');
  const testStoreDir = join(__dirname, '.test-store-e2e');
  const projectId = 'test-workspace';

  let store: JsonStructuredKnowledgeIndexStore;
  let fileReader: NodeFsKnowledgeFileReader;
  let service: KnowledgeExtractionService;
  let buildUseCase: BuildStructuredKnowledgeIndexUseCase;
  let refreshUseCase: RefreshStructuredKnowledgeIndexUseCase;

  beforeEach(async () => {
    await rm(testWorkspaceDir, { recursive: true, force: true });
    await rm(testStoreDir, { recursive: true, force: true });
    await mkdir(testWorkspaceDir, { recursive: true });

    await writeFile(join(testWorkspaceDir, 'OrderService.ts'), ORDER_SERVICE_CODE, 'utf8');
    await writeFile(join(testWorkspaceDir, 'ReturnPolicy.ts'), RETURN_POLICY_CODE, 'utf8');
    await writeFile(join(testWorkspaceDir, 'refund.md'), REFUND_MD, 'utf8');

    store = new JsonStructuredKnowledgeIndexStore(testStoreDir);
    fileReader = new NodeFsKnowledgeFileReader(() => testWorkspaceDir);
    const mdExtractor = new MarkdownSectionExtractor();
    const tsExtractor = new TypeScriptSymbolExtractor();
    service = new KnowledgeExtractionService(mdExtractor, tsExtractor, fileReader);
    buildUseCase = new BuildStructuredKnowledgeIndexUseCase(service, store);
    refreshUseCase = new RefreshStructuredKnowledgeIndexUseCase(service, store, buildUseCase);
  });

  afterEach(async () => {
    await rm(testWorkspaceDir, { recursive: true, force: true });
    await rm(testStoreDir, { recursive: true, force: true });
  });

  const orderEntry: RepositoryIndexEntry = {
    projectId,
    relativePath: 'OrderService.ts',
    kind: 'code',
    size: 100,
    contentHash: 'h1',
  };

  const returnEntry: RepositoryIndexEntry = {
    projectId,
    relativePath: 'ReturnPolicy.ts',
    kind: 'code',
    size: 100,
    contentHash: 'h2',
  };

  const refundEntry: RepositoryIndexEntry = {
    projectId,
    relativePath: 'refund.md',
    kind: 'document',
    size: 100,
    contentHash: 'h3',
  };

  const baseRepoIndex: RepositoryIndex = {
    metadata: {
      workspaceId: projectId,
      schemaVersion: 1,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    entries: [orderEntry, returnEntry, refundEntry],
  };

  it('executes full lifecycle: Initial Build -> No-change Refresh -> Modified Refresh -> Deleted Refresh', async () => {
    // 1. Initial Build
    const initialIndex = await buildUseCase.execute(baseRepoIndex);

    expect(initialIndex.metadata.markdownSectionCount).toBe(2);
    expect(initialIndex.metadata.codeSymbolCount).toBe(3);
    expect(initialIndex.metadata.totalEntries).toBe(5);

    const entryIds = initialIndex.entries.map((e) => e.entryId);
    expect(entryIds).toContain(`${projectId}:OrderService.ts#sym:class:OrderService:1`);
    expect(entryIds).toContain(`${projectId}:OrderService.ts#sym:method:OrderService.createOrder:5`);
    expect(entryIds).toContain(`${projectId}:ReturnPolicy.ts#sym:interface:ReturnPolicy:1`);
    expect(entryIds).toContain(`${projectId}:refund.md#sec:1:Refund Policy:1`);
    expect(entryIds).toContain(`${projectId}:refund.md#sec:2:Refund Policy > Exceptions:5`);

    // 2. No-change Refresh
    const readSpy = vi.spyOn(fileReader, 'readFileContent');
    const noChangeSet: RepositoryIndexChangeSet = {
      added: [],
      modified: [],
      deleted: [],
      unchangedCount: 3,
    };
    const noChangeResult = await refreshUseCase.execute(projectId, noChangeSet, baseRepoIndex);

    expect(readSpy).not.toHaveBeenCalled();
    expect(noChangeResult.metadata.totalEntries).toBe(5);
    expect(noChangeResult.entries.map((e) => e.entryId)).toEqual(entryIds);

    // 3. 1-file modified Refresh (OrderService.ts)
    readSpy.mockClear();
    const updatedOrderService = [
      'export class OrderService {',
      '  async cancelOrder(id: string): Promise<boolean> { return true; }',
      '}',
    ].join('\n');
    await writeFile(join(testWorkspaceDir, 'OrderService.ts'), updatedOrderService, 'utf8');

    const modifiedChangeSet: RepositoryIndexChangeSet = {
      added: [],
      modified: [orderEntry],
      deleted: [],
      unchangedCount: 2,
    };
    const modifiedResult = await refreshUseCase.execute(projectId, modifiedChangeSet, baseRepoIndex);

    expect(readSpy).toHaveBeenCalledTimes(1);
    expect(readSpy).toHaveBeenCalledWith(projectId, 'OrderService.ts');
    const modifiedIds = modifiedResult.entries.map((e) => e.entryId);
    expect(modifiedIds).toContain(`${projectId}:OrderService.ts#sym:class:OrderService:1`);
    expect(modifiedIds).toContain(`${projectId}:OrderService.ts#sym:method:OrderService.cancelOrder:2`);
    expect(modifiedIds).not.toContain(`${projectId}:OrderService.ts#sym:method:OrderService.createOrder:5`);
    expect(modifiedIds).toContain(`${projectId}:ReturnPolicy.ts#sym:interface:ReturnPolicy:1`);
    expect(modifiedIds).toContain(`${projectId}:refund.md#sec:1:Refund Policy:1`);

    // 4. 1-file deleted Refresh (refund.md)
    readSpy.mockClear();
    await rm(join(testWorkspaceDir, 'refund.md'), { force: true });
    const deletedChangeSet: RepositoryIndexChangeSet = {
      added: [],
      modified: [],
      deleted: [refundEntry],
      unchangedCount: 2,
    };
    const deletedResult = await refreshUseCase.execute(projectId, deletedChangeSet, baseRepoIndex);

    expect(readSpy).not.toHaveBeenCalled();
    expect(deletedResult.metadata.markdownSectionCount).toBe(0);
    expect(deletedResult.metadata.codeSymbolCount).toBe(3);
    expect(deletedResult.metadata.totalEntries).toBe(3);
  });

  it('correctly parses 3-level nested markdown headings with headingPath hierarchy', async () => {
    const nestedMarkdown = [
      '# Order',
      'Order root notes.',
      '',
      '## Refund',
      'Refund process details.',
      '',
      '### Duplicate Prevention',
      'Idempotency check explanation.',
    ].join('\n');

    await writeFile(join(testWorkspaceDir, 'nested.md'), nestedMarkdown, 'utf8');

    const nestedRepoIndex: RepositoryIndex = {
      metadata: {
        workspaceId: projectId,
        schemaVersion: 1,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
      entries: [
        {
          projectId,
          relativePath: 'nested.md',
          kind: 'document',
          size: nestedMarkdown.length,
          contentHash: 'hash-nested',
        },
      ],
    };

    const index = await buildUseCase.execute(nestedRepoIndex);
    expect(index.metadata.markdownSectionCount).toBe(3);
    expect(index.metadata.totalEntries).toBe(3);

    const sections = index.entries.filter((e): e is MarkdownSectionEntry => e.kind === 'markdown-section');
    expect(sections).toHaveLength(3);

    expect(sections[0].headingText).toBe('Order');
    expect(sections[0].headingLevel).toBe(1);
    expect(sections[0].headingPath).toEqual(['Order']);

    expect(sections[1].headingText).toBe('Refund');
    expect(sections[1].headingLevel).toBe(2);
    expect(sections[1].headingPath).toEqual(['Order', 'Refund']);

    expect(sections[2].headingText).toBe('Duplicate Prevention');
    expect(sections[2].headingLevel).toBe(3);
    expect(sections[2].headingPath).toEqual(['Order', 'Refund', 'Duplicate Prevention']);
  });
});
