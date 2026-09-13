import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SqliteDriver } from './SqliteDriver';
import { NodeSqliteDriver } from './SqliteDriver';
import { migrateSchema } from './SqliteSchemaMigrator';

export const DEFAULT_DB_FILENAME = 'repository-knowledge.db';

export function resolveDatabasePath(workspaceRoot: string, customPath?: string): string {
  if (customPath) {
    if (customPath === ':memory:') return customPath;
    return path.isAbsolute(customPath) ? customPath : path.join(workspaceRoot, customPath);
  }
  return path.join(workspaceRoot, '.codeprep', DEFAULT_DB_FILENAME);
}

export function createSqliteConnection(dbPath: string): SqliteDriver {
  if (dbPath !== ':memory:') {
    const parentDir = path.dirname(dbPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
  }
  const driver = new NodeSqliteDriver(dbPath);
  migrateSchema(driver);
  return driver;
}
