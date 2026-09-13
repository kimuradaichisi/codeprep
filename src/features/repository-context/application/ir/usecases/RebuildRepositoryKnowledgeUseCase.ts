import type { BuildRepositoryKnowledgeInput, BuildRepositoryKnowledgeResult } from './BuildRepositoryKnowledgeUseCase';
import { BuildRepositoryKnowledgeUseCase } from './BuildRepositoryKnowledgeUseCase';

export interface RebuildRepositoryKnowledgeInput extends BuildRepositoryKnowledgeInput {
  readonly pruneOldSnapshots?: boolean;
}

export class RebuildRepositoryKnowledgeUseCase {
  constructor(private readonly buildUseCase = new BuildRepositoryKnowledgeUseCase()) {}

  public async execute(input: RebuildRepositoryKnowledgeInput): Promise<BuildRepositoryKnowledgeResult> {
    const prevSnapshot = await input.store.findLatest(input.snapshot.repositoryId);
    const result = await this.buildUseCase.execute(input);

    if (input.pruneOldSnapshots && prevSnapshot && prevSnapshot.snapshotId !== input.snapshot.snapshotId) {
      try {
        await input.store.deleteSnapshot(prevSnapshot.snapshotId);
      } catch {
        // Safe prune failure; newly saved snapshot remains the active latest
      }
    }

    return result;
  }
}
