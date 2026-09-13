/**
 * Standard repository node kinds in CodePrep Repository IR.
 */
export const STANDARD_NODE_KINDS = [
  'file',
  'symbol',
  'doc-section',
  'config',
  'test',
  'entry-point',
  'persistence',
] as const;

export type StandardNodeKind = typeof STANDARD_NODE_KINDS[number];

/**
 * Node kind can be standard or extended custom domain kind.
 */
export type RepositoryNodeKind = StandardNodeKind | (string & {});

/**
 * Validates whether the given string is a non-empty node kind.
 */
export function isValidNodeKind(kind: string): boolean {
  return typeof kind === 'string' && kind.trim().length > 0;
}
