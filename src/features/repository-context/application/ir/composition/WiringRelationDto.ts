import type { LanguageSymbolRef } from '../language/LanguageRelationDto';

export type WiringRelationType = 'binds_to' | 'injects';

export interface WiringStructuralRelation {
  readonly relationType: WiringRelationType;
  readonly source: LanguageSymbolRef;
  readonly target: LanguageSymbolRef;
  readonly compositionSite: {
    readonly path: string;
    readonly location?: import('../../../domain/ir').RepositoryLocation;
  };
  readonly parameterName?: string;
  readonly parameterIndex?: number;
  readonly declaredType?: string;
  readonly confidence: number;
  readonly analyzer: string;
}

export interface WiringCapabilities {
  readonly manualComposition: boolean;
  readonly localVariableTracking: boolean;
}

export interface WiringAnalysisInput {
  readonly workspaceRoot: string;
  readonly relativePaths?: readonly string[];
}

export interface WiringAnalysisResult {
  readonly relations: readonly WiringStructuralRelation[];
  readonly unresolvedCount: number;
  readonly analyzerName: string;
}
