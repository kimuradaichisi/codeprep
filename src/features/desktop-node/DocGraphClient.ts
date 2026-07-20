import * as fs from 'fs';
import * as path from 'path';
import { nodeProcessRunner, type ProcessRunner } from './RipgrepClient';
import type { DocGraphPort, DocGraphRelation } from '../desktop-core/application/ports';
import type { Project } from '../desktop-core/domain/Project';

export class DocGraphClient implements DocGraphPort {
  public constructor(
    private readonly runner: ProcessRunner = nodeProcessRunner,
  ) {}

  public async findRelated(project: Project, relativePath: string): Promise<readonly DocGraphRelation[]> {
    const dbPath = path.join(project.rootPath, '.docgraph', 'graph.db');
    if (!fs.existsSync(dbPath)) {
      return [];
    }

    try {
      const command = this.resolveCommand(project.rootPath);
      const output = await this.runner.run(
        command,
        ['related', relativePath, '--format', 'json'],
        project.rootPath
      );

      if (output.exitCode !== 0) {
        return [];
      }

      const data: unknown = JSON.parse(output.stdout);
      return relatedEntries(data).flatMap(toRelation);
    } catch {
      return [];
    }
  }

  private resolveCommand(rootPath: string): string {
    const envPath = process.env.CODEPREP_DOCGRAPH_PATH;
    if (envPath) {
      return envPath;
    }

    // ローカルのバイナリチェック（例: .docgraph/bin/docgraph または .docgraph/bin/docgraph.exe）
    const localDir = path.join(rootPath, '.docgraph', 'bin');
    const exe = path.join(localDir, 'docgraph.exe');
    const bin = path.join(localDir, 'docgraph');

    if (fs.existsSync(exe)) {
      return exe;
    }
    if (fs.existsSync(bin)) {
      return bin;
    }

    return 'docgraph';
  }
}

type RelatedEntry = Readonly<{ path: string; reason: string; confidence: number }>;

const relatedEntries = (value: unknown): readonly unknown[] => {
  if (!isRecord(value) || !Array.isArray(value.related)) return [];
  return value.related;
};

const toRelation = (value: unknown): readonly [DocGraphRelation] | readonly [] => {
  if (!isRecord(value) || !isRelatedEntry(value)) return [];
  return [{ path: value.path, reason: value.reason, confidence: value.confidence }];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isRelatedEntry = (value: Record<string, unknown>): value is RelatedEntry =>
  typeof value.path === 'string' && isRelativePath(value.path) &&
  typeof value.reason === 'string' && value.reason.trim().length > 0 &&
  typeof value.confidence === 'number' && Number.isFinite(value.confidence) &&
  value.confidence >= 0 && value.confidence <= 1;

const isRelativePath = (value: string): boolean =>
  value.length > 0 && !value.startsWith('/') && !/^[a-zA-Z]:[\\/]/.test(value) &&
  !value.split(/[\\/]/).includes('..');
