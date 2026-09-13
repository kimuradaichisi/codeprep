import type { RepositoryLocation } from './RepositoryLocation';
import { isValidLocation } from './RepositoryLocation';

export const EVIDENCE_PROVENANCE_CATEGORIES = [
  'deterministic-ast',
  'language-server',
  'framework-analyzer',
  'regex-pattern',
  'git-history',
  'semantic-vector',
  'heuristic',
  'rule-derived',
] as const;

export type EvidenceProvenanceCategory = typeof EVIDENCE_PROVENANCE_CATEGORIES[number];

export interface EvidenceDerivationInfo {
  readonly derivedFromEdgeIds: readonly string[];
  readonly ruleName?: string;
  readonly description?: string;
}

export interface RepositoryEvidence {
  readonly id: string;
  readonly category: EvidenceProvenanceCategory;
  readonly analyzer: string;
  readonly confidence: number;
  readonly sourcePath?: string;
  readonly sourceLocation?: RepositoryLocation;
  readonly derivation?: EvidenceDerivationInfo;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly createdAt?: string;
}

export function isValidEvidence(evidence: RepositoryEvidence): boolean {
  if (!evidence.id || evidence.id.trim().length === 0) return false;
  if (!evidence.analyzer || evidence.analyzer.trim().length === 0) return false;
  if (!EVIDENCE_PROVENANCE_CATEGORIES.includes(evidence.category)) return false;
  if (typeof evidence.confidence !== 'number' || !Number.isFinite(evidence.confidence)) return false;
  if (evidence.confidence < 0 || evidence.confidence > 1) return false;
  if (evidence.sourceLocation && !isValidLocation(evidence.sourceLocation)) return false;
  return true;
}

export function createEvidence(params: RepositoryEvidence): RepositoryEvidence {
  if (!isValidEvidence(params)) {
    throw new Error(`Invalid RepositoryEvidence: ${JSON.stringify(params)}`);
  }
  return Object.freeze({ ...params });
}
