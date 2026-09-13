import type {
  RepositoryIndex,
  RepositoryIndexEntry,
} from '../../../domain/RepositoryIndex';
import type {
  RepositoryNode,
  RepositoryNodeKind,
  RepositorySnapshot,
} from '../../../domain/ir';
import {
  buildFileNodeId,
  createRepositoryNode,
} from '../../../domain/ir';

function resolveNodeKind(fileKind: string): RepositoryNodeKind {
  if (fileKind === 'config') return 'config';
  if (fileKind === 'test') return 'test';
  return 'file';
}

function buildEntryMetadata(entry: RepositoryIndexEntry): Record<string, unknown> {
  return {
    fileSize: entry.size,
    contentHash: entry.contentHash,
    fileKind: entry.kind,
    mtimeMs: entry.mtimeMs,
    extension: entry.extension,
  };
}

function mapSingleEntry(
  entry: RepositoryIndexEntry,
  snapshot: RepositorySnapshot
): RepositoryNode {
  const id = buildFileNodeId(snapshot.snapshotId, entry.relativePath);
  const name = entry.relativePath.split(/[\\/]/).pop() ?? entry.relativePath;
  return createRepositoryNode({
    id,
    snapshotId: snapshot.snapshotId,
    kind: resolveNodeKind(entry.kind),
    name,
    path: entry.relativePath.replace(/\\/g, '/'),
    language: entry.extension ? entry.extension.replace(/^\./, '') : undefined,
    metadata: buildEntryMetadata(entry),
  });
}

export function mapRepositoryIndexToFileNodes(
  index: RepositoryIndex,
  snapshot: RepositorySnapshot
): readonly RepositoryNode[] {
  const seenPaths = new Set<string>();
  const nodes: RepositoryNode[] = [];

  for (const entry of index.entries) {
    const normalized = entry.relativePath.replace(/\\/g, '/');
    if (seenPaths.has(normalized)) continue;
    seenPaths.add(normalized);
    nodes.push(mapSingleEntry(entry, snapshot));
  }

  return Object.freeze(nodes);
}
