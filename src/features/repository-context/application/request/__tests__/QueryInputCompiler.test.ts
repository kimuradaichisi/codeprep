// src/features/repository-context/application/request/__tests__/QueryInputCompiler.test.ts
import { describe, it, expect } from 'vitest';
import { QueryInputCompiler } from '../QueryInputCompiler';
import { createContextRequest } from '../../../domain/request/ContextRequest';

describe('QueryInputCompiler', () => {
  it('compiles goal-only request directly to task query without explicit paths', () => {
    const request = createContextRequest({
      goal: 'Implement SQLite repository knowledge store',
    });

    const compiled = QueryInputCompiler.compile(request);
    expect(compiled.taskQueryText).toBe('Implement SQLite repository knowledge store');
    expect(compiled.explicitPaths).toEqual([]);
    expect(compiled.scopeFilter).toBeUndefined();
  });

  it('compiles FileAnchor into explicit paths and query context', () => {
    const request = createContextRequest({
      goal: 'Fix persistence bug',
      anchors: [
        { kind: 'file', path: 'src/store/SqliteStore.ts' },
      ],
    });

    const compiled = QueryInputCompiler.compile(request);
    expect(compiled.explicitPaths).toContain('src/store/SqliteStore.ts');
    expect(compiled.taskQueryText).toContain('SqliteStore.ts');
  });

  it('compiles SymbolAnchor into query search tokens', () => {
    const request = createContextRequest({
      goal: 'Refactor store interface',
      anchors: [
        { kind: 'symbol', name: 'RepositoryKnowledgeStorePort' },
      ],
    });

    const compiled = QueryInputCompiler.compile(request);
    expect(compiled.taskQueryText).toContain('RepositoryKnowledgeStorePort');
  });

  it('creates directory scope filter when directory scope is requested', () => {
    const request = createContextRequest({
      goal: 'Clean up features',
      scope: { kind: 'directory', path: 'src/features/repository-context' },
    });

    const compiled = QueryInputCompiler.compile(request);
    expect(compiled.scopeFilter).toBeDefined();
    expect(compiled.scopeFilter!('src/features/repository-context/domain/Model.ts')).toBe(true);
    expect(compiled.scopeFilter!('src/features/ui/Component.tsx')).toBe(false);
  });
});
