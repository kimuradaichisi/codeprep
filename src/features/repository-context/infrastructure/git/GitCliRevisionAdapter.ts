import type { RepositoryChangeSet, RepositoryFileRename, RepositoryRevisionPort } from '../../application/ir/ports/RepositoryRevisionPort';
import { nodeProcessRunner, type ProcessRunner } from '../search/RipgrepClient';

export interface ParsedDiffLine {
  readonly status: string;
  readonly path1: string;
  readonly path2?: string;
}

export function parseNameStatusLine(line: string): ParsedDiffLine | undefined {
  const trimmed = line.trim();
  if (!trimmed) return undefined;
  const parts = trimmed.split('\t');
  if (parts.length < 2) return undefined;
  return { status: parts[0], path1: parts[1].replace(/\\/g, '/'), path2: parts[2]?.replace(/\\/g, '/') };
}

export function parseGitDiffNameStatus(output: string, fromRevision: string, toRevision: string): RepositoryChangeSet {
  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];
  const renamed: RepositoryFileRename[] = [];
  const allChanged = new Set<string>();

  for (const rawLine of output.split(/\r?\n/)) {
    const parsed = parseNameStatusLine(rawLine);
    if (!parsed) continue;
    classifyDiffItem(parsed, { added, modified, deleted, renamed, allChanged });
  }

  return Object.freeze({
    fromRevision, toRevision,
    added: Object.freeze(added),
    modified: Object.freeze(modified),
    deleted: Object.freeze(deleted),
    renamed: Object.freeze(renamed),
    allChangedPaths: Object.freeze(Array.from(allChanged)),
  });
}

function classifyDiffItem(
  parsed: ParsedDiffLine,
  accum: { added: string[]; modified: string[]; deleted: string[]; renamed: RepositoryFileRename[]; allChanged: Set<string> },
): void {
  const code = parsed.status[0];
  if (code === 'A') {
    accum.added.push(parsed.path1);
    accum.allChanged.add(parsed.path1);
  } else if (code === 'M') {
    accum.modified.push(parsed.path1);
    accum.allChanged.add(parsed.path1);
  } else if (code === 'D') {
    accum.deleted.push(parsed.path1);
    accum.allChanged.add(parsed.path1);
  } else if (code === 'R' && parsed.path2) {
    accum.renamed.push({ oldPath: parsed.path1, newPath: parsed.path2 });
    accum.allChanged.add(parsed.path1);
    accum.allChanged.add(parsed.path2);
  }
}

export class GitCliRevisionAdapter implements RepositoryRevisionPort {
  constructor(private readonly runner: ProcessRunner = nodeProcessRunner) {}

  public async currentRevision(workspaceRoot: string): Promise<string | null> {
    const res = await this.runner.run('git', ['rev-parse', 'HEAD'], workspaceRoot);
    if (res.exitCode !== 0) return null;
    return res.stdout.trim() || null;
  }

  public async diff(workspaceRoot: string, fromRevision: string, toRevision: string): Promise<RepositoryChangeSet> {
    const res = await this.runner.run('git', ['diff', '--name-status', '-M', fromRevision, toRevision], workspaceRoot);
    if (res.exitCode !== 0) {
      throw new Error(`Git diff failed between ${fromRevision} and ${toRevision}: ${res.stderr}`);
    }
    return parseGitDiffNameStatus(res.stdout, fromRevision, toRevision);
  }

  public async isWorkingTreeClean(workspaceRoot: string): Promise<boolean> {
    const res = await this.runner.run('git', ['status', '--porcelain'], workspaceRoot);
    if (res.exitCode !== 0) return false;
    return res.stdout.trim().length === 0;
  }
}
