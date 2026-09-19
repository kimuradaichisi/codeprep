// src/features/repository-context/domain/workingset/RecallReserveCollector.ts
/*
 * Copyright 2026 CodePrep Contributors
 */
import type { WorkingSetCandidate } from './WorkingSetCandidate';
import { RoleAssigner } from './RoleAssigner';
import { CandidateClassifier } from './CandidateClassifier';
import { estimateTokens } from './WorkingSetBudget';

export interface LegacyCandidateInput {
  readonly relativePath: string;
  readonly score: number;
  readonly reasons: readonly string[];
  readonly matchedTerms?: readonly string[];
}

export interface CollectRecallReserveOptions {
  readonly maxRecallReserve?: number;
  readonly maxDocsInReserve?: number;
  readonly task?: string;
}

export class RecallReserveCollector {
  public static collect(
    graphCandidates: readonly WorkingSetCandidate[],
    legacyCandidates: readonly LegacyCandidateInput[],
    options?: CollectRecallReserveOptions
  ): readonly WorkingSetCandidate[] {
    const maxReserve = options?.maxRecallReserve ?? 3;
    const maxDocs = options?.maxDocsInReserve ?? 3;
    const existingPaths = new Set(graphCandidates.map((c) => c.path.replace(/\\/g, '/')));
    const taskTokens = this.extractTokens(options?.task);

    const sortedLegacy = [...legacyCandidates].sort(
      (a, b) => this.calculateLegacyWeight(b, taskTokens) - this.calculateLegacyWeight(a, taskTokens)
    );
    const reserves: WorkingSetCandidate[] = [];
    const state = { docCount: 0, roleCounts: new Map<string, number>() };

    for (const leg of sortedLegacy) {
      if (reserves.length >= maxReserve) break;
      this.tryAddReserve(leg, maxDocs, existingPaths, state, reserves);
    }

    return Object.freeze(reserves);
  }

  private static tryAddReserve(
    leg: LegacyCandidateInput,
    maxDocs: number,
    existingPaths: Set<string>,
    state: { docCount: number; roleCounts: Map<string, number> },
    reserves: WorkingSetCandidate[]
  ): void {
    const normalizedPath = leg.relativePath.replace(/\\/g, '/');
    if (existingPaths.has(normalizedPath)) return;

    const isDoc = this.isDocument(normalizedPath);
    if (isDoc && state.docCount >= maxDocs) return;

    const role = RoleAssigner.assignRole({ path: normalizedPath });
    const currentRoleCount = state.roleCounts.get(role) ?? 0;
    if (currentRoleCount >= 2) return;

    const normalizedLeg = normalizedPath === leg.relativePath ? leg : { ...leg, relativePath: normalizedPath };
    reserves.push(this.buildReserveCandidate(normalizedLeg, role));
    existingPaths.add(normalizedPath);
    state.roleCounts.set(role, currentRoleCount + 1);
    if (isDoc) state.docCount++;
  }

  private static isDocument(path: string): boolean {
    const lower = path.toLowerCase();
    return lower.endsWith('.md') || lower.includes('/docs/') || lower.startsWith('docs/');
  }

  private static buildReserveCandidate(
    leg: LegacyCandidateInput,
    assignedRole?: ReturnType<typeof RoleAssigner.assignRole>
  ): WorkingSetCandidate {
    const role = assignedRole ?? RoleAssigner.assignRole({ path: leg.relativePath });
    const { tier, priority } = CandidateClassifier.classify({
      role,
      score: leg.score,
      isLegacyReserve: true,
    });

    return {
      nodeId: `legacy:${leg.relativePath}`,
      path: leg.relativePath,
      role,
      tier,
      score: leg.score,
      priority,
      estimatedTokens: estimateTokens(1500),
      estimatedBytes: 1500,
      reasons: Object.freeze(['legacy recall reserve', ...leg.reasons]),
      relationPaths: Object.freeze([]),
      provenance: 'legacy-candidate',
      nodeKind: this.isDocument(leg.relativePath) ? 'doc' : 'file',
    };
  }

  private static extractTokens(text?: string): readonly string[] {
    if (!text) return [];
    const matches = text.match(/[a-zA-Z0-9_-]{3,}/g);
    return matches ? matches.map((m) => m.toLowerCase()) : [];
  }

  private static calculateLegacyWeight(leg: LegacyCandidateInput, taskTokens: readonly string[]): number {
    let weight = leg.score;
    if (leg.reasons.includes('exactFilenameMatch')) weight += 200;
    if (leg.reasons.includes('filenameMatch')) weight += 50;
    if (leg.reasons.includes('headingMatch')) weight += 30;
    if (leg.matchedTerms && leg.matchedTerms.length > 0) {
      weight += leg.matchedTerms.length * 10;
    }
    const lowerPath = leg.relativePath.toLowerCase();
    for (const t of taskTokens) {
      if (lowerPath.includes(t)) weight += 40;
    }
    return weight;
  }
}
