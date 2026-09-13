import type { RepositoryLocation } from './RepositoryLocation';
import { isValidLocation } from './RepositoryLocation';
import type { RepositoryNodeKind } from './RepositoryNodeKind';
import { isValidNodeKind } from './RepositoryNodeKind';

export interface RepositoryNode {
  readonly id: string;
  readonly snapshotId: string;
  readonly kind: RepositoryNodeKind;
  readonly name: string;
  readonly path: string;
  readonly location?: RepositoryLocation;
  readonly language?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export function isValidNode(node: RepositoryNode): boolean {
  if (!node.id || node.id.trim().length === 0) return false;
  if (!node.snapshotId || node.snapshotId.trim().length === 0) return false;
  if (!isValidNodeKind(node.kind)) return false;
  if (!node.name || node.name.trim().length === 0) return false;
  if (typeof node.path !== 'string') return false;
  if (node.location && !isValidLocation(node.location)) return false;
  return true;
}

export function createRepositoryNode(params: RepositoryNode): RepositoryNode {
  if (!isValidNode(params)) {
    throw new Error(`Invalid RepositoryNode: ${JSON.stringify(params)}`);
  }
  return Object.freeze({
    ...params,
    metadata: params.metadata ? Object.freeze({ ...params.metadata }) : undefined,
  });
}

export function buildFileNodeId(snapshotId: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/');
  return `node:${snapshotId}:file:${normalized}`;
}

export function buildSymbolNodeId(
  snapshotId: string,
  relativePath: string,
  symbolKind: string,
  name: string,
  startLine?: number
): string {
  const normPath = relativePath.replace(/\\/g, '/');
  const lineSuffix = startLine !== undefined ? `:${startLine}` : '';
  return `node:${snapshotId}:sym:${normPath}#${symbolKind}:${name}${lineSuffix}`;
}
