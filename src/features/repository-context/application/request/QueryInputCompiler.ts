// src/features/repository-context/application/request/QueryInputCompiler.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { ContextRequest } from '../../domain/request/ContextRequest';
import type { ContextAnchor, FileAnchor, SymbolAnchor, TextAnchor } from '../../domain/request/ContextAnchor';
import type { ContextScope } from '../../domain/request/ContextScope';
import type { WorkingSetBudget } from '../../domain/workingset';
import { createWorkingSetBudget } from '../../domain/workingset';

export interface CompiledQueryInput {
  readonly taskQueryText: string;
  readonly explicitPaths: readonly string[];
  readonly scopeFilter?: (path: string) => boolean;
  readonly budgetOverride?: WorkingSetBudget;
}

export class QueryInputCompiler {
  public static compile(request: ContextRequest): CompiledQueryInput {
    const anchors = request.anchors ?? [];
    const explicitPaths = this.extractExplicitPaths(anchors);
    const taskQueryText = this.buildTaskQueryText(request.goal ?? '', anchors);
    const scopeFilter = this.buildScopeFilter(request.scope ?? { kind: 'auto' });
    const budgetOverride = this.buildBudgetOverride(request);

    return Object.freeze({
      taskQueryText,
      explicitPaths,
      scopeFilter,
      budgetOverride,
    });
  }

  private static extractExplicitPaths(anchors: readonly ContextAnchor[]): readonly string[] {
    const paths = anchors
      .filter((a): a is FileAnchor => a.kind === 'file')
      .map((a) => a.path.replace(/\\/g, '/').replace(/^\/+/, ''));
    return Object.freeze(Array.from(new Set(paths)));
  }

  private static buildTaskQueryText(goal: string, anchors: readonly ContextAnchor[]): string {
    const additions: string[] = [];

    for (const anchor of anchors) {
      if (anchor.kind === 'text') {
        additions.push((anchor as TextAnchor).text);
      } else if (anchor.kind === 'symbol') {
        additions.push((anchor as SymbolAnchor).name);
      } else if (anchor.kind === 'file') {
        const baseName = (anchor as FileAnchor).path.split(/[\\/]/).pop();
        if (baseName) additions.push(baseName);
      }
    }

    if (additions.length === 0) return goal;
    const uniqueAdditions = Array.from(new Set(additions));
    return `${goal}\n${uniqueAdditions.join(' ')}`.trim();
  }

  private static buildScopeFilter(scope: ContextScope): ((path: string) => boolean) | undefined {
    if (scope.kind === 'auto' || scope.kind === 'repository') {
      return undefined;
    }
    if (scope.kind === 'file') {
      const rawPath = scope.path ?? (scope as any).target ?? '';
      const normalized = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
      return (p: string) => p.replace(/\\/g, '/').replace(/^\/+/, '') === normalized;
    }
    if (scope.kind === 'directory') {
      const rawPath = scope.path ?? (scope as any).target ?? '';
      const normalized = rawPath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
      return (p: string) => {
        const normPath = p.replace(/\\/g, '/').replace(/^\/+/, '');
        return normPath === normalized || normPath.startsWith(`${normalized}/`);
      };
    }
    if (scope.kind === 'feature') {
      const prefix = `src/features/${scope.name}`;
      return (p: string) => p.replace(/\\/g, '/').includes(prefix);
    }
    return undefined;
  }

  private static buildBudgetOverride(request: ContextRequest): WorkingSetBudget | undefined {
    if (!request.budget) return undefined;
    return createWorkingSetBudget({
      maxEstimatedTokens: request.budget.tokenLimit,
      maxFiles: request.budget.maxFiles,
    });
  }
}
