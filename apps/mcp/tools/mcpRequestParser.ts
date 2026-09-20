// apps/mcp/tools/mcpRequestParser.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { ContextRequest } from '../../../src/features/repository-context/domain/request/ContextRequest';
import { createContextRequest } from '../../../src/features/repository-context/domain/request/ContextRequest';
import type { ContextIntent } from '../../../src/features/repository-context/domain/request/ContextIntent';
import { isValidContextIntent } from '../../../src/features/repository-context/domain/request/ContextIntent';
import type { ContextAnchor } from '../../../src/features/repository-context/domain/request/ContextAnchor';
import {
  createFileAnchor,
  createSymbolAnchor,
  createTextAnchor,
  createDirectoryAnchor,
} from '../../../src/features/repository-context/domain/request/ContextAnchor';
import type { ContextScope } from '../../../src/features/repository-context/domain/request/ContextScope';
import type { WorkingSetBudget } from '../../../src/features/repository-context/domain/workingset';
import { createWorkingSetBudget } from '../../../src/features/repository-context/domain/workingset/WorkingSetBudget';

export interface ParsedMcpPrepareInput {
  readonly request: ContextRequest;
  readonly task: string;
  readonly strategy?: 'fast' | 'standard' | 'knowledge';
  readonly budget?: WorkingSetBudget;
  readonly explicitPaths?: readonly string[];
  readonly projection?: boolean;
  readonly maxCandidates?: number;
  readonly enrichTopN?: number;
  readonly tokenLimit?: number;
}

export class McpRequestParser {
  public static parse(raw: unknown): ParsedMcpPrepareInput {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Input must be an object');
    }
    const val = raw as Record<string, unknown>;
    const goal = this.resolveGoal(val);
    const budget = this.resolveBudget(val.budget);
    const explicitPaths = this.resolveExplicitPaths(val.explicitPaths);
    const request = createContextRequest({
      intent: this.resolveIntent(val.intent),
      goal,
      anchors: this.resolveAnchors(val),
      scope: this.resolveScope(val.scope),
      budget: budget ? { maxFiles: budget.maxFiles, tokenLimit: budget.maxEstimatedTokens } : undefined,
    });
    return this.buildResult(val, request, goal, budget, explicitPaths);
  }

  private static buildResult(
    val: Record<string, unknown>,
    request: ContextRequest,
    goal: string,
    budget?: WorkingSetBudget,
    explicitPaths?: readonly string[]
  ): ParsedMcpPrepareInput {
    const strategy = this.resolveStrategy(val.strategy);
    return Object.freeze({
      request,
      task: goal,
      strategy,
      budget,
      explicitPaths,
      projection: Boolean(val.projection),
      maxCandidates: typeof val.maxCandidates === 'number' ? Math.min(Math.max(val.maxCandidates, 1), 50) : 10,
      enrichTopN: typeof val.enrichTopN === 'number' ? Math.max(val.enrichTopN, 1) : 5,
      tokenLimit: typeof val.tokenLimit === 'number' ? Math.max(val.tokenLimit, 1000) : 40000,
    });
  }

  private static resolveGoal(val: Record<string, unknown>): string {
    const rawGoal = typeof val.goal === 'string' && val.goal.trim() ? val.goal.trim() : undefined;
    const rawTask = typeof val.task === 'string' && val.task.trim() ? val.task.trim() : undefined;
    const candidate = rawGoal ?? rawTask;
    if (!candidate) {
      throw new Error('Field task must be a non-empty string');
    }
    return candidate;
  }

  private static resolveIntent(intentRaw: unknown): ContextIntent {
    if (typeof intentRaw !== 'string' || !intentRaw.trim()) return 'change';
    const normalized = intentRaw.trim().toLowerCase();
    if (!isValidContextIntent(normalized)) {
      throw new Error(`Invalid intent: ${intentRaw}. Supported intents: change, review, understand, impact, investigate, document, test`);
    }
    return normalized;
  }

  private static resolveAnchors(val: Record<string, unknown>): readonly ContextAnchor[] {
    const anchors: ContextAnchor[] = [];
    if (Array.isArray(val.anchors)) {
      for (const item of val.anchors) {
        if (!item || typeof item !== 'object') continue;
        const a = item as Record<string, unknown>;
        if (a.kind === 'file' && typeof a.path === 'string') {
          anchors.push(createFileAnchor(a.path));
        } else if (a.kind === 'symbol' && typeof a.name === 'string') {
          anchors.push(createSymbolAnchor(a.name, typeof a.filePath === 'string' ? a.filePath : undefined));
        } else if (a.kind === 'text' && typeof a.text === 'string') {
          anchors.push(createTextAnchor(a.text));
        } else if (a.kind === 'directory' && typeof a.path === 'string') {
          anchors.push(createDirectoryAnchor(a.path));
        }
      }
    }
    if (Array.isArray(val.explicitPaths)) {
      for (const p of val.explicitPaths) {
        if (typeof p === 'string' && p.trim() && !anchors.some((a) => a.kind === 'file' && a.path === p.trim())) {
          anchors.push(createFileAnchor(p.trim()));
        }
      }
    }
    return Object.freeze(anchors);
  }

  private static resolveScope(scopeRaw: unknown): ContextScope {
    if (!scopeRaw || typeof scopeRaw !== 'object') return { kind: 'auto' };
    const s = scopeRaw as Record<string, unknown>;
    const kind = typeof s.kind === 'string' ? s.kind.toLowerCase() : 'auto';
    const targetPath = typeof s.path === 'string' ? s.path : (typeof s.target === 'string' ? s.target : '');
    if (kind === 'repository' || kind === 'repo') return { kind: 'repository' };
    if (kind === 'directory' || kind === 'dir') return { kind: 'directory', path: targetPath };
    if (kind === 'file') return { kind: 'file', path: targetPath };
    if (kind === 'feature') return { kind: 'feature', name: typeof s.name === 'string' ? s.name : targetPath };
    return { kind: 'auto' };
  }

  private static resolveBudget(budgetRaw: unknown): WorkingSetBudget | undefined {
    if (!budgetRaw || typeof budgetRaw !== 'object') return undefined;
    const b = budgetRaw as Record<string, unknown>;
    const maxFiles = typeof b.maxFiles === 'number' ? Math.max(1, b.maxFiles) : undefined;
    const maxTokens = typeof b.maxTokens === 'number' ? Math.max(500, b.maxTokens) : undefined;
    if (maxFiles === undefined && maxTokens === undefined) return undefined;
    return createWorkingSetBudget({ maxFiles, maxEstimatedTokens: maxTokens });
  }

  private static resolveExplicitPaths(raw: unknown): readonly string[] | undefined {
    if (!Array.isArray(raw)) return undefined;
    const paths = raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    return paths.length > 0 ? Object.freeze(paths) : undefined;
  }

  private static resolveStrategy(raw: unknown): 'fast' | 'standard' | 'knowledge' | undefined {
    return (raw === 'knowledge' || raw === 'fast' || raw === 'standard') ? raw : undefined;
  }
}
