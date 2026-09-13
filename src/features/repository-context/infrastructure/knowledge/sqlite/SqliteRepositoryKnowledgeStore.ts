import * as fs from 'node:fs';
import type {
  RepositoryIR,
  RepositoryNode,
  RepositorySnapshot,
} from '../../../domain/ir';
import type {
  KnowledgeStoreMetadata,
  NeighborQueryFilter,
  NeighborQueryResult,
  NodeSearchFilter,
  RepositoryKnowledgeStore,
  StoreStatistics,
} from '../../../application/ir/persistence';
import type { SqliteDriver } from './SqliteDriver';
import { createSqliteConnection, resolveDatabasePath } from './SqliteConnectionFactory';
import { SqliteRepositoryIRWriter } from './SqliteRepositoryIRWriter';
import { SqliteRepositoryIRReader } from './SqliteRepositoryIRReader';
import { SqliteNeighborQuery } from './SqliteNeighborQuery';
import { mapNodeRow, type NodeRow } from './RepositoryIRRowMapper';

export interface SqliteStoreOptions {
  readonly workspaceRoot: string;
  readonly dbPath?: string;
  readonly driver?: SqliteDriver;
}

export class SqliteRepositoryKnowledgeStore implements RepositoryKnowledgeStore {
  private readonly driver: SqliteDriver;
  private readonly writer: SqliteRepositoryIRWriter;
  private readonly reader: SqliteRepositoryIRReader;
  private readonly neighborQuery: SqliteNeighborQuery;
  private readonly resolvedDbPath: string;

  constructor(options: SqliteStoreOptions) {
    this.resolvedDbPath = resolveDatabasePath(options.workspaceRoot, options.dbPath);
    this.driver = options.driver ?? createSqliteConnection(this.resolvedDbPath);
    this.writer = new SqliteRepositoryIRWriter(this.driver);
    this.reader = new SqliteRepositoryIRReader(this.driver);
    this.neighborQuery = new SqliteNeighborQuery(this.driver);
  }

  public async save(ir: RepositoryIR): Promise<void> {
    this.writer.save(ir);
  }

  public async load(snapshotId: string): Promise<RepositoryIR | null> {
    return this.reader.load(snapshotId);
  }

  public async findLatest(repositoryId: string): Promise<RepositorySnapshot | null> {
    return this.reader.findLatest(repositoryId);
  }

  public async findByRevision(repositoryId: string, revision: string): Promise<RepositorySnapshot | null> {
    return this.reader.findByRevision(repositoryId, revision);
  }

  public async deleteSnapshot(snapshotId: string): Promise<void> {
    this.writer.deleteSnapshot(snapshotId);
  }

  public async queryNeighbors(filter: NeighborQueryFilter): Promise<NeighborQueryResult> {
    return this.neighborQuery.execute(filter);
  }

  public async findNodes(filter: NodeSearchFilter): Promise<readonly RepositoryNode[]> {
    const conditions: string[] = ['snapshot_id = ?'];
    const params: unknown[] = [filter.snapshotId];

    if (filter.path) {
      conditions.push('relative_path = ?');
      params.push(filter.path.replace(/\\/g, '/'));
    }
    if (filter.kinds && filter.kinds.length > 0) {
      const placeholders = filter.kinds.map(() => '?').join(', ');
      conditions.push(`kind IN (${placeholders})`);
      params.push(...filter.kinds);
    }
    if (filter.query) {
      conditions.push('(name LIKE ? OR relative_path LIKE ?)');
      const term = `%${filter.query}%`;
      params.push(term, term);
    }

    const limit = Math.min(filter.limit ?? 50, 200);
    const sql = `SELECT * FROM repository_nodes WHERE ${conditions.join(' AND ')} ORDER BY CASE WHEN kind = 'symbol' THEN 1 WHEN kind = 'file' THEN 2 ELSE 3 END, length(name) ASC LIMIT ${limit};`;
    const rows = this.driver.prepare(sql).all(...params) as NodeRow[];
    return Object.freeze(rows.map(mapNodeRow));
  }

  public async getMetadata(): Promise<KnowledgeStoreMetadata | null> {
    const rows = this.driver.prepare('SELECT key, value FROM store_metadata;').all() as Array<{ key: string; value: string }>;
    if (rows.length === 0) return null;
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.key, r.value);
    return {
      schemaVersion: map.get('schema_version') ?? 'unknown',
      analysisVersion: map.get('analysis_version') ?? 'unknown',
      lastUpdated: map.get('last_migrated') ?? new Date().toISOString(),
    };
  }

  public async getStatistics(snapshotId?: string): Promise<StoreStatistics> {
    const base = this.reader.getStatistics(snapshotId);
    const size = this.resolvedDbPath !== ':memory:' && fs.existsSync(this.resolvedDbPath)
      ? fs.statSync(this.resolvedDbPath).size
      : 0;
    return { ...base, dbSizeBytes: size };
  }

  public async close(): Promise<void> {
    this.driver.close();
  }
}
