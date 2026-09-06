import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import type { RepositoryFingerprintPort } from '../../application/repositoryIndexPorts';

export type ProjectRootResolver = (projectId: string) => Promise<string | undefined> | string | undefined;

export class NodeCryptoFingerprintClient implements RepositoryFingerprintPort {
  public constructor(private readonly resolveProjectRoot: ProjectRootResolver) {}

  public async computeHash(projectId: string, relativePath: string): Promise<string> {
    const root = await this.resolveProjectRoot(projectId);
    if (!root) throw new Error(`Project root not found for projectId: ${projectId}`);
    return this.streamHash(join(root, relativePath));
  }

  private streamHash(fullPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(fullPath);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
}
