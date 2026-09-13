import type { LanguageStructuralRelation } from './LanguageRelationDto';

export interface LanguageCapabilities {
  readonly references: boolean;
  readonly implementations: boolean;
  readonly typeHierarchy: boolean;
  readonly callHierarchy: boolean;
}

export interface LanguageAnalysisInput {
  readonly workspaceRoot: string;
  readonly relativePaths?: readonly string[];
}

export interface LanguageAnalysisResult {
  readonly relations: readonly LanguageStructuralRelation[];
  readonly unresolvedCount: number;
  readonly capabilities: LanguageCapabilities;
  readonly analyzerName: string;
}

export interface LanguageIntelligencePort {
  getCapabilities(): LanguageCapabilities;
  analyze(input: LanguageAnalysisInput): Promise<LanguageAnalysisResult>;
}
