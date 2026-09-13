/**
 * Standard relation types representing facts and derived links in Repository IR.
 */
export const STANDARD_RELATION_TYPES = [
  'contains',
  'depends-on',
  'references',
  'calls',
  'implements',
  'extends',
  'tests',
  'binds-to',
  'injects',
  'uses-config',
  'reads',
  'writes',
  'co-changed-with',
  'doc-relation',
  'may-dispatch-to',
] as const;

export type StandardRelationType = typeof STANDARD_RELATION_TYPES[number];

/**
 * Relation type can be standard or extended custom relation type.
 */
export type RepositoryRelationType = StandardRelationType | (string & {});

/**
 * Relations that strictly prohibit self-loops (sourceNodeId === targetNodeId).
 */
export const ASYMMETRIC_NON_REFLEXIVE_RELATIONS = new Set<string>([
  'contains',
  'implements',
  'extends',
  'may-dispatch-to',
]);

/**
 * Validates whether the given relation type is non-empty.
 */
export function isValidRelationType(relationType: string): boolean {
  return typeof relationType === 'string' && relationType.trim().length > 0;
}
