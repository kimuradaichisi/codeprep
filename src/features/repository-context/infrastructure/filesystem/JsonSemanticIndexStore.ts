import { mkdir, readFile, rename, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import type { SemanticIndexStore } from '../../application/semanticIndexPorts';
import type { SemanticIndex } from '../../domain/SemanticIndex';
import {
  deserializeSemanticIndex,
  serializeSemanticIndex,
} from './semanticIndexSerialization';

export class JsonSemanticIndexStore implements SemanticIndexStore {
  public constructor(private readonly baseDirectory: string) {}

  public async load(workspaceId: string): Promise<SemanticIndex | null> {
    const filePath = this.resolvePath(workspaceId);
    try {
      const text = await readFile(filePath, 'utf8');
      return deserializeSemanticIndex(text);
    } catch {
      return null;
    }
  }

  public async save(index: SemanticIndex): Promise<void> {
    const filePath = this.resolvePath(index.metadata.workspaceId);
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(tempPath, serializeSemanticIndex(index), 'utf8');
    await rename(tempPath, filePath);
  }

  public async remove(workspaceId: string): Promise<void> {
    try {
      await rm(this.resolvePath(workspaceId), { force: true });
    } catch {
      // 存在しない場合は安全に無視
    }
  }

  private resolvePath(workspaceId: string): string {
    const safeId = workspaceId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return join(this.baseDirectory, `${safeId}.semantic.json`);
  }
}
