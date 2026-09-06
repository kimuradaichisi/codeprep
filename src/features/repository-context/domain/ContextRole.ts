export const contextRoles = [
  'target',
  'repositoryRule',
  'test',
  'architecture',
  'specification',
  'dependency',
  'supporting',
] as const;

export type ContextRole = (typeof contextRoles)[number];

export const isContextRole = (value: unknown): value is ContextRole =>
  typeof value === 'string' && (contextRoles as readonly string[]).includes(value);

export const rolePriority: Readonly<Record<ContextRole, number>> = Object.freeze({
  target: 1,
  repositoryRule: 2,
  test: 3,
  architecture: 4,
  specification: 5,
  dependency: 6,
  supporting: 7,
});
