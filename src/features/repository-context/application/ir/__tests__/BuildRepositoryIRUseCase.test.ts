import { describe, expect, it } from 'vitest';
import type { RepositoryIndex } from '../../../domain/RepositoryIndex';
import type { StructuredKnowledgeIndex } from '../../../domain/StructuredKnowledgeIndex';
import { createRepositorySnapshot } from '../../../domain/ir';
import { BuildRepositoryIRUseCase } from '../BuildRepositoryIRUseCase';

describe('BuildRepositoryIRUseCase', () => {
  const snapshot = createRepositorySnapshot({
    snapshotId: 'snap-2026',
    repositoryId: 'codeprep',
    workspaceRoot: '/workspaces/codeprep',
    createdAt: '2026-09-13T00:00:00Z',
  });

  const useCase = new BuildRepositoryIRUseCase();

  it('integrates multiple producers into a consistent RepositoryIR aggregate', () => {
    const repositoryIndex: RepositoryIndex = {
      metadata: { workspaceId: 'codeprep', schemaVersion: 1, createdAt: '', updatedAt: '' },
      entries: [
        { projectId: 'codeprep', relativePath: 'src/main.ts', kind: 'code', size: 100, contentHash: 'h1' },
        { projectId: 'codeprep', relativePath: 'src/util.ts', kind: 'code', size: 50, contentHash: 'h2' },
      ],
    };

    const skIndex: StructuredKnowledgeIndex = {
      metadata: {
        projectId: 'codeprep',
        indexedAt: '',
        schemaVersion: 1,
        totalEntries: 1,
        markdownSectionCount: 0,
        codeSymbolCount: 1,
      },
      entries: [
        {
          entryId: 'e-sym',
          projectId: 'codeprep',
          relativePath: 'src/main.ts',
          kind: 'code-symbol',
          symbolName: 'bootstrap',
          symbolKind: 'function',
          startLine: 1,
          endLine: 10,
          signature: 'function bootstrap(): void',
        },
      ],
    };

    const dependencies = [{ fromPath: 'src/main.ts', toPath: 'src/util.ts' }];
    const gitCoChanges = [{ fromPath: 'src/main.ts', toPath: 'src/util.ts', count: 4 }];

    const ir = useCase.execute({
      snapshot,
      repositoryIndex,
      structuredKnowledgeIndex: skIndex,
      dependencies,
      gitCoChanges,
    });

    expect(ir.snapshot.snapshotId).toBe('snap-2026');
    expect(ir.nodes.size).toBe(3); // 2 file nodes + 1 symbol node
    expect(ir.edges).toHaveLength(3); // 1 contains + 1 depends-on + 1 co-changed-with

    const symNode = Array.from(ir.nodes.values()).find(n => n.kind === 'symbol');
    expect(symNode?.name).toBe('bootstrap');

    const containsEdge = ir.edges.find(e => e.relationType === 'contains');
    expect(containsEdge?.sourceNodeId).toBe('node:snap-2026:file:src/main.ts');
    expect(containsEdge?.targetNodeId).toBe(symNode?.id);
  });
});
