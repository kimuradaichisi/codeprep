import { describe, expect, it } from 'vitest';
import { createTaskContext } from '../TaskContext';

describe('TaskContext', () => {
  it('creates valid TaskContext with single entry point', () => {
    const ctx = createTaskContext('proj-1', 'Add return feature', ['src/order/OrderService.ts']);
    expect(ctx.projectId).toBe('proj-1');
    expect(ctx.task).toBe('Add return feature');
    expect(ctx.entryPoints).toEqual(['src/order/OrderService.ts']);
  });

  it('throws on empty task', () => {
    expect(() => createTaskContext('proj-1', '', ['src/order/OrderService.ts'])).toThrow(
      'Task must not be empty'
    );
    expect(() => createTaskContext('proj-1', '   ', ['src/order/OrderService.ts'])).toThrow(
      'Task must not be empty'
    );
  });

  it('throws on empty entry points', () => {
    expect(() => createTaskContext('proj-1', 'Add return feature', [])).toThrow(
      'At least one entry point is required'
    );
    expect(() => createTaskContext('proj-1', 'Add return feature', ['  '])).toThrow(
      'At least one entry point is required'
    );
  });

  it('supports multiple entry points and trims whitespace', () => {
    const ctx = createTaskContext('proj-1', ' Multi ', [' src/a.ts ', 'src/b.ts']);
    expect(ctx.task).toBe('Multi');
    expect(ctx.entryPoints).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('ensures immutability of returned object and entry points array', () => {
    const ctx = createTaskContext('proj-1', 'Immutable task', ['src/a.ts']);
    expect(Object.isFrozen(ctx)).toBe(true);
    expect(Object.isFrozen(ctx.entryPoints)).toBe(true);
  });
});
