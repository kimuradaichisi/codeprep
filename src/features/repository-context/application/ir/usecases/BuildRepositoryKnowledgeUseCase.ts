import type { RepositoryIR } from '../../../domain/ir';
import type { BuildRepositoryIRInput } from '../BuildRepositoryIRUseCase';
import { BuildRepositoryIRUseCase } from '../BuildRepositoryIRUseCase';
import type { RepositoryKnowledgeStore } from '../persistence/RepositoryKnowledgeStore';

export interface BuildRepositoryKnowledgeInput extends BuildRepositoryIRInput {
  readonly store: RepositoryKnowledgeStore;
}

export interface BuildRepositoryKnowledgeResult {
  readonly ir: RepositoryIR;
  readonly savedAt: string;
}

export class BuildRepositoryKnowledgeUseCase {
  constructor(private readonly irUseCase = new BuildRepositoryIRUseCase()) {}

  public async execute(input: BuildRepositoryKnowledgeInput): Promise<BuildRepositoryKnowledgeResult> {
    const ir = this.irUseCase.execute(input);
    await input.store.save(ir);
    return Object.freeze({
      ir,
      savedAt: new Date().toISOString(),
    });
  }
}
