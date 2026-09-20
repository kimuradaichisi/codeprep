// src/features/repository-context/application/projection/PrepareContextProjectionUseCase.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { Project } from '../../domain/Project';
import type { ContextRequest } from '../../domain/request/ContextRequest';
import type { ContextProjection } from '../../domain/projection/ContextProjection';
import type { ContextPackV2 } from '../../domain/workingset';
import type { PrepareContextPackV2UseCase } from '../workingset/PrepareContextPackV2UseCase';
import { QueryInputCompiler } from '../request/QueryInputCompiler';
import { ChangeContextProjectionPolicy } from './ChangeContextProjectionPolicy';

export interface PrepareContextProjectionInput {
  readonly project: Project;
  readonly request: ContextRequest;
  readonly snapshotId: string;
  readonly includeLegacyCandidates?: boolean;
}

export interface PrepareContextProjectionOutput {
  readonly projection: ContextProjection;
  readonly contextPackV2: ContextPackV2;
}

/**
 * ContextRequest から ContextPackV2 を生成し、
 * さらに ContextProjection へ射影して双方を提供するユースケース。
 */
export class PrepareContextProjectionUseCase {
  constructor(
    private readonly packV2UseCase: PrepareContextPackV2UseCase
  ) {}

  public async execute(
    input: PrepareContextProjectionInput
  ): Promise<PrepareContextProjectionOutput> {
    const compiled = QueryInputCompiler.compile(input.request);

    const contextPackV2 = await this.packV2UseCase.execute({
      project: input.project,
      task: compiled.taskQueryText,
      snapshotId: input.snapshotId,
      explicitPaths: compiled.explicitPaths,
      budget: compiled.budgetOverride,
      includeLegacyCandidates: input.includeLegacyCandidates,
    });

    const projection = ChangeContextProjectionPolicy.project(
      input.request,
      contextPackV2,
      compiled
    );

    return {
      projection,
      contextPackV2,
    };
  }
}
