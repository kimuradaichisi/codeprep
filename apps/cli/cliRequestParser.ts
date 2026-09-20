// apps/cli/cliRequestParser.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { ContextRequest } from '../../src/features/repository-context/domain/request/ContextRequest';
import { createContextRequest } from '../../src/features/repository-context/domain/request/ContextRequest';
import type { ContextIntent } from '../../src/features/repository-context/domain/request/ContextIntent';
import { isValidContextIntent } from '../../src/features/repository-context/domain/request/ContextIntent';
import type { ContextAnchor } from '../../src/features/repository-context/domain/request/ContextAnchor';
import { createFileAnchor, createSymbolAnchor } from '../../src/features/repository-context/domain/request/ContextAnchor';
import type { ContextScope } from '../../src/features/repository-context/domain/request/ContextScope';

export interface RawRequestOptions {
  task?: string;
  goal?: string;
  intent?: string;
  scope?: string;
  scopeTarget?: string;
  fileAnchors?: string[];
  symbolAnchors?: string[];
  maxFiles?: number;
  maxTokens?: number;
  explicitPaths?: string[];
}

export class CliRequestParser {
  public static parse(raw: RawRequestOptions, resolvedTaskFallback?: string): ContextRequest {
    const goal = this.resolveGoal(raw, resolvedTaskFallback);
    const intent = this.resolveIntent(raw.intent);
    const anchors = this.resolveAnchors(raw);
    const scope = this.resolveScope(raw.scope, raw.scopeTarget);
    const budget = this.resolveBudget(raw);

    return createContextRequest({
      intent,
      goal,
      anchors,
      scope,
      budget,
    });
  }

  private static resolveBudget(raw: RawRequestOptions) {
    if (raw.maxFiles === undefined && raw.maxTokens === undefined) {
      return undefined;
    }
    return {
      maxFiles: raw.maxFiles,
      tokenLimit: raw.maxTokens,
    };
  }

  private static resolveGoal(raw: RawRequestOptions, fallback?: string): string {
    const candidate = raw.goal ?? raw.task ?? fallback;
    if (!candidate || candidate.trim().length === 0) {
      throw new Error('Either --task or --task-file must be specified');
    }
    return candidate.trim();
  }

  private static resolveIntent(intentStr?: string): ContextIntent {
    if (!intentStr) return 'change';
    const normalized = intentStr.trim().toLowerCase();
    if (!isValidContextIntent(normalized)) {
      throw new Error(`Invalid intent: ${intentStr}. Supported intents are: change, review, understand, impact, investigate, document, test`);
    }
    return normalized;
  }

  private static resolveAnchors(raw: RawRequestOptions): readonly ContextAnchor[] {
    const anchors: ContextAnchor[] = [];
    if (raw.fileAnchors) {
      for (const f of raw.fileAnchors) {
        anchors.push(createFileAnchor(f));
      }
    }
    if (raw.explicitPaths) {
      for (const p of raw.explicitPaths) {
        if (!anchors.some((a) => a.kind === 'file' && a.path === p)) {
          anchors.push(createFileAnchor(p));
        }
      }
    }
    if (raw.symbolAnchors) {
      for (const s of raw.symbolAnchors) {
        anchors.push(createSymbolAnchor(s));
      }
    }
    return Object.freeze(anchors);
  }

  private static resolveScope(scopeStr?: string, target?: string): ContextScope {
    if (!scopeStr || scopeStr === 'auto') return { kind: 'auto' };
    const s = scopeStr.trim().toLowerCase();
    if (s === 'repo' || s === 'repository') return { kind: 'repository' };
    if (s === 'dir' || s === 'directory') return { kind: 'directory', path: target ?? '' };
    if (s === 'file') return { kind: 'file', path: target ?? '' };
    if (s === 'feature') return { kind: 'feature', name: target ?? '' };
    throw new Error(`Invalid scope: ${scopeStr}. Supported scopes are: auto, file, dir/directory, feature, repo/repository`);
  }
}
