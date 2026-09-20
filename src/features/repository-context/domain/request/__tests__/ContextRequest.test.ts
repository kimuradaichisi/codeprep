// src/features/repository-context/domain/request/__tests__/ContextRequest.test.ts
import { describe, it, expect } from 'vitest';
import { createContextRequest, createLegacyTaskRequest } from '../ContextRequest';
import { formatScopeDescription } from '../ContextScope';

describe('ContextRequest', () => {
  it('creates a canonical ContextRequest with default values', () => {
    const request = createContextRequest({
      goal: 'Add SQLite persistence',
    });

    expect(request.intent).toBe('change');
    expect(request.goal).toBe('Add SQLite persistence');
    expect(request.anchors).toEqual([]);
    expect(request.scope).toEqual({ kind: 'auto' });
    expect(request.constraints).toBeUndefined();
    expect(request.budget).toBeUndefined();
  });

  it('rejects empty goal', () => {
    expect(() => createContextRequest({ goal: '' })).toThrow('ContextRequest goal must not be empty.');
    expect(() => createContextRequest({ goal: '   ' })).toThrow('ContextRequest goal must not be empty.');
  });

  it('accepts anchors and custom scope', () => {
    const request = createContextRequest({
      intent: 'change',
      goal: 'Update store implementation',
      anchors: [
        { kind: 'file', path: 'src/store.ts' },
        { kind: 'symbol', name: 'StorePort' },
      ],
      scope: { kind: 'directory', path: 'src/store' },
    });

    expect(request.anchors).toHaveLength(2);
    expect(request.anchors[0].kind).toBe('file');
    expect(request.scope.kind).toBe('directory');
    expect(formatScopeDescription(request.scope)).toBe('dir:src/store');
  });

  it('creates a legacy task request with backward compatibility', () => {
    const request = createLegacyTaskRequest('Fix memory leak in extension');
    expect(request.intent).toBe('change');
    expect(request.goal).toBe('Fix memory leak in extension');
    expect(request.scope).toEqual({ kind: 'auto' });
  });
});
