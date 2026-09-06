// apps/mcp/tools/candidateTransformer.ts
import type { EnrichedEntryPointCandidate } from '../../../src/features/repository-context/domain/CandidateEvidence';
import type { McpDiscoveredCandidateDto } from '../types';

export function transformCandidates(enriched: readonly EnrichedEntryPointCandidate[]): readonly McpDiscoveredCandidateDto[] {
  return enriched.map((item) => ({
    relativePath: item.candidate.relativePath,
    discoveryScore: item.candidate.score,
    supportScore: item.supportScore,
    reasons: item.candidate.reasons,
    matchedTerms: item.candidate.matchedTerms,
    evidence: item.evidence.map((ev) => ({
      kind: ev.kind,
      relatedPath: ev.relatedPath,
      relatedSymbol: ev.relatedSymbol,
      score: ev.score,
      detail: ev.detail,
    })),
  }));
}
