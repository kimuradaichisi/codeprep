// src/features/repository-context/domain/EntryPointCandidateScorer.ts
import type {
  EntryPointCandidate,
  EntryPointCandidateEvidence,
  EntryPointCandidateReason,
} from './EntryPointCandidate';
import { resolveCandidateKind } from './EntryPointCandidate';

export const REASON_WEIGHTS: Readonly<Record<EntryPointCandidateReason, number>> = {
  exactFilenameMatch: 100,
  manualPin: 100,
  symbolLikeMatch: 70,
  filenameMatch: 60,
  headingMatch: 45,
  semanticMatch: 40,
  textMatch: 35,
  pathMatch: 25,
};

export const calculateCandidateScore = (
  reasons: readonly EntryPointCandidateReason[],
  customWeights?: Partial<Record<EntryPointCandidateReason, number>>
): number => {
  const uniqueReasons = new Set(reasons);
  let total = 0;
  for (const reason of uniqueReasons) {
    total += customWeights?.[reason] ?? REASON_WEIGHTS[reason] ?? 0;
  }
  return total;
};

type MergedMapEntry = {
  projectId: string;
  relativePath: string;
  reasons: Set<EntryPointCandidateReason>;
  matchedTerms: Set<string>;
};

const aggregateEvidences = (evidences: readonly EntryPointCandidateEvidence[]): Map<string, MergedMapEntry> => {
  const map = new Map<string, MergedMapEntry>();
  for (const ev of evidences) {
    const key = `${ev.projectId}:${ev.relativePath}`;
    const existing = map.get(key) ?? {
      projectId: ev.projectId,
      relativePath: ev.relativePath,
      reasons: new Set<EntryPointCandidateReason>(),
      matchedTerms: new Set<string>(),
    };
    existing.reasons.add(ev.reason);
    if (ev.matchedTerm) existing.matchedTerms.add(ev.matchedTerm);
    map.set(key, existing);
  }
  return map;
};

export const mergeCandidateEvidences = (
  evidences: readonly EntryPointCandidateEvidence[],
  customWeights?: Partial<Record<EntryPointCandidateReason, number>>
): readonly EntryPointCandidate[] => {
  const aggregated = aggregateEvidences(evidences);
  const result: EntryPointCandidate[] = [];
  for (const item of aggregated.values()) {
    const reasons = Object.freeze(Array.from(item.reasons));
    const matchedTerms = Object.freeze(Array.from(item.matchedTerms));
    const score = calculateCandidateScore(reasons, customWeights);
    const kind = resolveCandidateKind(item.relativePath);
    result.push({
      projectId: item.projectId,
      relativePath: item.relativePath,
      score,
      reasons,
      matchedTerms,
      kind,
    });
  }
  return Object.freeze(result);
};

export const sortEntryPointCandidates = (
  candidates: readonly EntryPointCandidate[]
): readonly EntryPointCandidate[] => {
  return Object.freeze(
    [...candidates].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aExact = a.reasons.includes('exactFilenameMatch') ? 1 : 0;
      const bExact = b.reasons.includes('exactFilenameMatch') ? 1 : 0;
      if (bExact !== aExact) return bExact - aExact;
      return a.relativePath.localeCompare(b.relativePath);
    })
  );
};

export const filterEntryPointCandidates = (
  candidates: readonly EntryPointCandidate[],
  maxCandidates = 20
): readonly EntryPointCandidate[] => {
  const nonExcluded = candidates.filter((c) => !isIgnoredCandidate(c.relativePath));
  const sorted = sortEntryPointCandidates(nonExcluded);
  return Object.freeze(sorted.slice(0, maxCandidates));
};

const isIgnoredCandidate = (path: string): boolean => {
  const lower = path.toLowerCase();
  return (
    lower.startsWith('node_modules/') ||
    lower.startsWith('dist/') ||
    lower.startsWith('out/') ||
    lower.startsWith('.git/') ||
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.ico') ||
    lower.endsWith('.lock')
  );
};
