/*
 * Copyright 2026 CodePrep Contributors
 */
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { DocGraphPort, DocGraphRelation } from '../desktop-core/application/ports';
import type { Project } from '../desktop-core/domain/Project';
import { nodeProcessRunner, type ProcessRunner } from './RipgrepClient';

export class DocGraphClient implements DocGraphPort {
  public constructor(private readonly runner: ProcessRunner = nodeProcessRunner) {}

  public async findRelated(project: Project, relativePath: string): Promise<readonly DocGraphRelation[]> {
    const dbPath = join(project.rootPath, '.docgraph', 'graph.db');
    if (!existsSync(dbPath)) return [];

    try {
      const command = this.resolveCommandPath();
      const output = await this.runner.run(command, ['related', relativePath, '--format', 'json'], project.rootPath);
      if (output.exitCode !== 0) return [];
      return this.parseResult(output.stdout);
    } catch {
      return [];
    }
  }

  private resolveCommandPath(): string {
    const customPath = process.env.CODEPREP_DOCGRAPH_PATH;
    if (customPath) return customPath;

    const isWin = process.platform === 'win32';
    const exeName = isWin ? 'docgraph.exe' : 'docgraph';
    const localExe = join(dirname(process.execPath), exeName);
    return existsSync(localExe) ? localExe : 'docgraph';
  }

  private parseResult(stdout: string): readonly DocGraphRelation[] {
    try {
      const parsed = JSON.parse(stdout) as unknown;
      if (this.isValidPayload(parsed)) {
        return parsed.related.map(item => ({
          path: String(item.path ?? ''),
          reason: String(item.reason ?? ''),
          confidence: Number(item.confidence ?? 0)
        }));
      }
    } catch {
      // Ignored
    }
    return [];
  }

  private isValidPayload(value: unknown): value is { related: readonly Record<string, unknown>[] } {
    return typeof value === 'object' && value !== null && 'related' in value && Array.isArray((value as any).related);
  }
}
