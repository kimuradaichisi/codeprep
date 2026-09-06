import type { ProjectId } from '../domain/Project';
import type { ContextEntry } from '../domain/ContextEntry';
import { createContextEntry } from '../domain/ContextEntry';
import { classifyContextRole } from '../domain/ContextRoleClassifier';
import { rolePriority } from '../domain/ContextRole';
import { scoreCandidate } from '../domain/FileScorer';
import type { PackMode } from '../domain/PackMode';
import type { DiscoveredContextItem } from './TaskContextExplorer';
import type { CandidateReason } from '../domain/CandidateFile';
import type { RecommendationReason } from '../domain/Recommendation';

type MutableItem = {
  candidateReasons: Set<CandidateReason>;
  recommendationReasons: Set<RecommendationReason>;
};

export const assembleContextEntries = (
  projectId: ProjectId,
  items: readonly DiscoveredContextItem[],
  entryPoints: readonly string[]
): readonly ContextEntry[] => {
  const mergedMap = mergeDiscoveredItems(items);
  const entries: ContextEntry[] = [];

  for (const [relPath, data] of mergedMap.entries()) {
    const candReasons = Array.from(data.candidateReasons);
    const recReasons = Array.from(data.recommendationReasons);
    const isTarget = entryPoints.some(ep => ep.toLowerCase() === relPath.toLowerCase());
    const score = isTarget ? 100 : scoreCandidate({ reasons: candReasons, manualPin: false }).score;
    const role = classifyContextRole({ relativePath: relPath, entryPoints, candidateReasons: candReasons });
    const packMode = determinePackMode(role, score);
    entries.push(createContextEntry(projectId, relPath, role, candReasons, recReasons, score, packMode));
  }
  return sortEntriesDeterministically(entries);
};

const mergeDiscoveredItems = (items: readonly DiscoveredContextItem[]): Map<string, MutableItem> => {
  const map = new Map<string, MutableItem>();
  for (const item of items) {
    const key = item.candidate.relativePath;
    let entry = map.get(key);
    if (!entry) {
      entry = { candidateReasons: new Set(), recommendationReasons: new Set() };
      map.set(key, entry);
    }
    for (const r of item.candidate.reasons) entry.candidateReasons.add(r);
    for (const r of item.recommendationReasons) entry.recommendationReasons.add(r);
  }
  return map;
};

const determinePackMode = (role: string, score: number): PackMode => {
  if (role === 'target' || role === 'repositoryRule') return 'full';
  if (role === 'supporting' && score < 35) return 'skeleton';
  return 'full';
};

const sortEntriesDeterministically = (entries: readonly ContextEntry[]): readonly ContextEntry[] =>
  [...entries].sort((a, b) => {
    const roleDiff = rolePriority[a.role] - rolePriority[b.role];
    if (roleDiff !== 0) return roleDiff;
    const scoreDiff = b.score - a.score;
    if (scoreDiff !== 0) return scoreDiff;
    return a.relativePath.localeCompare(b.relativePath);
  });
