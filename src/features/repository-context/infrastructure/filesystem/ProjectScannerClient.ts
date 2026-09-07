// src/features/repository-context/infrastructure/filesystem/ProjectScannerClient.ts
import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { Project } from '../../domain/Project';
import type { RepositoryScannerPort, ScannedProjectFile } from '../../application/repositoryIndexPorts';
import { GitignoreMatcher } from '../../../../shared/filesystem/GitignoreMatcher';
import { DEFAULT_EXCLUDED_PATTERNS } from '../../../../shared/filesystem/defaultExcludes';

export class ProjectScannerClient implements RepositoryScannerPort {
  public async scanProjectFiles(project: Project): Promise<readonly ScannedProjectFile[]> {
    const extraPatterns = [
      ...DEFAULT_EXCLUDED_PATTERNS,
      ...(project.excludePatterns ?? []),
    ];
    const matcher = await GitignoreMatcher.fromDirectory(project.rootPath, extraPatterns);
    return this.walkDir(project.rootPath, project.rootPath, matcher);
  }

  private async walkDir(
    root: string,
    current: string,
    matcher: GitignoreMatcher
  ): Promise<ScannedProjectFile[]> {
    try {
      const entries = await readdir(current, { withFileTypes: true });
      const results: ScannedProjectFile[] = [];
      for (const entry of entries) {
        results.push(...await this.processEntry(root, current, entry, matcher));
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
    matcher: GitignoreMatcher
  ): Promise<ScannedProjectFile[]> {
    const full = join(current, entry.name);
    const rel = relative(root, full).replace(/\\/g, '/');
    if (matcher.isIgnored(rel, entry.isDirectory())) return [];
    if (entry.isDirectory()) return this.walkDir(root, full, matcher);
    return entry.isFile() ? this.collectSingleFile(full, rel) : [];
  }

  private async collectSingleFile(full: string, rel: string): Promise<ScannedProjectFile[]> {
    const item = await this.scanSingleFile(full, rel);
    return item ? [item] : [];
  }

  private async scanSingleFile(
    fullPath: string,
    relativePath: string
  ): Promise<ScannedProjectFile | undefined> {
    try {
      const info = await stat(fullPath);
      return { relativePath, size: info.size, mtimeMs: info.mtimeMs };
    } catch {
      return undefined;
    }
  }
}
