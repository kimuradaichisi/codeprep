// apps/mcp/types.ts
import type { CandidateEvidenceKind } from '../../src/features/repository-context/domain/CandidateEvidence';
import type { EntryPointCandidateReason } from '../../src/features/repository-context/domain/EntryPointCandidate';
import type { ContextManifest } from '../../src/features/repository-context/domain/ContextManifest';

export type McpIndexState = 'ready' | 'missing' | 'error' | 'degraded';

export type McpWorkspaceStatusResult = Readonly<{
  workspaceRoot: string;
  workspaceBound: boolean;
  repositoryIndex: McpIndexState;
  knowledgeIndex: McpIndexState;
  semanticIndex: McpIndexState;
  diagnostics: readonly string[];
}>;

export type McpCandidateEvidenceDto = Readonly<{
  kind: CandidateEvidenceKind;
  relatedPath?: string;
  relatedSymbol?: string;
  score?: number;
  detail: string;
}>;

export type McpDiscoveredCandidateDto = Readonly<{
  relativePath: string;
  discoveryScore: number;
  supportScore: number;
  reasons: readonly EntryPointCandidateReason[];
  matchedTerms: readonly string[];
  evidence: readonly McpCandidateEvidenceDto[];
}>;

export type McpDiscoverEntryPointsResult = Readonly<{
  task: string;
  candidates: readonly McpDiscoveredCandidateDto[];
  warnings: readonly string[];
}>;

export type McpBuildContextPackResult = Readonly<{
  manifest: ContextManifest;
  content: string;
  warnings: readonly string[];
}>;
