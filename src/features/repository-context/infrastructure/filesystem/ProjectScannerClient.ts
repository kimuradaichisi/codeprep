import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { Project } from '../../domain/Project';
import type { RepositoryScannerPort, ScannedProjectFile } from '../../application/repositoryIndexPorts';

const DEFAULT_EXCLUDES = new Set(['.git', 'node_modules', 'dist', 'out', '.next', 'coverage', '.venv']);

export class ProjectScannerClient implements RepositoryScannerPort {
  public async scanProjectFiles(project: Project): Promise<readonly ScannedProjectFile[]> {
    const excludes = new Set([...DEFAULT_EXCLUDES, ...(project.excludePatterns ?? [])]);
    return this.walkDir(project.rootPath, project.rootPath, excludes);
  }

  private async walkDir(root: string, current: string, excludes: Set<string>): Promise<ScannedProjectFile[]> {
    try {
      const entries = await readdir(current, { withFileTypes: true });
      const results: ScannedProjectFile[] = [];
      for (const entry of entries) {
        if (!excludes.has(entry.name)) {
          results.push(...await this.processEntry(root, current, entry, excludes));
        }
      }
      return results;
    } catch {
      return [];
    }
  }

  private async processEntry(
    root: string,
    current: string,
    entry: { name: string; isDirectory(): boolean; isFile(): boolean },
    excludes: Set<string>
  ): Promise<ScannedProjectFile[]> {
    const full = join(current, entry.name);
    if (entry.isDirectory()) return this.walkDir(root, full, excludes);
    if (entry.isFile()) {
      const item = await this.scanSingleFile(root, full);
      return item ? [item] : [];
    }
    return [];
  }

  private async scanSingleFile(root: string, fullPath: string): Promise<ScannedProjectFile | undefined> {
    try {
      const info = await stat(fullPath);
      const rel = relative(root, fullPath).replace(/\\/g, '/');
      return { relativePath: rel, size: info.size, mtimeMs: info.mtimeMs };
    } catch {
      return undefined;
    }
  }
}
