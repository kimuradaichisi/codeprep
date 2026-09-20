// src/features/repository-context/domain/request/ContextRequest.ts
import type { ContextIntent } from './ContextIntent';
import type { ContextAnchor } from './ContextAnchor';
import type { ContextScope } from './ContextScope';

export type ContextConstraints = Readonly<{
  excludedPaths?: readonly string[];
  maxFiles?: number;
  includeTests?: boolean;
  includeDocs?: boolean;
}>;

export type ContextBudgetOverride = Readonly<{
  tokenLimit?: number;
  maxFiles?: number;
}>;

export interface ContextRequest {
  readonly intent: ContextIntent;
  readonly goal: string;
  readonly anchors: readonly ContextAnchor[];
  readonly scope: ContextScope;
  readonly constraints?: ContextConstraints;
  readonly budget?: ContextBudgetOverride;
}

export interface CreateContextRequestParams {
  readonly intent?: ContextIntent;
  readonly goal: string;
  readonly anchors?: readonly ContextAnchor[];
  readonly scope?: ContextScope;
  readonly constraints?: ContextConstraints;
  readonly budget?: ContextBudgetOverride;
}

export function createContextRequest(params: CreateContextRequestParams): ContextRequest {
  if (!params.goal || !params.goal.trim()) {
    throw new Error('ContextRequest goal must not be empty.');
  }
  return Object.freeze({
    intent: params.intent ?? 'change',
    goal: params.goal.trim(),
    anchors: Object.freeze(params.anchors ? [...params.anchors] : []),
    scope: params.scope ?? Object.freeze({ kind: 'auto' }),
    constraints: params.constraints ? Object.freeze({ ...params.constraints }) : undefined,
    budget: params.budget ? Object.freeze({ ...params.budget }) : undefined,
  });
}

export function createLegacyTaskRequest(task: string, overrides?: Partial<CreateContextRequestParams>): ContextRequest {
  return createContextRequest({
    intent: 'change',
    goal: task,
    anchors: overrides?.anchors ?? [],
    scope: overrides?.scope ?? { kind: 'auto' },
    constraints: overrides?.constraints,
    budget: overrides?.budget,
  });
}
