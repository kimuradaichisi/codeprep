import type { RepositoryEvidence } from '../../../domain/ir';

const EVIDENCE_CATEGORY_WEIGHTS: Readonly<Record<string, number>> = Object.freeze({
  'deterministic-ast': 1.0,
  'framework/composition': 0.95,
  'dependency-scanner': 0.85,
  'rule-derived': 0.75,
  'git-history': 0.45,
});

const ANALYZER_SPECIFIC_WEIGHTS: Readonly<Record<string, number>> = Object.freeze({
  'typescript-compiler': 1.0,
  'typescript-symbol-extractor': 1.0,
  'markdown-section-extractor': 0.95,
  'typescript-manual-composition': 0.95,
  'dependency-scanner': 0.85,
  docgraph: 0.75,
  'git-cochange': 0.45,
});

export function scoreEvidence(evidence: RepositoryEvidence): number {
  const analyzerWeight = ANALYZER_SPECIFIC_WEIGHTS[evidence.analyzer];
  if (analyzerWeight !== undefined) {
    return analyzerWeight * evidence.confidence;
  }
  const categoryWeight = EVIDENCE_CATEGORY_WEIGHTS[evidence.category] ?? 0.5;
  return categoryWeight * evidence.confidence;
}

export function scoreEvidenceList(evidences: readonly RepositoryEvidence[]): number {
  if (!evidences || evidences.length === 0) return 0.5;
  let maxScore = 0;
  for (const ev of evidences) {
    const s = scoreEvidence(ev);
    if (s > maxScore) maxScore = s;
  }
  return maxScore;
}
