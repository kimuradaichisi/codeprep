// apps/mcp/types.ts
import type { CandidateEvidenceKind } from '../../src/features/repository-context/domain/CandidateEvidence';
import type { EntryPointCandidateReason } from '../../src/features/repository-context/domain/EntryPointCandidate';
import type { ContextManifest } from '../../src/features/repository-context/domain/ContextManifest';
import type { ContextConfidence, AdaptivePackMode } from '../../src/features/repository-context/domain/ContextConfidence';

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
  confidence: ContextConfidence;
  suggestedPackStrategy: AdaptivePackMode;
  warnings: readonly string[];
}>;

export type McpBuildContextPackResult = Readonly<{
  manifest: ContextManifest;
  content: string;
  warnings: readonly string[];
}>;

export type McpPrepareContextResult = Readonly<{
  task: string;
  candidates: readonly McpDiscoveredCandidateDto[];
  confidence: ContextConfidence;
  decision: 'AUTO_FAST_PACK' | 'MANUAL_SELECTION_REQUIRED';
  requiresSelection: boolean;
  strategy: AdaptivePackMode;
  autoSelectedEntryPoints: readonly string[];
  contextPack?: McpBuildContextPackResult;
  warnings: readonly string[];
}>;

