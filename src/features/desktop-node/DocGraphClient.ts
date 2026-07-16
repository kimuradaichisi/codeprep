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

      const data = JSON.parse(output.stdout);
      if (data && Array.isArray(data.related)) {
        return data.related.map((item: any) => ({
          path: String(item.path),
          reason: String(item.reason),
          confidence: Number(item.confidence),
        }));
      }
      return [];
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
