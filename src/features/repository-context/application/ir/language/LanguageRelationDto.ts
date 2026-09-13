import type { RepositoryLocation } from '../../../domain/ir';

export type LanguageStructuralRelationType =
  | 'references'
  | 'implements'
  | 'extends'
  | 'calls';

export interface LanguageSymbolRef {
  readonly path: string;
  readonly symbolName: string;
  readonly symbolKind: string;
  readonly location?: RepositoryLocation;
}

export interface LanguageStructuralRelation {
  readonly source: LanguageSymbolRef;
  readonly target: LanguageSymbolRef;
  readonly relationType: LanguageStructuralRelationType;
  readonly confidence: number;
  readonly analyzer: string;
}
