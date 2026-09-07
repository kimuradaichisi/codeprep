// src/features/repository-context/application/__tests__/PrepareTaskContextUseCase.test.ts
import { describe, expect, it, vi } from 'vitest';
import { PrepareTaskContextUseCase } from '../PrepareTaskContextUseCase';
import type { DiscoverEntryPointCandidatesUseCase } from '../DiscoverEntryPointCandidatesUseCase';
import type { EnrichEntryPointCandidatesUseCase } from '../EnrichEntryPointCandidatesUseCase';
import type { BuildTaskContextUseCase } from '../BuildTaskContextUseCase';
import type { ContextFormatterPort, FileContentPort } from '../ports';
import { Project } from '../../domain/Project';

describe('PrepareTaskContextUseCase', () => {
  const project: Project = { id: 'p1', name: 'TestProject', rootPath: 'D:/workspace' };

  const makeMockDiscover = (candidates: any[]) => ({
    execute: vi.fn().mockResolvedValue({ candidates, diagnostics: [] }),
  }) as unknown as DiscoverEntryPointCandidatesUseCase;

  const makeMockEnrich = (candidates: any[]) => ({
    execute: vi.fn().mockResolvedValue(candidates),
  }) as unknown as EnrichEntryPointCandidatesUseCase;

  const makeMockBuild = () => ({
    execute: vi.fn().mockResolvedValue({
      manifest: {
        projectId: 'p1',
        task: 'test',
        entryPoints: ['src/a.ts'],
        entries: [{ relativePath: 'src/a.ts', role: 'target', size: 100 }],
        budget: { bytes: 400, estimatedTokens: 100, limit: 40000, marginReserve: 0, withinLimit: true },
      },
      warnings: [],
    }),
  }) as unknown as BuildTaskContextUseCase;

  const makeMockContentPort = () => ({
    read: vi.fn().mockResolvedValue('export const a = 1;'),
  }) as unknown as FileContentPort;

  const makeMockFormatter = () => ({
    format: vi.fn().mockReturnValue('## src/a.ts\n```ts\nexport const a = 1;\n```'),
  }) as unknown as ContextFormatterPort;

  const makeCandidate = (file: string, score: number, supportScore: number) => ({
    candidate: { projectId: 'p1', relativePath: file, score, reasons: ['exactFilenameMatch'], matchedTerms: ['test'] },
    evidence: [],
    supportScore,
  });

  it('generates fast pack automatically when confidence is high', async () => {
    const highCandidates = [
      makeCandidate('src/a.ts', 100, 90),
      makeCandidate('src/b.ts', 20, 10),
    ];

    const useCase = new PrepareTaskContextUseCase({
      project,
      discoverUseCase: makeMockDiscover(highCandidates),
      enrichUseCase: makeMockEnrich(highCandidates),
      buildContextUseCase: makeMockBuild(),
      fileContentPort: makeMockContentPort(),
      formatter: makeMockFormatter(),
    });

    const result = await useCase.execute({ task: 'Fix specific bug in a.ts' });

    expect(result.decision.decision).toBe('AUTO_FAST_PACK');
    expect(result.decision.requiresSelection).toBe(false);
    expect(result.contextPack).toBeDefined();
    expect(result.contextPack?.content).toContain('src/a.ts');
  });

  it('requires selection without context pack when confidence is medium or low', async () => {
    const mediumCandidates = [
      makeCandidate('src/a.ts', 60, 40),
      makeCandidate('src/b.ts', 58, 38),
    ];
    const useCase = new PrepareTaskContextUseCase({
      project,
      discoverUseCase: makeMockDiscover(mediumCandidates),
      enrichUseCase: makeMockEnrich(mediumCandidates),
      buildContextUseCase: makeMockBuild(),
      fileContentPort: makeMockContentPort(),
      formatter: makeMockFormatter(),
    });

    const result = await useCase.execute({ task: 'Explore something ambiguous' });

    expect(result.decision.decision).toBe('MANUAL_SELECTION_REQUIRED');
    expect(result.decision.requiresSelection).toBe(true);
    expect(result.contextPack).toBeUndefined();
  });
});
