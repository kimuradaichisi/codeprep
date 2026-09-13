import type {
  RepositoryIR,
  RepositorySnapshot,
} from '../../../domain/ir';
import type {
  KnowledgeStoreMetadata,
  NeighborQueryFilter,
  NeighborQueryResult,
  StoreStatistics,
} from './PersistenceDto';

export interface RepositoryKnowledgeStore {
  save(ir: RepositoryIR): Promise<void>;
  load(snapshotId: string): Promise<RepositoryIR | null>;
  findLatest(repositoryId: string): Promise<RepositorySnapshot | null>;
  findByRevision(repositoryId: string, revision: string): Promise<RepositorySnapshot | null>;
  deleteSnapshot(snapshotId: string): Promise<void>;
  queryNeighbors(filter: NeighborQueryFilter): Promise<NeighborQueryResult>;
  findNodes(filter: import('./PersistenceDto').NodeSearchFilter): Promise<readonly import('../../../domain/ir').RepositoryNode[]>;
  getMetadata(): Promise<KnowledgeStoreMetadata | null>;
  getStatistics(snapshotId?: string): Promise<StoreStatistics>;
  close(): Promise<void>;
}
