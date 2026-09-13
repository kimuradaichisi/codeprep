export interface SqliteStatement {
  run(...params: unknown[]): void;
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

export interface SqliteDriver {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  transaction<T>(action: () => T): T;
  close(): void;
}

interface RawDatabaseSync {
  exec(sql: string): void;
  prepare(sql: string): RawStatementSync;
  close(): void;
}

interface RawStatementSync {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

export class NodeSqliteDriver implements SqliteDriver {
  private readonly db: RawDatabaseSync;

  constructor(dbPath: string) {
    // node:sqlite is built-in in Node 22+
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseSync } = require('node:sqlite');
    this.db = new DatabaseSync(dbPath) as RawDatabaseSync;
  }

  public exec(sql: string): void {
    this.db.exec(sql);
  }

  private sanitize(params: unknown[]): unknown[] {
    return params.map(p => (p === undefined ? null : p));
  }

  public prepare(sql: string): SqliteStatement {
    const stmt = this.db.prepare(sql);
    return {
      run: (...params: unknown[]) => { stmt.run(...this.sanitize(params)); },
      get: (...params: unknown[]) => stmt.get(...this.sanitize(params)),
      all: (...params: unknown[]) => stmt.all(...this.sanitize(params)),
    };
  }

  public transaction<T>(action: () => T): T {
    this.exec('BEGIN TRANSACTION;');
    try {
      const result = action();
      this.exec('COMMIT;');
      return result;
    } catch (err) {
      this.exec('ROLLBACK;');
      throw err;
    }
  }

  public close(): void {
    this.db.close();
  }
}
