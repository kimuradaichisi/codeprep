import type { RepositoryEdge, RepositoryNode } from '../../../domain/ir';

export const SCHEMA_VERSION = '1.0.0';
export const ANALYSIS_VERSION = '1.0.0';

export interface KnowledgeStoreMetadata {
  readonly schemaVersion: string;
  readonly analysisVersion: string;
  readonly lastUpdated: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface NeighborQueryFilter {
  readonly snapshotId: string;
  readonly nodeId: string;
  readonly direction?: 'outgoing' | 'incoming' | 'both';
  readonly relationTypes?: readonly string[];
}

export interface NeighborQueryResult {
  readonly edges: readonly RepositoryEdge[];
  readonly targetNodes: readonly RepositoryNode[];
}

export interface StoreStatistics {
  readonly snapshotCount: number;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly evidenceCount: number;
  readonly dbSizeBytes: number;
}
