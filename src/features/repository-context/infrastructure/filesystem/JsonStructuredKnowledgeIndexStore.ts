import { mkdir, readFile, rename, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import type { StructuredKnowledgeIndexStore } from '../../application/structuredKnowledgePorts';
import {
  CURRENT_KNOWLEDGE_SCHEMA_VERSION,
  type StructuredKnowledgeIndex,
} from '../../domain/StructuredKnowledgeIndex';

export class JsonStructuredKnowledgeIndexStore implements StructuredKnowledgeIndexStore {
  public constructor(private readonly baseDirectory: string) {}

  public async load(projectId: string): Promise<StructuredKnowledgeIndex | null> {
    const filePath = this.resolvePath(projectId);
    try {
      const text = await readFile(filePath, 'utf8');
      return this.parseIndex(text);
    } catch {
      return null;
    }
  }

  public async save(index: StructuredKnowledgeIndex): Promise<void> {
    const filePath = this.resolvePath(index.metadata.projectId);
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(tempPath, JSON.stringify(index, null, 2), 'utf8');
    await rename(tempPath, filePath);
  }

  public async remove(projectId: string): Promise<void> {
    try {
      await rm(this.resolvePath(projectId), { force: true });
    } catch {
      // 存在しない場合は無視
    }
  }

  private resolvePath(projectId: string): string {
    const safeId = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return join(this.baseDirectory, `${safeId}.knowledge.json`);
  }

  private parseIndex(text: string): StructuredKnowledgeIndex | null {
    try {
      const parsed = JSON.parse(text) as StructuredKnowledgeIndex;
      if (parsed?.metadata?.schemaVersion !== CURRENT_KNOWLEDGE_SCHEMA_VERSION) {
        return null;
      }
      if (!Array.isArray(parsed?.entries)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}
