export type RelationPriority = 'high' | 'medium-high' | 'medium' | 'structural' | 'low';

export interface RelationPolicyConfig {
  readonly priority: RelationPriority;
  readonly fanoutCap: number;
  readonly weight: number;
  readonly penaltyPerHop: number;
}

export const DEFAULT_RELATION_POLICIES: Readonly<Record<string, RelationPolicyConfig>> = Object.freeze({
  implements: { priority: 'high', fanoutCap: 10, weight: 1.0, penaltyPerHop: 0.1 },
  extends: { priority: 'high', fanoutCap: 10, weight: 1.0, penaltyPerHop: 0.1 },
  binds_to: { priority: 'high', fanoutCap: 10, weight: 1.0, penaltyPerHop: 0.1 },
  injects: { priority: 'high', fanoutCap: 10, weight: 0.95, penaltyPerHop: 0.1 },
  'depends-on': { priority: 'high', fanoutCap: 8, weight: 0.85, penaltyPerHop: 0.15 },
  references: { priority: 'medium-high', fanoutCap: 6, weight: 0.8, penaltyPerHop: 0.15 },
  contains: { priority: 'structural', fanoutCap: 8, weight: 0.75, penaltyPerHop: 0.2 },
  'doc-relation': { priority: 'medium', fanoutCap: 5, weight: 0.7, penaltyPerHop: 0.2 },
  'co-changed-with': { priority: 'low', fanoutCap: 3, weight: 0.35, penaltyPerHop: 0.3 },
});

export const FALLBACK_RELATION_POLICY: RelationPolicyConfig = Object.freeze({
  priority: 'low',
  fanoutCap: 3,
  weight: 0.3,
  penaltyPerHop: 0.25,
});

export function getRelationPolicy(relationType: string): RelationPolicyConfig {
  return DEFAULT_RELATION_POLICIES[relationType] ?? FALLBACK_RELATION_POLICY;
}
