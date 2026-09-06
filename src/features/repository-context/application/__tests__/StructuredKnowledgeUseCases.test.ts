import { describe, expect, it, vi } from 'vitest';
import type { RepositoryIndex, RepositoryIndexEntry } from '../../domain/RepositoryIndex';
import type { RepositoryIndexChangeSet } from '../../domain/RepositoryIndexChangeSet';
import {
  type StructuredKnowledgeEntry,
  type StructuredKnowledgeIndex,
} from '../../domain/StructuredKnowledgeIndex';
import { BuildStructuredKnowledgeIndexUseCase } from '../BuildStructuredKnowledgeIndexUseCase';
import { KnowledgeExtractionService } from '../KnowledgeExtractionService';
import { RefreshStructuredKnowledgeIndexUseCase } from '../RefreshStructuredKnowledgeIndexUseCase';
import type {
  CodeSymbolExtractorPort,
  KnowledgeFileReaderPort,
  MarkdownSectionExtractorPort,
  StructuredKnowledgeIndexStore,
} from '../structuredKnowledgePorts';

describe('StructuredKnowledgeIndex UseCases', () => {
  const projectId = 'test-proj';

  const readmeEntry: RepositoryIndexEntry = {
    projectId,
    relativePath: 'docs/readme.md',
    kind: 'document',
    size: 100,
    contentHash: 'h1',
  };

  const appEntry: RepositoryIndexEntry = {
    projectId,
    relativePath: 'src/app.ts',
    kind: 'code',
    size: 200,
    contentHash: 'h2',
  };

  const sampleRepoIndex: RepositoryIndex = {
    metadata: {
      workspaceId: projectId,
      schemaVersion: 1,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    entries: [readmeEntry, appEntry],
  };

  const mdEntry: StructuredKnowledgeEntry = {
    entryId: `${projectId}:docs/readme.md#sec:1:Intro:1`,
    projectId,
    relativePath: 'docs/readme.md',
    kind: 'markdown-section',
    headingLevel: 1,
    headingText: 'Intro',
    headingPath: ['Intro'],
    startLine: 1,
    endLine: 5,
    content: '# Intro',
  };

  const codeEntry: StructuredKnowledgeEntry = {
    entryId: `${projectId}:src/app.ts#sym:class:App:1`,
    projectId,
    relativePath: 'src/app.ts',
    kind: 'code-symbol',
    symbolKind: 'class',
    symbolName: 'App',
    containerName: '',
    signature: 'class App',
    startLine: 1,
    endLine: 10,
  };

  function createMockEnvironment() {
    const markdownExtractor: MarkdownSectionExtractorPort = {
      extract: vi.fn().mockReturnValue([mdEntry]),
    };
    const codeSymbolExtractor: CodeSymbolExtractorPort = {
      supports: vi.fn((path) => path.endsWith('.ts')),
      extract: vi.fn().mockReturnValue([codeEntry]),
    };
    const fileReader: KnowledgeFileReaderPort = {
      readFileContent: vi.fn().mockResolvedValue('file-content'),
    };
    const storeState = new Map<string, StructuredKnowledgeIndex>();
    const store: StructuredKnowledgeIndexStore = {
      load: vi.fn(async (id) => storeState.get(id) ?? null),
      save: vi.fn(async (index) => {
        storeState.set(index.metadata.projectId, index);
      }),
      remove: vi.fn(async (id) => {
        storeState.delete(id);
      }),
    };

    const extractorService = new KnowledgeExtractionService(
      markdownExtractor,
      codeSymbolExtractor,
      fileReader
    );
    const buildUseCase = new BuildStructuredKnowledgeIndexUseCase(extractorService, store);
    const refreshUseCase = new RefreshStructuredKnowledgeIndexUseCase(
      extractorService,
      store,
      buildUseCase
    );

    return { markdownExtractor, codeSymbolExtractor, fileReader, store, buildUseCase, refreshUseCase };
  }

  it('builds full structured knowledge index', async () => {
    const { buildUseCase, store, fileReader } = createMockEnvironment();
    const index = await buildUseCase.execute(sampleRepoIndex);

    expect(index.metadata.totalEntries).toBe(2);
    expect(index.metadata.markdownSectionCount).toBe(1);
    expect(index.metadata.codeSymbolCount).toBe(1);
    expect(index.entries).toHaveLength(2);
    expect(fileReader.readFileContent).toHaveBeenCalledTimes(2);
    expect(await store.load(projectId)).toEqual(index);
  });

  it('refreshes with no changes without reading or re-extracting unchanged files', async () => {
    const { buildUseCase, refreshUseCase, fileReader } = createMockEnvironment();
    await buildUseCase.execute(sampleRepoIndex);
    vi.clearAllMocks();

    const changeSet: RepositoryIndexChangeSet = {
      added: [],
      modified: [],
      deleted: [],
      unchangedCount: 2,
    };

    const refreshed = await refreshUseCase.execute(projectId, changeSet, sampleRepoIndex);
    expect(refreshed.entries).toHaveLength(2);
    expect(fileReader.readFileContent).not.toHaveBeenCalled();
  });

  it('replaces only modified files during refresh', async () => {
    const { buildUseCase, refreshUseCase, fileReader, codeSymbolExtractor } = createMockEnvironment();
    await buildUseCase.execute(sampleRepoIndex);
    vi.clearAllMocks();

    const updatedCodeEntry: StructuredKnowledgeEntry = {
      ...codeEntry,
      signature: 'class AppUpdated',
    };
    vi.mocked(codeSymbolExtractor.extract).mockReturnValue([updatedCodeEntry]);

    const changeSet: RepositoryIndexChangeSet = {
      added: [],
      modified: [appEntry],
      deleted: [],
      unchangedCount: 1,
    };

    const refreshed = await refreshUseCase.execute(projectId, changeSet, sampleRepoIndex);
    expect(refreshed.entries).toHaveLength(2);
    expect(fileReader.readFileContent).toHaveBeenCalledTimes(1);
    expect(fileReader.readFileContent).toHaveBeenCalledWith(projectId, 'src/app.ts');
    expect(refreshed.entries.find((e) => e.relativePath === 'src/app.ts')).toEqual(updatedCodeEntry);
  });

  it('removes deleted files from index', async () => {
    const { buildUseCase, refreshUseCase, fileReader } = createMockEnvironment();
    await buildUseCase.execute(sampleRepoIndex);
    vi.clearAllMocks();

    const changeSet: RepositoryIndexChangeSet = {
      added: [],
      modified: [],
      deleted: [readmeEntry],
      unchangedCount: 1,
    };

    const refreshed = await refreshUseCase.execute(projectId, changeSet, sampleRepoIndex);
    expect(refreshed.entries).toHaveLength(1);
    expect(refreshed.entries[0].relativePath).toBe('src/app.ts');
    expect(fileReader.readFileContent).not.toHaveBeenCalled();
  });
});
