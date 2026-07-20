import type { AnalyzedCandidate } from './ports';
import type { RecommendationReason, RecommendationRecord } from '../domain/Recommendation';

export type RecommendationCandidate = AnalyzedCandidate & Readonly<{
  recommendationReasons?: readonly RecommendationReason[];
}>;

export type MergeRecommendationsResult = Readonly<{
  candidates: readonly RecommendationCandidate[];
  recommendationReasonsByKey: ReadonlyMap<string, readonly RecommendationReason[]>;
  selectedKeys: readonly string[];
}>;

export const mergeRecommendations = (
  baseCandidates: readonly AnalyzedCandidate[],
  recommendations: readonly RecommendationRecord[],
  selectedKeys: readonly string[] = [],
): MergeRecommendationsResult => {
  const recommendationGroups = groupRecommendations(recommendations);
  const baseKeys = new Set(baseCandidates.map(candidateKey));

  return {
    candidates: mergeCandidates(baseCandidates, recommendationGroups, baseKeys, recommendations.length > 0),
    recommendationReasonsByKey: recommendationReasons(baseCandidates, recommendationGroups),
    selectedKeys: filterSelectedKeys(selectedKeys, baseKeys),
  };
};

const mergeCandidates = (
  baseCandidates: readonly AnalyzedCandidate[],
  groups: ReadonlyMap<string, RecommendationGroup>,
  baseKeys: ReadonlySet<string>,
  shouldSort: boolean,
): readonly RecommendationCandidate[] => {
  const additions = [...groups.entries()]
    .filter(([key]) => !baseKeys.has(key))
    .map(([, group]) => recommendationCandidate(group));
  const candidates = [...baseCandidates, ...additions];
  return shouldSort ? sortCandidates(candidates) : candidates;
};

const filterSelectedKeys = (
  selectedKeys: readonly string[],
  baseKeys: ReadonlySet<string>,
): readonly string[] => selectedKeys
  .filter(key => baseKeys.has(normalizeSelectionKey(key)))
  .map(normalizeSelectionKey);

const recommendationReasons = (
  baseCandidates: readonly AnalyzedCandidate[],
  groups: ReadonlyMap<string, RecommendationGroup>,
): ReadonlyMap<string, readonly RecommendationReason[]> => new Map(
  [
    ...baseCandidates.map(candidate => [
      candidateKey(candidate), groups.get(candidateKey(candidate))?.reasons ?? [],
    ] as const),
    ...[...groups.entries()]
      .filter(([key]) => !baseCandidates.some(candidate => candidateKey(candidate) === key))
      .map(([key, group]) => [key, group.reasons] as const),
  ],
);

const groupRecommendations = (
  recommendations: readonly RecommendationRecord[],
): ReadonlyMap<string, RecommendationGroup> => {
  const groups = new Map<string, RecommendationGroup>();
  for (const recommendation of recommendations) {
    const key = recommendationKey(recommendation);
    groups.set(key, mergeRecommendationGroup(groups.get(key), recommendation));
  }
  return groups;
};

type RecommendationGroup = Readonly<{
  projectId: string;
  relativePath: string;
  reasons: readonly RecommendationReason[];
}>;

const mergeRecommendationGroup = (
  group: RecommendationGroup | undefined,
  recommendation: RecommendationRecord,
): RecommendationGroup => group
  ? { ...group, reasons: mergeReason(group.reasons, recommendation.reason) }
  : {
    projectId: recommendation.projectId,
    relativePath: normalizePath(recommendation.relativePath),
    reasons: [recommendation.reason],
  };

const mergeReason = (
  reasons: readonly RecommendationReason[],
  incoming: RecommendationReason,
): readonly RecommendationReason[] => {
  const index = reasons.findIndex(reason => reason.source === incoming.source);
  if (index < 0) return [...reasons, incoming];
  const current = reasons[index];
  if (!current || isPreferred(incoming, current)) {
    return reasons.map((reason, reasonIndex) => reasonIndex === index ? incoming : reason);
  }
  return reasons;
};

const isPreferred = (candidate: RecommendationReason, current: RecommendationReason): boolean =>
  candidate.score > current.score ||
  (candidate.score === current.score && compareCodeUnits(candidate.detail, current.detail) < 0);

const compareCodeUnits = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const recommendationCandidate = (
  group: RecommendationGroup,
): RecommendationCandidate => {
  return {
    projectId: group.projectId,
    relativePath: group.relativePath,
    reasons: [],
    excluded: false,
    score: aggregateScore(group.reasons),
    recommendationReasons: group.reasons,
  };
};

const aggregateScore = (reasons: readonly RecommendationReason[]): number => {
  const score = reasons.reduce((total, reason) => total + reason.score, 0);
  return Number.isFinite(score) && score >= 0 ? score : 0;
};

const sortCandidates = (
  candidates: readonly RecommendationCandidate[],
): readonly RecommendationCandidate[] => [...candidates].sort((left, right) =>
  right.score - left.score || compareCodeUnits(candidateKey(left), candidateKey(right)));

const candidateKey = (candidate: Readonly<{ projectId: string; relativePath: string }>): string =>
  `${candidate.projectId}:${normalizePath(candidate.relativePath)}`;

const normalizeSelectionKey = (key: string): string => {
  const separator = key.indexOf(':');
  return separator < 0 ? key : `${key.slice(0, separator + 1)}${normalizePath(key.slice(separator + 1))}`;
};

const recommendationKey = (recommendation: RecommendationRecord): string =>
  `${recommendation.projectId}:${normalizePath(recommendation.relativePath)}`;

const normalizePath = (relativePath: string): string => relativePath.replace(/\\/g, '/');