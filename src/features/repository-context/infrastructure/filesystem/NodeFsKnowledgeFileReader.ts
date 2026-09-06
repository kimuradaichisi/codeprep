import { readFile } from 'fs/promises';
import { isAbsolute, resolve } from 'path';
import type { KnowledgeFileReaderPort } from '../../application/structuredKnowledgePorts';

export class NodeFsKnowledgeFileReader implements KnowledgeFileReaderPort {
  public constructor(
    private readonly resolveRootPath: (projectId: string) => string
  ) {}

  public async readFileContent(projectId: string, relativePath: string): Promise<string> {
    const rootPath = this.resolveRootPath(projectId);
    const fullPath = isAbsolute(relativePath) ? relativePath : resolve(rootPath, relativePath);
    return readFile(fullPath, 'utf8');
  }
}
