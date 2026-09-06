import { mkdir, readFile, rename, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import {
  CURRENT_INDEX_SCHEMA_VERSION,
  type RepositoryIndex,
} from '../../domain/RepositoryIndex';
import type { RepositoryIndexStore } from '../../application/repositoryIndexPorts';

export class JsonRepositoryIndexStore implements RepositoryIndexStore {
  public constructor(private readonly baseDirectory: string) {}

  public async load(workspaceId: string): Promise<RepositoryIndex | undefined> {
    const filePath = this.resolvePath(workspaceId);
    try {
      const text = await readFile(filePath, 'utf8');
      return this.parseIndex(text);
    } catch {
      return undefined;
    }
  }

  public async save(index: RepositoryIndex): Promise<void> {
    const filePath = this.resolvePath(index.metadata.workspaceId);
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(tempPath, JSON.stringify(index, null, 2), 'utf8');
    await rename(tempPath, filePath);
  }

  public async remove(workspaceId: string): Promise<void> {
    try {
      await rm(this.resolvePath(workspaceId), { force: true });
    } catch {
      // 存在しない場合は無視
    }
  }

  private resolvePath(workspaceId: string): string {
    const safeId = workspaceId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return join(this.baseDirectory, `${safeId}.index.json`);
  }

  private parseIndex(text: string): RepositoryIndex | undefined {
    try {
      const parsed = JSON.parse(text) as RepositoryIndex;
      if (parsed?.metadata?.schemaVersion !== CURRENT_INDEX_SCHEMA_VERSION) return undefined;
      if (!Array.isArray(parsed?.entries)) return undefined;
      return parsed;
    } catch {
      return undefined;
    }
  }
}
