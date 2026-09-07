// apps/desktop/TaskContextStrategyResolver.ts
import type { AdaptiveStrategyOverride, AdaptivePackMode } from '../../src/features/repository-context/domain/ContextConfidence';
import type { ProjectRegistryStore } from '../../src/features/repository-context/infrastructure/filesystem/ProjectRegistryStore';
import type { Project } from '../../src/features/repository-context/domain/Project';
import { DiscoverEntryPointCandidatesUseCase } from '../../src/features/repository-context/application/DiscoverEntryPointCandidatesUseCase';
import { EnrichEntryPointCandidatesUseCase } from '../../src/features/repository-context/application/EnrichEntryPointCandidatesUseCase';
import { evaluateContextConfidence } from '../../src/features/repository-context/domain/ContextConfidenceEvaluator';
import { resolveAdaptivePackMode } from '../../src/features/repository-context/application/AdaptiveContextStrategy';
import { createDiscoveryPorts, createEnrichmentPorts } from './EntryPointDiscoveryHandler';

export const resolveTaskContextStrategy = async (
  registry: ProjectRegistryStore,
  project: Project,
  task: string,
  strategy?: AdaptiveStrategyOverride,
): Promise<AdaptivePackMode> => {
  if (strategy && strategy !== 'auto') return strategy;
  const discUseCase = new DiscoverEntryPointCandidatesUseCase(createDiscoveryPorts(registry));
  const enrichUseCase = new EnrichEntryPointCandidatesUseCase(createEnrichmentPorts(registry));

  const disc = await discUseCase.execute({ task, projectIds: [project.id], maxCandidates: 10 });
  const enriched = await enrichUseCase.execute({
    task,
    projectIds: [project.id],
    candidates: disc.candidates,
    options: { enrichTopN: 5 },
  });
  const confidence = evaluateContextConfidence({ candidates: enriched });
  return resolveAdaptivePackMode(confidence);
};
