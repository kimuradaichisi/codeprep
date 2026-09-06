import type { ProjectId } from './Project';

export type RecommendationSource =
  | 'docgraph'
  | 'markdownLink'
  | 'nameHeading'
  | 'gitCoChange'
  | 'directoryProximity';

export type RecommendationReason = Readonly<{
  source: RecommendationSource;
  score: number;
  detail: string;
}>;

export type RecommendationSettings = Readonly<{
  markdownLink: boolean;
  nameHeading: boolean;
  gitCoChange: boolean;
  directoryProximity: boolean;
}>;

export type RecommendationRecord = Readonly<{
  projectId: ProjectId;
  relativePath: string;
  reason: RecommendationReason;
}>;

const recommendationSources: readonly RecommendationSource[] = [
  'docgraph',
  'markdownLink',
  'nameHeading',
  'gitCoChange',
  'directoryProximity',
];

export const isRecommendationSource = (value: unknown): value is RecommendationSource =>
  typeof value === 'string' && recommendationSources.includes(value as RecommendationSource);

export const defaultRecommendationSettings = (): RecommendationSettings => ({
  markdownLink: true,
  nameHeading: true,
  gitCoChange: true,
  directoryProximity: true,
});

export const createRecommendation = (input: Readonly<{
  projectId: ProjectId;
  relativePath: string;
  source: RecommendationSource;
  score: number;
  detail: string;
}>): RecommendationRecord | undefined => {
  if (!isRecommendationSource(input.source) || !Number.isFinite(input.score) || input.score < 0) {
    return undefined;
  }
  return {
    projectId: input.projectId,
    relativePath: input.relativePath.replace(/\\/g, '/'),
    reason: { source: input.source, score: input.score, detail: input.detail },
  };
};