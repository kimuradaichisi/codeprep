// src/features/repository-context/domain/request/ContextScope.ts

export type ContextScope =
  | Readonly<{ kind: 'auto' }>
  | Readonly<{ kind: 'file'; path: string }>
  | Readonly<{ kind: 'directory'; path: string }>
  | Readonly<{ kind: 'feature'; name: string }>
  | Readonly<{ kind: 'repository' }>;

export function formatScopeDescription(scope: ContextScope): string {
  switch (scope.kind) {
    case 'auto':
      return 'auto';
    case 'file':
      return `file:${scope.path}`;
    case 'directory':
      return `dir:${scope.path}`;
    case 'feature':
      return `feature:${scope.name}`;
    case 'repository':
      return 'repository';
  }
}
