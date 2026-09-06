import { describe, expect, it, vi } from 'vitest';
import type { Project } from '../../domain/Project';
import { SemanticEntryPointCandidateSource } from '../SemanticEntryPointCandidateSource';
import type { SemanticSearchHit, SemanticSearchUseCase } from '../SemanticSearchUseCase';

describe('SemanticEntryPointCandidateSource', () => {
  const project: Project = {
    id: 'proj-1',
    name: 'Project 1',
    rootPath: '/app',
    excludePatterns: [],
  };

  it('aggregates multiple hits of the same file into a single evidence with max score', async () => {
    const hits: SemanticSearchHit[] = [
      {
        projectId: 'proj-1',
        relativePath: 'docs/refund.md',
        knowledgeEntryId: 'k1',
        knowledgeKind: 'markdown-section',
        score: 0.85,
      },
      {
        projectId: 'proj-1',
        relativePath: 'docs/refund.md',
        knowledgeEntryId: 'k2',
        knowledgeKind: 'markdown-section',
        score: 0.92,
      },
      {
        projectId: 'proj-1',
        relativePath: 'src/OrderService.ts',
        knowledgeEntryId: 'k3',
        knowledgeKind: 'code-symbol',
        score: 0.78,
      },
    ];

    const mockSearchUseCase = {
      execute: vi.fn().mockResolvedValue(hits),
    } as unknown as SemanticSearchUseCase;

    const source = new SemanticEntryPointCandidateSource(mockSearchUseCase, 'ws-1');
    const evidences = await source.discover(project, ['refund'], 'Task: 二重返金の防止');

    expect(evidences).toHaveLength(2);
    expect(evidences[0]).toEqual({
      projectId: 'proj-1',
      relativePath: 'docs/refund.md',
      reason: 'semanticMatch',
    });
    expect(evidences[1]).toEqual({
      projectId: 'proj-1',
      relativePath: 'src/OrderService.ts',
      reason: 'semanticMatch',
    });
  });

  it('returns empty array gracefully if search fails', async () => {
    const mockSearchUseCase = {
      execute: vi.fn().mockRejectedValue(new Error('Embedding provider unreachable')),
    } as unknown as SemanticSearchUseCase;

    const source = new SemanticEntryPointCandidateSource(mockSearchUseCase, 'ws-1');
    const evidences = await source.discover(project, ['refund']);
    expect(evidences).toEqual([]);
  });
});
